"""
Optimized OR-Tools VRP Solver
Version 2.0 - Performance improvements and better configuration
"""

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math
from typing import List, Dict, Tuple, Optional
from functools import lru_cache
from dataclasses import dataclass
import time

# Business tiplerine göre servis süreleri (dakika)
SERVICE_TIMES = {
    "MCD": 60,
    "IKEA": 45,
    "CHL": 30,
    "OPT": 30,
    "restaurant": 30,
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

@dataclass
class OptimizerConfig:
    """Configurable optimizer parameters"""
    time_limit_seconds: int = 45
    default_speed_kmh: int = 60
    enable_time_windows: bool = False  # Time window'lar test edilene kadar kapalı
    search_strategy: str = "SAVINGS"  # SAVINGS, PATH_CHEAPEST_ARC, PARALLEL_CHEAPEST_INSERTION
    use_local_search: bool = True
    local_search_metaheuristic: str = "GUIDED_LOCAL_SEARCH"  # GUIDED_LOCAL_SEARCH, TABU_SEARCH
    solution_limit: int = 100  # Daha fazla çözüm dene
    log_search: bool = True

    # Distance matrix caching
    use_distance_cache: bool = True
    cache_size: int = 2048

# Global distance cache
_distance_cache = {}

@lru_cache(maxsize=2048)
def cached_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Cached Haversine formula ile iki nokta arası mesafe (km)"""
    R = 6371  # Dünya yarıçapı (km)

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Wrapper for non-cached version (compatibility)"""
    return cached_haversine_distance(lat1, lon1, lat2, lon2)

def time_to_minutes(time_str: str) -> int:
    """Convert HH:MM time string to minutes from start of day"""
    if not time_str:
        return 0
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except:
        return 0

def calculate_route_cost(distance_km: float, vehicle_type: int, fuel_price: float) -> dict:
    """Centralized route cost calculation"""
    fuel_consumption = VEHICLE_TYPES[vehicle_type]["fuel"]

    fuel_cost = (distance_km / 100) * fuel_consumption * fuel_price
    distance_cost = distance_km * 2.5
    fixed_cost = 500.0
    toll_cost = distance_km * 0.5

    return {
        "fuel": round(fuel_cost, 2),
        "distance": round(distance_cost, 2),
        "fixed": round(fixed_cost, 2),
        "toll": round(toll_cost, 2),
        "total": round(fuel_cost + distance_cost + fixed_cost + toll_cost, 2)
    }

def build_distance_matrix(locations: List[Tuple[float, float]], use_cache: bool = True) -> List[List[int]]:
    """Build distance matrix with optional caching"""
    n = len(locations)
    matrix = []

    print(f"[OR-Tools] Building distance matrix for {n} locations...")
    start_time = time.time()

    for i, loc1 in enumerate(locations):
        row = []
        for j, loc2 in enumerate(locations):
            if i == j:
                row.append(0)
            else:
                # Cache key
                cache_key = (round(loc1[0], 6), round(loc1[1], 6),
                           round(loc2[0], 6), round(loc2[1], 6))

                if use_cache and cache_key in _distance_cache:
                    dist = _distance_cache[cache_key]
                else:
                    dist = cached_haversine_distance(loc1[0], loc1[1], loc2[0], loc2[1])
                    if use_cache:
                        _distance_cache[cache_key] = dist

                # Clamp distance to reasonable range
                dist = max(0.1, min(dist, 20000))
                row.append(int(dist * 1000))  # meters
        matrix.append(row)

    elapsed = time.time() - start_time
    print(f"[OR-Tools] Distance matrix built in {elapsed:.2f}s")

    return matrix

def get_search_strategy(strategy_name: str):
    """Get OR-Tools search strategy enum"""
    strategies = {
        "PATH_CHEAPEST_ARC": routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC,
        "SAVINGS": routing_enums_pb2.FirstSolutionStrategy.SAVINGS,
        "PARALLEL_CHEAPEST_INSERTION": routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION,
        "LOCAL_CHEAPEST_INSERTION": routing_enums_pb2.FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION,
        "AUTOMATIC": routing_enums_pb2.FirstSolutionStrategy.AUTOMATIC,
    }
    return strategies.get(strategy_name, routing_enums_pb2.FirstSolutionStrategy.SAVINGS)

def get_local_search_metaheuristic(metaheuristic_name: str):
    """Get OR-Tools local search metaheuristic enum"""
    metaheuristics = {
        "GUIDED_LOCAL_SEARCH": routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH,
        "TABU_SEARCH": routing_enums_pb2.LocalSearchMetaheuristic.TABU_SEARCH,
        "SIMULATED_ANNEALING": routing_enums_pb2.LocalSearchMetaheuristic.SIMULATED_ANNEALING,
        "GREEDY_DESCENT": routing_enums_pb2.LocalSearchMetaheuristic.GREEDY_DESCENT,
    }
    return metaheuristics.get(metaheuristic_name, routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)

def optimize_routes(
    depots: list,
    customers: list,
    vehicles: list,
    fuel_price: float = 47.50,
    config: Optional[OptimizerConfig] = None
) -> dict:
    """
    Main optimizer entry point with automatic single/multi-depot selection
    """
    if config is None:
        config = OptimizerConfig()

    print(f"[OR-Tools] ========== OPTIMIZATION START ==========")
    print(f"[OR-Tools] Depots: {len(depots)}, Customers: {len(customers)}, Vehicles: {len(vehicles)}")
    print(f"[OR-Tools] Config: time_limit={config.time_limit_seconds}s, strategy={config.search_strategy}")

    # Automatic depot selection
    if len(depots) == 1:
        print(f"[OR-Tools] Using SINGLE-DEPOT optimization")
        return _optimize_single_depot(depots[0], depots, customers, vehicles, fuel_price, config)
    else:
        print(f"[OR-Tools] Using MULTI-DEPOT optimization")
        return _optimize_multi_depot(depots, customers, vehicles, fuel_price, config)

def _optimize_single_depot(
    primary_depot: dict,
    all_depots: list,
    customers: list,
    vehicles: list,
    fuel_price: float,
    config: OptimizerConfig
) -> dict:
    """Optimized single depot VRP solver"""
    try:
        start_time = time.time()

        print(f"[OR-Tools] Primary depot: {primary_depot.get('name', primary_depot.get('id'))}")

        depot_lat = primary_depot["location"]["lat"]
        depot_lng = primary_depot["location"]["lng"]

        if not (-90 <= depot_lat <= 90) or not (-180 <= depot_lng <= 180):
            raise ValueError(f"Invalid depot coordinates: lat={depot_lat}, lng={depot_lng}")

        # Build locations list
        locations = [(depot_lat, depot_lng)]
        demands = [0]
        service_times_list = [0]

        for customer in customers:
            lat = customer["location"]["lat"]
            lng = customer["location"]["lng"]

            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                print(f"[OR-Tools] WARNING: Invalid customer coordinates: lat={lat}, lng={lng}")
                continue

            locations.append((lat, lng))
            demands.append(customer.get("demand_pallets", 1))
            service_duration = customer.get("service_duration",
                                          SERVICE_TIMES.get(customer.get("business_type", "default"), 30))
            service_times_list.append(service_duration)

        num_locations = len(locations)
        num_vehicles = len(vehicles)

        print(f"[OR-Tools] Locations: {num_locations} (1 depot + {num_locations-1} customers)")
        print(f"[OR-Tools] Total demand: {sum(demands)} pallets")

        # Build distance matrix with caching
        distance_matrix = build_distance_matrix(locations, use_cache=config.use_distance_cache)

        # Vehicle capacities
        vehicle_capacities = [v.get("capacity_pallets", 26) for v in vehicles]
        total_capacity = sum(vehicle_capacities)
        total_demand = sum(demands)

        print(f"[OR-Tools] Total capacity: {total_capacity} pallets")
        print(f"[OR-Tools] Demand/Capacity ratio: {total_demand/total_capacity:.2f}")

        if total_demand > total_capacity:
            raise ValueError(f"Insufficient capacity: {total_demand} > {total_capacity}")

        # Create routing model
        manager = pywrapcp.RoutingIndexManager(num_locations, num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        # Optimized distance callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Capacity dimension
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            vehicle_capacities,
            True,  # start cumul to zero
            'Capacity'
        )

        print(f"[OR-Tools] Capacity dimension added")

        # Time dimension (optional)
        if config.enable_time_windows:
            print(f"[OR-Tools] Adding time dimension with service times...")

            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)

                # Travel time
                travel_time = (distance_matrix[from_node][to_node] / 1000) / config.default_speed_kmh * 60

                # Service time at destination
                service_time = service_times_list[to_node]

                return int(travel_time + service_time)

            time_callback_index = routing.RegisterTransitCallback(time_callback)
            routing.AddDimension(
                time_callback_index,
                30,  # allow 30 min waiting time
                600,  # max 600 minutes (10 hours) per route
                True,  # start cumul to zero
                'Time'
            )

            time_dimension = routing.GetDimensionOrDie('Time')

            # Add time window constraints for customers with constraints
            for i, customer in enumerate(customers, start=1):
                if customer.get("has_time_constraint"):
                    index = manager.NodeToIndex(i)
                    start_time = time_to_minutes(customer.get("constraint_start_time", "00:00"))
                    end_time = time_to_minutes(customer.get("constraint_end_time", "23:59"))
                    time_dimension.CumulVar(index).SetRange(start_time, end_time)
                    print(f"[OR-Tools] Time window for customer {i}: {start_time}-{end_time} min")
        else:
            print(f"[OR-Tools] Time dimension DISABLED (distance-only optimization)")

        # Configure search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = get_search_strategy(config.search_strategy)

        if config.use_local_search:
            search_parameters.local_search_metaheuristic = get_local_search_metaheuristic(
                config.local_search_metaheuristic
            )

        search_parameters.time_limit.seconds = config.time_limit_seconds
        search_parameters.log_search = config.log_search
        search_parameters.solution_limit = config.solution_limit

        print(f"[OR-Tools] Search strategy: {config.search_strategy}")
        print(f"[OR-Tools] Local search: {config.local_search_metaheuristic if config.use_local_search else 'DISABLED'}")
        print(f"[OR-Tools] Time limit: {config.time_limit_seconds}s")
        print(f"[OR-Tools] Solving...")

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            status = routing.status()
            status_msg = {
                0: "ROUTING_NOT_SOLVED",
                1: "ROUTING_SUCCESS",
                2: "ROUTING_FAIL",
                3: "ROUTING_FAIL_TIMEOUT",
                4: "ROUTING_INVALID"
            }.get(status, f"UNKNOWN({status})")
            raise Exception(f"No solution found. Status: {status_msg}")

        # Parse solution
        routes = []
        total_distance = 0

        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route_distance = 0
            route_stops = []
            stop_order = 1
            cumulative_load = 0

            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)

                if node_index > 0:  # Skip depot
                    customer = customers[node_index - 1]

                    if route_stops:
                        prev_loc = route_stops[-1]["location"]
                        distance_from_prev = cached_haversine_distance(
                            prev_loc["lat"], prev_loc["lng"],
                            customer["location"]["lat"], customer["location"]["lng"]
                        )
                    else:
                        distance_from_prev = cached_haversine_distance(
                            depot_lat, depot_lng,
                            customer["location"]["lat"], customer["location"]["lng"]
                        )

                    cumulative_load += customer["demand_pallets"]

                    route_stops.append({
                        "customer_id": customer["id"],
                        "customer_name": customer["name"],
                        "location": customer["location"],
                        "demand": customer["demand_pallets"],
                        "stopOrder": stop_order,
                        "cumulativeLoad": cumulative_load,
                        "distanceFromPrev": round(distance_from_prev, 2)
                    })

                    stop_order += 1

                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id)

            if len(route_stops) > 0:
                route_distance_km = route_distance / 1000
                vehicle = vehicles[vehicle_id]

                # Calculate costs using centralized function
                costs = calculate_route_cost(route_distance_km, vehicle["type"], fuel_price)

                routes.append({
                    "vehicle_id": vehicle["id"],
                    "plate": vehicle.get("plate", f"Araç {vehicle_id + 1}"),
                    "vehicle_type": vehicle["type"],
                    "depot_id": primary_depot["id"],
                    "depot_name": primary_depot.get("name", primary_depot["id"]),
                    "stops": route_stops,
                    "distance_km": round(route_distance_km, 2),
                    "fuel_cost": costs["fuel"],
                    "distance_cost": costs["distance"],
                    "fixed_cost": costs["fixed"],
                    "toll_cost": costs["toll"],
                    "total_cost": costs["total"],
                    "total_pallets": sum(s["demand"] for s in route_stops)
                })

                total_distance += route_distance_km

        elapsed = time.time() - start_time
        print(f"[OR-Tools] ========== OPTIMIZATION COMPLETE ==========")
        print(f"[OR-Tools] Generated {len(routes)} routes in {elapsed:.2f}s")
        print(f"[OR-Tools] Total distance: {round(total_distance, 2)} km")
        print(f"[OR-Tools] Objective value: {solution.ObjectiveValue()}")

        return {
            "routes": routes,
            "summary": {
                "total_routes": len(routes),
                "total_distance_km": round(total_distance, 2),
                "total_vehicles_used": len(routes),
                "algorithm": "OR-Tools",
                "computation_time_seconds": round(elapsed, 2),
                "objective_value": solution.ObjectiveValue()
            }
        }
    except Exception as e:
        print(f"[OR-Tools] ERROR during optimization: {e}")
        raise e

def _optimize_multi_depot(
    depots: list,
    customers: list,
    vehicles: list,
    fuel_price: float,
    config: OptimizerConfig
) -> dict:
    """
    Optimized multi-depot VRP solver

    Strategy:
    1. Assign each customer to nearest depot
    2. Distribute vehicles across depots proportionally
    3. Optimize each depot independently
    4. Combine results
    """
    try:
        start_time = time.time()
        print(f"[OR-Tools] ========== MULTI-DEPOT OPTIMIZATION ==========")
        print(f"[OR-Tools] Depots: {len(depots)}, Customers: {len(customers)}, Vehicles: {len(vehicles)}")

        # Step 1: Assign customers to nearest depot
        depot_assignments = {}  # depot_id -> list of customers
        customer_depot_map = {}  # customer_id -> depot_id

        for depot in depots:
            depot_assignments[depot["id"]] = []

        print(f"[OR-Tools] Assigning customers to nearest depot...")
        for customer in customers:
            customer_lat = customer["location"]["lat"]
            customer_lng = customer["location"]["lng"]

            # Find nearest depot
            nearest_depot = None
            min_distance = float('inf')

            for depot in depots:
                depot_lat = depot["location"]["lat"]
                depot_lng = depot["location"]["lng"]

                distance = cached_haversine_distance(
                    customer_lat, customer_lng,
                    depot_lat, depot_lng
                )

                if distance < min_distance:
                    min_distance = distance
                    nearest_depot = depot

            if nearest_depot:
                depot_assignments[nearest_depot["id"]].append(customer)
                customer_depot_map[customer["id"]] = nearest_depot["id"]

        # Print assignment summary
        for depot in depots:
            depot_id = depot["id"]
            num_customers = len(depot_assignments[depot_id])
            depot_name = depot.get("name", depot_id)
            print(f"[OR-Tools]   {depot_name}: {num_customers} customers")

        # Step 2: Distribute vehicles across depots based on demand
        total_demand = sum(c.get("demand_pallets", 1) for c in customers)
        depot_demands = {}

        for depot_id, assigned_customers in depot_assignments.items():
            depot_demands[depot_id] = sum(c.get("demand_pallets", 1) for c in assigned_customers)

        # Distribute vehicles proportionally to demand
        depot_vehicles = {}  # depot_id -> list of vehicles
        vehicles_copy = vehicles.copy()

        # Sort vehicles by capacity (descending) - allocate large vehicles first
        vehicles_copy.sort(key=lambda v: v.get("capacity_pallets", 26), reverse=True)

        # Sort depots by demand (descending)
        sorted_depot_ids = sorted(depot_demands.keys(), key=lambda d: depot_demands[d], reverse=True)

        print(f"[OR-Tools] Distributing {len(vehicles)} vehicles across depots...")

        for depot_id in sorted_depot_ids:
            depot_demand = depot_demands[depot_id]

            if depot_demand == 0:
                depot_vehicles[depot_id] = []
                continue

            # FIRST PASS: Allocate vehicles to meet MINIMUM demand only (no buffer yet)
            depot_vehicles[depot_id] = []
            allocated_capacity = 0

            for vehicle in vehicles_copy[:]:
                vehicle_capacity = vehicle.get("capacity_pallets", 26)
                depot_vehicles[depot_id].append(vehicle)
                allocated_capacity += vehicle_capacity
                vehicles_copy.remove(vehicle)

                # Stop when we meet minimum demand (not buffer yet!)
                if allocated_capacity >= depot_demand:
                    break

                # Or if no more vehicles
                if len(vehicles_copy) == 0:
                    break

            depot_name = next((d.get("name", depot_id) for d in depots if d["id"] == depot_id), depot_id)
            print(f"[OR-Tools]   {depot_name}: {len(depot_vehicles[depot_id])} vehicles (capacity: {allocated_capacity}, demand: {depot_demand})")

            # Safety check: If still insufficient, keep adding vehicles until demand is met
            while allocated_capacity < depot_demand and len(vehicles_copy) > 0:
                # Find largest remaining vehicle
                largest_vehicle = max(vehicles_copy, key=lambda v: v.get("capacity_pallets", 26))
                depot_vehicles[depot_id].append(largest_vehicle)
                allocated_capacity += largest_vehicle.get("capacity_pallets", 26)
                vehicles_copy.remove(largest_vehicle)
                print(f"[OR-Tools]   {depot_name}: Added vehicle to meet demand (new capacity: {allocated_capacity})")

        # Distribute remaining vehicles to depots with customers
        if vehicles_copy:
            print(f"[OR-Tools] Distributing {len(vehicles_copy)} remaining vehicles...")
            for vehicle in vehicles_copy:
                # Find depot with most customers that still needs vehicles
                for depot_id in sorted_depot_ids:
                    if len(depot_assignments[depot_id]) > 0:
                        depot_vehicles[depot_id].append(vehicle)
                        break

        # Step 3: Optimize each depot independently
        all_routes = []
        total_distance = 0
        depot_summaries = []

        for depot in depots:
            depot_id = depot["id"]
            assigned_customers = depot_assignments[depot_id]
            assigned_vehicles = depot_vehicles.get(depot_id, [])

            # Skip depots with no customers or vehicles
            if len(assigned_customers) == 0:
                print(f"[OR-Tools] Skipping depot {depot.get('name', depot_id)} (no customers)")
                continue

            if len(assigned_vehicles) == 0:
                print(f"[OR-Tools] WARNING: Depot {depot.get('name', depot_id)} has customers but no vehicles!")
                continue

            print(f"[OR-Tools] Optimizing depot: {depot.get('name', depot_id)}")
            print(f"[OR-Tools]   Customers: {len(assigned_customers)}, Vehicles: {len(assigned_vehicles)}")

            # Optimize this depot
            depot_result = _optimize_single_depot(
                depot,
                depots,
                assigned_customers,
                assigned_vehicles,
                fuel_price,
                config
            )

            # Add routes from this depot
            all_routes.extend(depot_result["routes"])
            total_distance += depot_result["summary"]["total_distance_km"]

            depot_summaries.append({
                "depot_id": depot_id,
                "depot_name": depot.get("name", depot_id),
                "customers": len(assigned_customers),
                "routes": len(depot_result["routes"]),
                "distance_km": depot_result["summary"]["total_distance_km"],
                "vehicles_used": depot_result["summary"]["total_vehicles_used"]
            })

        elapsed = time.time() - start_time

        print(f"[OR-Tools] ========== MULTI-DEPOT OPTIMIZATION COMPLETE ==========")
        print(f"[OR-Tools] Total routes: {len(all_routes)} across {len(depot_summaries)} depots")
        print(f"[OR-Tools] Total distance: {round(total_distance, 2)} km")
        print(f"[OR-Tools] Computation time: {elapsed:.2f}s")

        # Calculate total costs
        total_fuel_cost = sum(r["fuel_cost"] for r in all_routes)
        total_distance_cost = sum(r["distance_cost"] for r in all_routes)
        total_fixed_cost = sum(r["fixed_cost"] for r in all_routes)
        total_toll_cost = sum(r["toll_cost"] for r in all_routes)
        total_cost = sum(r["total_cost"] for r in all_routes)

        return {
            "routes": all_routes,
            "summary": {
                "total_routes": len(all_routes),
                "total_distance_km": round(total_distance, 2),
                "total_vehicles_used": len(all_routes),
                "total_depots_used": len(depot_summaries),
                "total_fuel_cost": round(total_fuel_cost, 2),
                "total_distance_cost": round(total_distance_cost, 2),
                "total_fixed_cost": round(total_fixed_cost, 2),
                "total_toll_cost": round(total_toll_cost, 2),
                "total_cost": round(total_cost, 2),
                "algorithm": "OR-Tools Multi-Depot",
                "computation_time_seconds": round(elapsed, 2),
                "depot_breakdown": depot_summaries
            }
        }

    except Exception as e:
        print(f"[OR-Tools] ERROR during multi-depot optimization: {e}")
        raise e
