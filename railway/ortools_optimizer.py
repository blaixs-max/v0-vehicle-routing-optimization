from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math
from typing import List, Dict

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
    1: {"name": "Kamyonet", "capacity": 10, "fuel": 15},
    2: {"name": "Kamyon-1", "capacity": 14, "fuel": 20},
    3: {"name": "Kamyon-2", "capacity": 18, "fuel": 30},
    4: {"name": "TIR", "capacity": 32, "fuel": 35},
    5: {"name": "Romork", "capacity": 36, "fuel": 40}
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula ile iki nokta arası mesafe (km)"""
    R = 6371  # Dünya yarıçapı (km)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

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

def optimize_routes(customers: List[dict], vehicles: List[dict], depot: dict, fuel_price: float = 47.50) -> dict:
    """OR-Tools ile rota optimizasyonu"""
    
    print(f"[OR-Tools] Starting optimization with {len(customers)} customers, {len(vehicles)} vehicles")
    print(f"[OR-Tools] Depot location: {depot['location']}")
    
    # Validate depot coordinates
    depot_lat = depot["location"]["lat"]
    depot_lng = depot["location"]["lng"]
    if not (-90 <= depot_lat <= 90) or not (-180 <= depot_lng <= 180):
        raise Exception(f"Invalid depot coordinates: lat={depot_lat}, lng={depot_lng}")
    
    # Validate customers
    valid_customers = []
    for i, customer in enumerate(customers):
        lat = customer["location"]["lat"]
        lng = customer["location"]["lng"]
        demand = customer.get("demand_pallets", 0)
        
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            print(f"[OR-Tools] WARNING: Skipping customer {customer['id']} - invalid coordinates: lat={lat}, lng={lng}")
            continue
        
        if demand <= 0:
            print(f"[OR-Tools] WARNING: Customer {customer['id']} has zero or negative demand: {demand}")
            customer["demand_pallets"] = 1  # Set minimum demand
        
        valid_customers.append(customer)
    
    if len(valid_customers) == 0:
        raise Exception("No valid customers after validation")
    
    customers = valid_customers
    print(f"[OR-Tools] Valid customers: {len(customers)}")
    
    # Validate vehicles
    valid_vehicles = []
    for vehicle in vehicles:
        capacity = vehicle.get("capacity_pallets", 0)
        if capacity <= 0:
            print(f"[OR-Tools] WARNING: Vehicle {vehicle['id']} has zero or negative capacity: {capacity}")
            continue
        valid_vehicles.append(vehicle)
    
    if len(valid_vehicles) == 0:
        raise Exception("No valid vehicles after validation")
    
    vehicles = valid_vehicles
    print(f"[OR-Tools] Valid vehicles: {len(vehicles)}")
    
    # Lokasyonlar: [depot] + customers
    locations = [(depot_lat, depot_lng)]
    for customer in customers:
        locations.append((customer["location"]["lat"], customer["location"]["lng"]))
    
    num_locations = len(locations)
    num_vehicles = len(vehicles)
    
    print(f"[OR-Tools] Building distance matrix for {num_locations} locations...")
    
    # Mesafe matrisi oluştur (km)
    distance_matrix = []
    for i in range(num_locations):
        row = []
        for j in range(num_locations):
            if i == j:
                row.append(0)
            else:
                dist = haversine_distance(
                    locations[i][0], locations[i][1],
                    locations[j][0], locations[j][1]
                )
                if math.isnan(dist) or math.isinf(dist) or dist < 0:
                    print(f"[OR-Tools] ERROR: Invalid distance between {i} and {j}: {dist}")
                    raise Exception(f"Invalid distance calculated: {dist}")
                row.append(int(dist * 1000))  # Metre cinsinden
        distance_matrix.append(row)
    
    print(f"[OR-Tools] Distance matrix built successfully")
    
    # Zaman matrisi (dakika) - 50 km/h ortalama hız
    time_matrix = []
    for i in range(num_locations):
        row = []
        for j in range(num_locations):
            time_minutes = int((distance_matrix[i][j] / 1000) / 50 * 60)
            row.append(time_minutes)
        time_matrix.append(row)
    
    # Talep (palet)
    demands = [0]  # Depo talebi 0
    total_demand = 0
    for customer in customers:
        demand = customer["demand_pallets"]
        demands.append(demand)
        total_demand += demand
    
    print(f"[OR-Tools] Total demand: {total_demand} pallets")
    
    # Araç kapasiteleri
    vehicle_capacities = [v["capacity_pallets"] for v in vehicles]
    total_capacity = sum(vehicle_capacities)
    
    print(f"[OR-Tools] Total vehicle capacity: {total_capacity} pallets")
    print(f"[OR-Tools] Vehicle capacities: {vehicle_capacities}")
    
    if total_demand > total_capacity:
        print(f"[OR-Tools] WARNING: Demand ({total_demand}) exceeds capacity ({total_capacity})!")
        # Bu durum çözüm bulunamaz ancak devam edelim, belki partial solution bulunabilir
    
    # Servis süreleri
    service_times = [0]  # Depo
    for customer in customers:
        business = customer.get("business_type", "default")
        service_times.append(SERVICE_TIMES.get(business, SERVICE_TIMES["default"]))
    
    # Routing model oluştur
    try:
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, 0)
        print(f"[OR-Tools] RoutingIndexManager created successfully")
    except Exception as e:
        print(f"[OR-Tools] ERROR: Failed to create RoutingIndexManager: {str(e)}")
        raise Exception(f"Failed to create RoutingIndexManager: {str(e)}")
    
    try:
        routing = pywrapcp.RoutingModel(manager)
        print(f"[OR-Tools] RoutingModel created successfully")
    except Exception as e:
        print(f"[OR-Tools] ERROR: Failed to create RoutingModel: {str(e)}")
        raise Exception(f"Failed to create RoutingModel: {str(e)}")
    
    # Mesafe callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # Kapasite kısıtı
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]
    
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # Null capacity slack
        vehicle_capacities,
        True,  # Start cumul to zero
        'Capacity'
    )
    
    # Zaman kısıtı
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return time_matrix[from_node][to_node] + service_times[from_node]
    
    time_callback_index = routing.RegisterTransitCallback(time_callback)
    
    routing.AddDimension(
        time_callback_index,
        90,  # Slack time (dakika) - mola için
        780,  # Max rota süresi (13 saat = 780 dakika) - 9h sürüş + 45dk mola + servisler
        False,  # Don't force start cumul to zero
        'Time'
    )
    
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 30
    
    search_parameters.log_search = True
    
    print("[OR-Tools] Starting solver...")
    print(f"[OR-Tools] Search parameters: timeout={search_parameters.time_limit.seconds}s")
    
    # Çözümü bul
    solution = routing.SolveWithParameters(search_parameters)
    
    if not solution:
        print("[OR-Tools] No solution found!")
        status = routing.status()
        print(f"[OR-Tools] Status code: {status}")
        
        # Status kodları
        status_messages = {
            0: "ROUTING_NOT_SOLVED",
            1: "ROUTING_SUCCESS",
            2: "ROUTING_FAIL",
            3: "ROUTING_FAIL_TIMEOUT",
            4: "ROUTING_INVALID"
        }
        
        status_msg = status_messages.get(status, "UNKNOWN")
        print(f"[OR-Tools] Status message: {status_msg}")
        
        if status == 4:  # ROUTING_INVALID
            error_details = []
            error_details.append(f"Locations: {num_locations}")
            error_details.append(f"Vehicles: {num_vehicles}")
            error_details.append(f"Total demand: {total_demand} pallets")
            error_details.append(f"Total capacity: {total_capacity} pallets")
            error_details.append(f"Demand/Capacity ratio: {total_demand/total_capacity:.2f}")
            
            raise Exception(f"ROUTING_INVALID - Model initialization failed. Details: {'; '.join(error_details)}")
        
        raise Exception(f"No solution found. Status: {status_msg}")
    
    print(f"[OR-Tools] Solution found! Objective value: {solution.ObjectiveValue()}")
    
    # Sonuçları parse et
    routes = []
    total_distance = 0
    total_time = 0
    
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route_distance = 0
        route_time = 0
        route_stops = []
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            
            if node_index > 0:  # Depo değilse
                customer = customers[node_index - 1]
                route_stops.append({
                    "customer_id": customer["id"],
                    "customer_name": customer["name"],
                    "location": customer["location"],
                    "demand": customer["demand_pallets"],
                    "service_time": service_times[node_index]
                })
            
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)
        
        if len(route_stops) > 0:
            route_distance_km = route_distance / 1000
            vehicle = vehicles[vehicle_id]
            fuel_consumption = VEHICLE_TYPES[vehicle["type"]]["fuel"]
            fuel_cost = (route_distance_km / 100) * fuel_consumption * fuel_price
            
            routes.append({
                "vehicle_id": vehicle["id"],
                "vehicle_type": vehicle["type"],
                "stops": route_stops,
                "distance_km": round(route_distance_km, 2),
                "fuel_cost": round(fuel_cost, 2),
                "total_pallets": sum(s["demand"] for s in route_stops)
            })
            
            total_distance += route_distance_km
            total_time += route_time
    
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
