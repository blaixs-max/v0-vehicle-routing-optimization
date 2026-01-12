from http.server import BaseHTTPRequestHandler
import json
import sys
from datetime import datetime, timedelta

# OR-Tools import
try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    import numpy as np
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not ORTOOLS_AVAILABLE:
            self.send_response(503)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'OR-Tools not available'
            }).encode())
            return

        # Read request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        try:
            result = optimize_vrp(data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e)
            }).encode())

def optimize_vrp(data):
    """Main VRP optimization logic"""
    customers = data['customers']
    vehicles = data['vehicles']
    depots = data['depots']
    settings = data.get('settings', {})
    
    num_vehicles = len(vehicles)
    depot_index = 0  # Single depot for now
    
    # Create routing model
    manager = pywrapcp.RoutingIndexManager(
        len(customers) + 1,  # +1 for depot
        num_vehicles,
        depot_index
    )
    routing = pywrapcp.RoutingModel(manager)
    
    # Distance callback
    distance_matrix = calculate_distance_matrix(customers, depots)
    
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(distance_matrix[from_node][to_node] * 1000)
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # Add capacity constraints
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        if from_node == 0:
            return 0
        return customers[from_node - 1]['demand_pallets']
    
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        [v['capacity_pallets'] for v in vehicles],
        True,  # start cumul to zero
        'Capacity'
    )
    
    # Search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 30
    
    # Solve
    solution = routing.SolveWithParameters(search_parameters)
    
    if solution:
        return extract_solution(manager, routing, solution, customers, vehicles, depots)
    else:
        raise Exception("No solution found")

def calculate_distance_matrix(customers, depots):
    """Calculate Euclidean distance matrix"""
    depot = depots[0]
    locations = [(depot['latitude'], depot['longitude'])]
    
    for customer in customers:
        locations.append((customer['latitude'], customer['longitude']))
    
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                lat1, lon1 = locations[i]
                lat2, lon2 = locations[j]
                # Haversine distance
                dlat = np.radians(lat2 - lat1)
                dlon = np.radians(lon2 - lon1)
                a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
                c = 2 * np.arcsin(np.sqrt(a))
                matrix[i][j] = 6371 * c  # Earth radius in km
    
    return matrix

def extract_solution(manager, routing, solution, customers, vehicles, depots):
    """Extract routes from solution"""
    routes = []
    total_distance = 0
    
    for vehicle_id in range(len(vehicles)):
        index = routing.Start(vehicle_id)
        route = {
            'vehicle_id': vehicle_id,
            'vehicle_plate': vehicles[vehicle_id]['plate'],
            'stops': [],
            'distance': 0,
            'load': 0
        }
        
        route_distance = 0
        
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            
            if node > 0:  # Not depot
                customer = customers[node - 1]
                route['stops'].append({
                    'customer_id': customer['id'],
                    'customer_name': customer['name'],
                    'demand': customer['demand_pallets'],
                    'sequence': len(route['stops']) + 1
                })
                route['load'] += customer['demand_pallets']
            
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id) / 1000
        
        if route['stops']:
            route['distance'] = round(route_distance, 2)
            total_distance += route_distance
            routes.append(route)
    
    return {
        'success': True,
        'routes': routes,
        'summary': {
            'total_routes': len(routes),
            'total_distance': round(total_distance, 2),
            'total_customers': sum(len(r['stops']) for r in routes)
        }
    }
