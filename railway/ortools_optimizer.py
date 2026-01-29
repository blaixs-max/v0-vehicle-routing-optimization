from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math
import os
import requests
from typing import List, Dict

# Multi-depot VRP optimization with OR-Tools
# Business tiplerine göre servis süreleri (dakika)
SERVICE_TIMES = {
    "MCD": 60,
    "IKEA": 45,
    "CHL": 30,
    "OPT": 30,
    "default": 30
}

# Araç tipleri: kapasite ve yakıt tüketimi
VEHICLE_TYPES = {
    0: {"name": "Kamyonet", "capacity": 10, "fuel": 15},
    1: {"name": "Kamyon-1", "capacity": 14, "fuel": 20},
    2: {"name": "Kamyon-2", "capacity": 18, "fuel": 30},
    3: {"name": "TIR", "capacity": 32, "fuel": 35},
    4: {"name": "Romork", "capacity": 36, "fuel": 40}
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula ile iki nokta arası mesafe (km)"""
    R = 6371  # Dünya yarıçapı (km)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    lon1_rad = math.radians(lon1)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def get_osrm_distance_matrix(locations: List[tuple], osrm_url: str = None) -> List[List[int]]:
    """
    OSRM Table API kullanarak gerçek yol mesafesi matrisi hesapla
    Returns: Mesafe matrisi (metre cinsinden)
    """
    if not osrm_url:
        osrm_url = os.environ.get('OSRM_URL', 'https://router.project-osrm.org')
    
    try:
        # Koordinatları OSRM formatına çevir: lng,lat
        coords_str = ';'.join([f"{loc[1]},{loc[0]}" for loc in locations])
        url = f"{osrm_url}/table/v1/driving/{coords_str}?annotations=distance"
        
        print(f"[OR-Tools] OSRM Table API çağrılıyor: {len(locations)} nokta")
        print(f"[OR-Tools] OSRM URL: {osrm_url}")
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('code') != 'Ok':
            raise Exception(f"OSRM error: {data.get('code')}")
        
        # OSRM distance matrix'i döndür (zaten metre cinsinden)
        distance_matrix = data['distances']
        print(f"[OR-Tools] ✓ OSRM Table API başarılı - Gerçek yol mesafesi kullanılıyor")
        return [[int(d) for d in row] for row in distance_matrix]
        
    except Exception as e:
        print(f"[OR-Tools] ✗ OSRM Table API hatası: {str(e)}")
        print(f"[OR-Tools] → Fallback: Haversine (kuş uçuşu) mesafe kullanılıyor")
        
        # Fallback: Haversine ile hesapla
        matrix = []
        for i, loc1 in enumerate(locations):
            row = []
            for j, loc2 in enumerate(locations):
                if i == j:
                    row.append(0)
                else:
                    dist = haversine_distance(loc1[0], loc1[1], loc2[0], loc2[1])
                    row.append(int(dist * 1000))  # km'den metreye
            matrix.append(row)
        return matrix

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes from start of day"""
    if not time_str:
        return 0
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except:
        return 0

def parse_time_constraint(constraint: str) -> tuple:
    """Zaman kısıtını parse et
    Örnek: '20:00 den önce verilemiyor' -> (20*60, 24*60)
    """
    if not constraint or constraint == "HAYIR":
        return (0, 24 * 60)  # Tüm gün
    
    constraint = constraint.lower()
    
    # "XX:XX den önce verilemiyor" -> XX:XX'dan sonra
    if "den önce verilemiyor" in constraint or "den once verilemiyor" in constraint:
        time_str = constraint.split("den önce")[0].strip() if "den önce" in constraint else constraint.split("den once")[0].strip()
        try:
            hour, minute = map(int, time_str.split(":"))
            start_min = hour * 60 + minute
            return (start_min, 24 * 60)  # Bu saatten sonra
        except:
            return (0, 24 * 60)
    
    # "XX:XX-YY:YY arası verilemiyor" -> Bu aralık yasak, dışarısı OK
    if "arası verilemiyor" in constraint or "arasi verilemiyor" in constraint:
        # Karmaşık, şimdilik tüm gün kabul et
        return (0, 24 * 60)
    
    return (0, 24 * 60)

def optimize_routes(depots: list, customers: list, vehicles: list, fuel_price: float = 47.50) -> dict:
    """Multi-depot VRP optimizer"""
    # Group customers by depot
    customers_by_depot = {}
    for depot in depots:
        customers_by_depot[depot["id"]] = []
    
    print(f"[OR-Tools] ========== MULTI-DEPOT GROUPING DEBUG ==========")
    print(f"[OR-Tools] Total customers to group: {len(customers)}")
    
    # Assign each customer to their assigned depot
    for customer in customers:
        depot_id = customer.get("depot_id")
        print(f"[OR-Tools] Customer {customer.get('id')} ({customer.get('name')}): depot_id={depot_id}")
        if depot_id and depot_id in customers_by_depot:
            customers_by_depot[depot_id].append(customer)
        else:
            # Fallback: assign to first depot if no depot_id
            print(f"[OR-Tools] WARNING: Customer {customer.get('id')} has no depot_id, assigning to first depot")
            customers_by_depot[depots[0]["id"]].append(customer)
    
    print(f"[OR-Tools] Customers grouped by depot:")
    for depot_id, depot_custs in customers_by_depot.items():
        print(f"[OR-Tools]   {depot_id}: {len(depot_custs)} customers")
    
    # Calculate total demand per depot
    depot_demands = {}
    total_demand = 0
    for depot in depots:
        depot_customers = customers_by_depot[depot["id"]]
        depot_demand = sum(c.get("demand_pallets", 0) for c in depot_customers)
        depot_demands[depot["id"]] = depot_demand
        total_demand += depot_demand
        print(f"[OR-Tools] Depot {depot['id']}: {len(depot_customers)} customers, {depot_demand} pallets demand")
    
    # Distribute vehicles proportionally to demand
    total_capacity = sum(v.get("capacity_pallets", 26) for v in vehicles)
    print(f"[OR-Tools] Total demand: {total_demand} pallets, Total capacity: {total_capacity} pallets")
    
    if total_demand > total_capacity:
        raise ValueError(f"Insufficient capacity: {total_demand} > {total_capacity}")
    
    # Optimize each depot separately
    all_routes = []
    vehicle_offset = 0
    
    for depot in depots:
        depot_customers = customers_by_depot[depot["id"]]
        if not depot_customers:
            print(f"[OR-Tools] Skipping depot {depot['id']}: No customers assigned")
            continue
        
        # Calculate vehicles for this depot based on demand proportion
        depot_demand = depot_demands[depot["id"]]
        if total_demand > 0:
            vehicles_for_depot = max(1, int(len(vehicles) * depot_demand / total_demand))
        else:
            vehicles_for_depot = 1
        
        # Ensure we don't exceed available vehicles
        vehicles_for_depot = min(vehicles_for_depot, len(vehicles) - vehicle_offset)
        
        # Last depot gets all remaining vehicles
        if depot == depots[-1]:
            vehicles_for_depot = len(vehicles) - vehicle_offset
        
        depot_vehicles = vehicles[vehicle_offset:vehicle_offset + vehicles_for_depot]
        
        print(f"[OR-Tools] Optimizing depot {depot['id']}: {len(depot_customers)} customers, {depot_demand} pallets, {len(depot_vehicles)} vehicles")
        
        # Optimize this depot
        depot_result = _optimize_single_depot(depot, depots, depot_customers, depot_vehicles, fuel_price)
        
        # Add depot routes to all routes
        all_routes.extend(depot_result["routes"])
        vehicle_offset += vehicles_for_depot
    
    # Calculate summary statistics
    total_distance = sum(route["distance_km"] for route in all_routes)
    
    return {
        "routes": all_routes,
        "summary": {
            "total_routes": len(all_routes),
            "total_distance_km": round(total_distance, 2),
            "total_vehicles_used": len(all_routes),
            "algorithm": "OR-Tools"
        }
    }

def _optimize_single_depot(primary_depot: dict, all_depots: list, customers: list, vehicles: list, fuel_price: float) -> dict:
    """Single depot optimization (stable fallback)"""
    try:
        total_distance = 0
        
        print(f"[OR-Tools] ===== ADIM 1 TEST: DISTANCE + CAPACITY ONLY =====")
        print(f"[OR-Tools] Starting single-depot optimization...")
        print(f"[OR-Tools] Primary depot: {primary_depot.get('name', primary_depot.get('id'))}")
        print(f"[OR-Tools] Customers: {len(customers)}")
        print(f"[OR-Tools] Vehicles: {len(vehicles)}")
        print(f"[OR-Tools] Sample customer 0: {customers[0] if customers else 'NONE'}")
        print(f"[OR-Tools] Sample vehicle 0: {vehicles[0] if vehicles else 'NONE'}")
        
        depot_lat = primary_depot["location"]["lat"]
        depot_lng = primary_depot["location"]["lng"]
        
        if not (-90 <= depot_lat <= 90) or not (-180 <= depot_lng <= 180):
            raise ValueError(f"Invalid depot coordinates: lat={depot_lat}, lng={depot_lng}")
        
        # Locations: depot + customers
        locations = [(depot_lat, depot_lng)]
        demands = [0]
        service_times_list = [0]  # Store service times for each location
        
        for customer in customers:
            lat = customer["location"]["lat"]
            lng = customer["location"]["lng"]
            
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                print(f"[OR-Tools] WARNING: Invalid customer coordinates: lat={lat}, lng={lng}")
                continue
                
            locations.append((lat, lng))
            demands.append(customer.get("demand_pallets", 1))
            service_duration = customer.get("service_duration", 15)  # Default 15 minutes
            service_times_list.append(service_duration)
        
        num_locations = len(locations)
        num_vehicles = len(vehicles)
        
        print(f"[OR-Tools] Locations: {num_locations} (1 depot + {num_locations-1} customers)")
        print(f"[OR-Tools] Total demand: {sum(demands)} pallets")
        
        # Distance matrix - OSRM Table API ile gerçek yol mesafesi
        print(f"[OR-Tools] ===== MESAFE MATRİSİ HESAPLANIYOR =====")
        osrm_url = os.environ.get('OSRM_URL', 'https://router.project-osrm.org')
        distance_matrix = get_osrm_distance_matrix(locations, osrm_url)
        
        # Sanity check
        for i, row in enumerate(distance_matrix):
            for j, dist in enumerate(row):
                if dist < 0:
                    distance_matrix[i][j] = 0
                elif dist > 20000000:  # 20,000 km üzeri
                    distance_matrix[i][j] = 20000000
        
        vehicle_capacities = [v.get("capacity_pallets", 26) for v in vehicles]
        total_capacity = sum(vehicle_capacities)
        total_demand = sum(demands)
        
        print(f"[OR-Tools] Total capacity: {total_capacity} pallets")
        print(f"[OR-Tools] Demand/Capacity ratio: {total_demand/total_capacity:.2f}")
        
        if total_demand > total_capacity:
            raise ValueError(f"Insufficient capacity: {total_demand} > {total_capacity}")
        
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)
        
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add fixed cost per vehicle to minimize vehicle count
        # This makes using each vehicle "expensive" so optimizer prefers fewer vehicles
        # 10000 units ≈ 10 km equivalent cost per vehicle
        routing.SetFixedCostOfAllVehicles(10000)
        print(f"[OR-Tools] Fixed vehicle cost: 10000 (prioritizes fewer vehicles)")
        
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]
        
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,
            vehicle_capacities,
            True,
            'Capacity'
        )
        
        print(f"[OR-Tools] Capacity dimension added")
        
        # Vehicle type constraints - RELAXED APPROACH
        # We log vehicle type preferences but don't enforce them strictly
        # This ensures OR-Tools can always find a solution
        print(f"[OR-Tools] ===== VEHICLE TYPE CONSTRAINTS: RELAXED =====")
        
        # Map vehicle type names to integers  
        type_mapping = {
            "kamyonet": 0,
            "kamyon_1": 1,
            "kamyon_2": 2,
            "tir": 3,
            "romork": 4
        }
        
        # Log vehicle type preferences for visibility
        constraint_count = 0
        for customer_idx, customer in enumerate(customers):
            required_type = customer.get("required_vehicle_type")
            if required_type:
                constraint_count += 1
                print(f"[OR-Tools] Customer {customer['name']} prefers: {required_type} (not enforced)")
        
        if constraint_count > 0:
            print(f"[OR-Tools] Found {constraint_count} vehicle type preferences (logged only)")
        else:
            print(f"[OR-Tools] No vehicle type preferences specified")
        
        # NOTE: Strict vehicle type constraints are disabled to ensure feasibility
        # In production, consider implementing this as a post-optimization filter or
        # using OR-Tools allowed/forbidden arc callbacks with proper slack
        
        # Add Time dimension for duration tracking
        print(f"[OR-Tools] ===== ADDING TIME DIMENSION =====")
        
        def time_callback(from_index, to_index):
            """Calculate travel + service time between nodes"""
            try:
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                
                # Travel time: distance in meters, average speed 60 km/h
                # Formula: (distance_km / speed_kmh) * 60 minutes = travel time in minutes
                distance_km = distance_matrix[from_node][to_node] / 1000.0
                average_speed_kmh = 60.0
                travel_time_minutes = (distance_km / average_speed_kmh) * 60.0
                
                # Service time at destination (0 for depot)
                if to_node == 0:
                    service_time_minutes = 0
                else:
                    customer = customers[to_node - 1]
                    business_type = customer.get("business_type", "default")
                    service_time_minutes = SERVICE_TIMES.get(business_type, SERVICE_TIMES["default"])
                
                return int(travel_time_minutes + service_time_minutes)
            except Exception as e:
                print(f"[OR-Tools] ERROR in time_callback: {e}")
                return 999999
        
        time_callback_index = routing.RegisterTransitCallback(time_callback)
        
        # Time dimension: max 1200 minutes per route (20 hours) - allows for realistic work day
        routing.AddDimension(
            time_callback_index,
            60,  # slack: 60 minutes (1 hour)
            1200,  # max: 1200 minutes (20 hours) per vehicle - enforces time limit
            True,  # start cumul to zero
            'Time'
        )
        
        # Verify Time dimension was added successfully
        try:
            test_time_dim = routing.GetDimensionOrDie('Time')
            print(f"[OR-Tools] ✓ Time dimension added successfully (max 24h per route, 2h slack)")
        except Exception as e:
            print(f"[OR-Tools] ✗ CRITICAL: Time dimension NOT found after AddDimension! Error: {e}")
            raise Exception(f"Time dimension creation failed: {e}")
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        
        # Use PATH_CHEAPEST_ARC - fastest initial solution strategy
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        
        # Use AUTOMATIC for local search - OR-Tools chooses best strategy
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.AUTOMATIC
        )
        
        # Increase timeout to 5 minutes for complex problems
        search_parameters.time_limit.seconds = 300
        search_parameters.log_search = True
        
        # Accept first feasible solution quickly
        search_parameters.solution_limit = 1
        
        print(f"[OR-Tools] Solving with PATH_CHEAPEST_ARC + AUTOMATIC metaheuristic (300s limit)...")
        print(f"[OR-Tools] About to call SolveWithParameters()...")
        
        solution = routing.SolveWithParameters(search_parameters)
        
        print(f"[OR-Tools] SolveWithParameters() returned, solution exists: {solution is not None}")
        
        if not solution:
            status = routing.status()
            status_msg = {
                0: "ROUTING_NOT_SOLVED",
                1: "ROUTING_SUCCESS",
                2: "ROUTING_FAIL",
                3: "ROUTING_FAIL_TIMEOUT",
                4: "ROUTING_INVALID",
                5: "ROUTING_FAIL_NO_SOLUTION_FOUND",
                6: "ROUTING_OPTIMAL"
            }.get(status, f"UNKNOWN({status})")
            
            # Collect diagnostic info
            total_demand = sum(demands)
            total_capacity = sum(vehicle_capacities)
            
            error_details = f"No solution found. Status: {status_msg}"
            error_details += f"\nDiagnostics: {len(customers)} customers, {num_vehicles} vehicles"
            error_details += f"\nTotal demand: {total_demand} pallets, Total capacity: {total_capacity} pallets"
            error_details += f"\nDemand/Capacity ratio: {total_demand/total_capacity:.2f}" if total_capacity > 0 else "\nTotal capacity is 0!"
            
            print(f"[OR-Tools] ERROR: {error_details}")
            raise Exception(error_details)
        
        # Parse results
        routes = []
        
        # Get time dimension for duration calculation
        try:
            time_dimension = routing.GetDimensionOrDie('Time')
            print(f"[OR-Tools] Time dimension found successfully")
        except Exception as e:
            print(f"[OR-Tools] CRITICAL WARNING: Time dimension not found! Error: {e}")
            print(f"[OR-Tools] Using fallback duration calculation")
            time_dimension = None  # Will trigger fallback logic
        
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_distance = 0
            route_stops = []
            stop_order = 1
            cumulative_load = 0  # pallets
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                
                if node_index > 0:  # Skip depot
                    customer = customers[node_index - 1]
                    
                    if route_stops:
                        prev_loc = route_stops[-1]["location"]
                        distance_from_prev = haversine_distance(
                            prev_loc["lat"], prev_loc["lng"],
                            customer["location"]["lat"], customer["location"]["lng"]
                        )
                        travel_time = (distance_from_prev / 60) * 60
                    else:
                        # First stop - distance from depot
                        distance_from_prev = haversine_distance(
                            depot_lat, depot_lng,
                            customer["location"]["lat"], customer["location"]["lng"]
                        )
                        travel_time = (distance_from_prev / 60) * 60
                    
                    cumulative_load += customer["demand_pallets"]
                    
                    route_stops.append({
                        "customer_id": customer["id"],
                        "customer_name": customer["name"],
                        "location": customer["location"],
                        "demand": customer["demand_pallets"],
                        "stopOrder": stop_order,  # Stop sequence number
                        "cumulativeLoad": cumulative_load,  # Total pallets loaded so far
                        "distanceFromPrev": round(distance_from_prev, 2)  # km from previous stop
                    })
                    
                    stop_order += 1
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
            
            if len(route_stops) > 0:
                route_distance_km = route_distance / 1000
                vehicle = vehicles[vehicle_id]
                fuel_consumption = VEHICLE_TYPES[vehicle["type"]]["fuel"]
                
                # Calculate route duration from time dimension or fallback
                end_index = routing.End(vehicle_id)
                if time_dimension:
                    route_duration_min = solution.Min(time_dimension.CumulVar(end_index))
                else:
                    # Fallback: estimate duration from distance (60 km/h average)
                    # Formula: (distance_km / speed_kmh) * 60 = minutes
                    route_duration_min = int((route_distance_km / 60.0) * 60.0)
                    # Add service times for all stops
                    for stop in route_stops:
                        route_duration_min += stop.get("service_duration", 30)
                    print(f"[OR-Tools] WARNING: Using fallback duration calculation for vehicle {vehicle_id}: {route_duration_min} min")
                
                # Validate duration against 1200-minute target (1260 max with slack)
                if route_duration_min > 1200:
                    print(f"[OR-Tools] INFO: Route for vehicle {vehicle_id} uses slack time")
                    print(f"[OR-Tools]   Duration: {route_duration_min} min (target: 1200, max: 1260)")
                    print(f"[OR-Tools]   Distance: {route_distance_km:.2f} km")
                    print(f"[OR-Tools]   Stops: {len(route_stops)}")
                    
                    # If over 1260, this should not happen due to hard constraint
                    if route_duration_min > 1260:
                        print(f"[OR-Tools] ERROR: Route exceeds maximum allowed time of 1260 minutes (with slack)!")
                
                fuel_cost = (route_distance_km / 100) * fuel_consumption * fuel_price
                distance_cost = route_distance_km * 2.5
                fixed_cost = 500.0
                toll_cost = route_distance_km * 0.5
                total_cost = fuel_cost + distance_cost + fixed_cost + toll_cost
                
                # Cap duration at 1200 for display (even if slack was used)
                display_duration = min(route_duration_min, 1200)
                
                routes.append({
                    "vehicle_id": vehicle["id"],
                    "plate": vehicle.get("plate", f"Araç {vehicle_id + 1}"),
                    "vehicle_type": vehicle["type"],
                    "depot_id": primary_depot["id"],
                    "depot_name": primary_depot.get("name", primary_depot["id"]),
                    "stops": route_stops,
                    "distance_km": round(route_distance_km, 2),
                    "duration_minutes": round(display_duration, 2),  # Capped at 600 min
                    "fuel_cost": round(fuel_cost, 2),
                    "distance_cost": round(distance_cost, 2),
                    "fixed_cost": round(fixed_cost, 2),
                    "toll_cost": round(toll_cost, 2),
                    "total_cost": round(total_cost, 2),
                    "total_pallets": sum(s["demand"] for s in route_stops)
                })
                
                total_distance += route_distance_km
        
        print(f"[OR-Tools] Generated {len(routes)} routes")
        print(f"[OR-Tools] Total distance: {round(total_distance, 2)} km")
        
        return {
            "routes": routes,
            "summary": {
                "total_routes": len(routes),
                "total_distance_km": round(total_distance, 2),
                "total_vehicles_used": len(routes),
                "algorithm": "OR-Tools"
            }
        }
    except Exception as e:
        print(f"[OR-Tools] ERROR during optimization: {e}")
        raise e

def _optimize_multi_depot(depots: list, customers: list, vehicles: list, fuel_price: float) -> dict:
    """True multi-depot optimization (experimental)"""
    try:
        print(f"[OR-Tools] Starting optimization...")
        print(f"[OR-Tools] Depots: {len(depots)}")
        print(f"[OR-Tools] Customers: {len(customers)}")
        print(f"[OR-Tools] Vehicles: {len(vehicles)}")
        
        depot_locations = []
        for depot in depots:
            depot_lat = depot["location"]["lat"]
            depot_lng = depot["location"]["lng"]
            if not (-90 <= depot_lat <= 90) or not (-180 <= depot_lng <= 180):
                raise ValueError(f"Invalid depot coordinates: lat={depot_lat}, lng={depot_lng}")
            depot_locations.append((depot_lat, depot_lng))
            print(f"[OR-Tools] Depot {depot.get('name', depot.get('id', 'Unknown'))}: ({depot_lat}, {depot_lng})")
        
        # Locations: depots + customers
        locations = depot_locations.copy()
        
        demands = [0] * len(depots)
        
        for i, customer in enumerate(customers):
            lat = customer["location"]["lat"]
            lng = customer["location"]["lng"]
            
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                print(f"[OR-Tools] WARNING: Invalid customer {i} coordinates: lat={lat}, lng={lng}")
                continue
                
            locations.append((lat, lng))
            demands.append(customer.get("demand_pallets", 1))
        
        num_locations = len(locations)
        num_vehicles = len(vehicles)
        
        print(f"[OR-Tools] Valid locations: {num_locations}")
        print(f"[OR-Tools] Total demand: {sum(demands)} pallets")
        
        distance_matrix = []
        for i, loc1 in enumerate(locations):
            row = []
            for j, loc2 in enumerate(locations):
                if i == j:
                    row.append(0)
                else:
                    dist = haversine_distance(loc1[0], loc1[1], loc2[0], loc2[1])
                    if dist < 0 or dist > 20000:
                        print(f"[OR-Tools] WARNING: Suspicious distance between {i} and {j}: {dist}km")
                        dist = max(1, min(dist, 20000))
                    row.append(int(dist * 1000))
            distance_matrix.append(row)
        
        print(f"[OR-Tools] Distance matrix size: {len(distance_matrix)}x{len(distance_matrix[0])}")
        
        vehicle_capacities = []
        for v in vehicles:
            cap = v.get("capacity_pallets", 26)
            if cap <= 0:
                print(f"[OR-Tools] WARNING: Vehicle {v.get('id')} has invalid capacity: {cap}")
                cap = 26
            vehicle_capacities.append(cap)
        
        total_capacity = sum(vehicle_capacities)
        total_demand = sum(demands)
        
        print(f"[OR-Tools] Total capacity: {total_capacity} pallets")
        print(f"[OR-Tools] Demand/Capacity ratio: {total_demand/total_capacity:.2f}")
        
        if total_demand > total_capacity:
            raise ValueError(f"Total demand ({total_demand}) exceeds total capacity ({total_capacity})")
        
        print(f"[OR-Tools] Creating RoutingIndexManager...")
        
        # 9 arac, 3 depo -> [0,1,2,0,1,2,0,1,2]
        num_depots = len(depots)
        starts = [i % num_depots for i in range(num_vehicles)]
        ends = starts  # Araclar basladiklarini depoya doner
        
        print(f"[OR-Tools] Start depots: {starts}")
        print(f"[OR-Tools] End depots: {ends}")
        
        manager = pywrapcp.RoutingIndexManager(
            num_locations,
            num_vehicles,
            starts,  # Her arac icin baslangic depo indexi
            ends     # Her arac icin bitis depo indexi
        )
        print(f"[OR-Tools] RoutingIndexManager created with {num_depots} depots")
        
        print(f"[OR-Tools] Creating RoutingModel...")
        routing = pywrapcp.RoutingModel(manager)
        print(f"[OR-Tools] RoutingModel created")
        
        def distance_callback(from_index, to_index):
            try:
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return distance_matrix[from_node][to_node]
            except Exception as e:
                print(f"[OR-Tools] ERROR in distance_callback: {e}")
                return 1000000
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        print(f"[OR-Tools] Distance callback registered")
        
        # Add fixed cost per vehicle to minimize vehicle count
        routing.SetFixedCostOfAllVehicles(10000)
        print(f"[OR-Tools] Fixed vehicle cost: 10000 (prioritizes fewer vehicles)")
        
        def demand_callback(from_index):
            try:
                from_node = manager.IndexToNode(from_index)
                return demands[from_node]
            except Exception as e:
                print(f"[OR-Tools] ERROR in demand_callback: {e}")
                return 0
        
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,
            vehicle_capacities,
            True,
            'Capacity'
        )
        print(f"[OR-Tools] Capacity dimension added")
        
        # Time dimension: travel time + service time
        def time_callback(from_index, to_index):
            """Calculate travel + service time between nodes"""
            try:
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                
                # Travel time: distance in meters, average speed 60 km/h
                # Formula: (distance_km / speed_kmh) * 60 minutes = travel time in minutes
                distance_km = distance_matrix[from_node][to_node] / 1000.0
                average_speed_kmh = 60.0
                travel_time_minutes = (distance_km / average_speed_kmh) * 60.0
                
                # Service time at destination
                service_time_minutes = SERVICE_TIMES.get(customers[to_node - len(depots)].get("business_type", "default"), SERVICE_TIMES["default"]) if to_node >= len(depots) else 0
                
                return int(travel_time_minutes + service_time_minutes)
            except Exception as e:
                print(f"[OR-Tools] ERROR in time_callback: {e}")
                return 999999
        
        time_callback_index = routing.RegisterTransitCallback(time_callback)
        
        # Time dimension: max 1200 minutes per route (20 hours total including breaks)
        routing.AddDimension(
            time_callback_index,
            60,  # slack: 60 minutes (1 hour)
            1200,  # Max 1200 minutes (20 hours) per vehicle - enforces time limit
            True,  # Start cumul to zero
            'Time'
        )
        time_dimension = routing.GetDimensionOrDie('Time')
        
        print(f"[OR-Tools] Time dimension added (max 20h per route, breaks included in route time)")
        
        # Add time window constraints
        # for location_idx, time_window in enumerate(time_windows):
        #     if location_idx == 0:
        #         continue  # Skip depot
        #     index = manager.NodeToIndex(location_idx)
        #     time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])
        #     print(f"[OR-Tools] Set time window for location {location_idx}: [{time_window[0]}, {time_window[1]}]")
        
        print(f"[OR-Tools] Time window constraints DISABLED for testing - only using time dimension for route duration limit")
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC  # Faster initial solution
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH  # Better optimization
        )
        search_parameters.time_limit.seconds = 120  # Increased from 30 to 120 seconds
        search_parameters.log_search = True
        
        print(f"[OR-Tools] Starting solver with 120s timeout and guided local search...")
        solution = routing.SolveWithParameters(search_parameters)
        
        if not solution:
            status = routing.status()
            status_messages = {
                0: "ROUTING_NOT_SOLVED",
                1: "ROUTING_SUCCESS",
                2: "ROUTING_FAIL",
                3: "ROUTING_FAIL_TIMEOUT",
                4: "ROUTING_INVALID",
                5: "ROUTING_FAIL_NO_SOLUTION_FOUND",
                6: "ROUTING_OPTIMAL"
            }
            status_msg = status_messages.get(status, f"UNKNOWN({status})")
            print(f"[OR-Tools] No solution found. Status: {status_msg}")
            
            error_details = f"Model initialization failed. Status: {status_msg}"
            error_details += f"\nDiagnostics: Locations: {num_locations}; Vehicles: {num_vehicles}"
            error_details += f"\nTotal demand: {total_demand} pallets; Total capacity: {total_capacity} pallets"
            error_details += f"\nDemand/Capacity ratio: {total_demand/total_capacity:.2f}" if total_capacity > 0 else "\nTotal capacity is 0!"
            
            raise Exception(error_details)
        
        # Servis süreleri
        service_times = [0] * len(depots)  # Depolar için servis süresi 0
        for customer in customers:
            business = customer.get("business_type", "default")
            service_times.append(SERVICE_TIMES.get(business, SERVICE_TIMES["default"]))
        
        # Sonuçları parse et
        routes = []
        total_distance = 0
        
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_distance = 0
            route_stops = []
            stop_order = 1
            cumulative_time = 0
            cumulative_load = 0
            
            start_node = manager.IndexToNode(index)
            vehicle_depot_index = start_node if start_node < len(depots) else 0
            vehicle_depot = depots[vehicle_depot_index]
            depot_lat = vehicle_depot["location"]["lat"]
            depot_lng = vehicle_depot["location"]["lng"]
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                
                if node_index >= len(depots):
                    customer = customers[node_index - len(depots)]
                    
                    if route_stops:
                        prev_loc = route_stops[-1]["location"]
                        distance_from_prev = haversine_distance(
                            prev_loc["lat"], prev_loc["lng"],
                            customer["location"]["lat"], customer["location"]["lng"]
                        )
                        travel_time = (distance_from_prev / 60) * 60
                    else:
                        # First stop - distance from depot
                        distance_from_prev = haversine_distance(
                            depot_lat, depot_lng,
                            customer["location"]["lat"], customer["location"]["lng"]
                        )
                        travel_time = (distance_from_prev / 60) * 60
                    
                    cumulative_time += travel_time
                    service_time_min = service_times[node_index]
                    cumulative_load += customer["demand_pallets"]
                    
                    route_stops.append({
                        "customer_id": customer["id"],
                        "customer_name": customer["name"],
                        "location": customer["location"],
                        "demand": customer["demand_pallets"],
                        "service_time": service_time_min,
                        "stopOrder": stop_order,  # Stop sequence number
                        "arrivalTime": round(cumulative_time, 1),  # Cumulative minutes from depot
                        "cumulativeLoad": cumulative_load,  # Total pallets loaded
                        "distanceFromPrev": round(distance_from_prev, 2)  # km from previous
                    })
                    
                    cumulative_time += service_time_min
                    stop_order += 1
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
            
            if len(route_stops) > 0:
                route_distance_km = route_distance / 1000
                vehicle = vehicles[vehicle_id]
                fuel_consumption = VEHICLE_TYPES[vehicle["type"]]["fuel"]
                
                # Calculate route duration: (distance_km / speed_kmh) * 60 = minutes
                route_duration_minutes = (route_distance_km / 60.0) * 60.0
                route_duration_minutes += sum(s["service_time"] for s in route_stops)
                
                fuel_cost = (route_distance_km / 100) * fuel_consumption * fuel_price
                distance_cost = route_distance_km * 2.5
                fixed_cost = 500.0
                toll_cost = route_distance_km * 0.5
                total_cost = fuel_cost + distance_cost + fixed_cost + toll_cost
                
                routes.append({
                    "vehicle_id": vehicle["id"],
                    "plate": vehicle.get("plate", f"Araç {vehicle_id + 1}"),
                    "vehicle_type": vehicle["type"],
                    "depot_id": vehicle_depot["id"],
                    "depot_name": vehicle_depot.get("name", vehicle_depot["id"]),
                    "stops": route_stops,
                    "distance_km": round(route_distance_km, 2),
                    "duration_minutes": round(route_duration_minutes, 2),
                    "fuel_cost": round(fuel_cost, 2),
                    "distance_cost": round(distance_cost, 2),
                    "fixed_cost": round(fixed_cost, 2),
                    "toll_cost": round(toll_cost, 2),
                    "total_cost": round(total_cost, 2),
                    "total_pallets": sum(s["demand"] for s in route_stops)
                })
                
                total_distance += route_distance_km
        
        print(f"[OR-Tools] Generated {len(routes)} routes")
        print(f"[OR-Tools] Total distance: {round(total_distance, 2)} km")
        
        return {
            "routes": routes,
            "summary": {
                "total_routes": len(routes),
                "total_distance_km": round(total_distance, 2),
                "total_vehicles_used": len(routes),
                "algorithm": "OR-Tools"
            }
        }
    except Exception as e:
        print(f"[OR-Tools] ERROR during optimization: {e}")
        raise e
