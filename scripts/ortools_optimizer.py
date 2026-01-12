#!/usr/bin/env python3
"""
Google OR-Tools VRP Optimizer
Tüm kısıtları destekler: kapasite, zaman, mola, servis, araç tipi
"""

import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


def parse_time_constraint(constraint_text: str) -> Dict[str, Any]:
    """
    Zaman kısıtlarını parse et
    Örnek: "20:00 den önce verilemiyor" → {"after": "20:00"}
    """
    if not constraint_text or constraint_text.upper() == "HAYIR":
        return {"type": "none"}
    
    text = constraint_text.lower()
    
    # "20:00 den önce verilemiyor" → 20:00'dan sonra
    if "önce verilemiyor" in text or "once verilemiyor" in text:
        import re
        match = re.search(r'(\d{2}:\d{2})', text)
        if match:
            return {"type": "after", "time": match.group(1)}
    
    # "08:00-19:00 arası verilemiyor" → bu aralık yasak
    if "arası verilemiyor" in text or "arasi verilemiyor" in text:
        import re
        match = re.search(r'(\d{2}:\d{2})-(\d{2}:\d{2})', text)
        if match:
            return {"type": "forbidden", "start": match.group(1), "end": match.group(2)}
    
    # "Sadece Araç Tipi X girebilir" → araç kısıtı (burda değil)
    if "araç tipi" in text or "arac tipi" in text:
        return {"type": "vehicle_only"}
    
    return {"type": "none"}


def time_to_minutes(time_str: str) -> int:
    """Saat:dakika → dakikaya çevir (00:00'dan itibaren)"""
    h, m = map(int, time_str.split(':'))
    return h * 60 + m


def create_data_model(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Giriş verisini OR-Tools formatına çevir"""
    
    data = {}
    
    # Müşteriler (0 = depo)
    customers = input_data['customers']
    depot = input_data['depot']
    
    # Koordinatlar
    data['locations'] = [
        [depot['lat'], depot['lng']]
    ] + [[c['lat'], c['lng']] for c in customers]
    
    # Palet talepleri
    data['demands'] = [0] + [c['pallets'] for c in customers]
    
    # Araç kapasiteleri
    vehicles = input_data['vehicles']
    data['vehicle_capacities'] = [v['capacity_pallets'] for v in vehicles]
    data['vehicle_types'] = [v['type'] for v in vehicles]
    data['num_vehicles'] = len(vehicles)
    
    # Servis süreleri (dakika)
    business_service_times = {
        'MCD': 60,
        'IKEA': 45,
        'CHL': 30,
        'OPT': 30
    }
    data['service_times'] = [0] + [
        business_service_times.get(c.get('business', ''), 30) 
        for c in customers
    ]
    
    # Zaman kısıtları parse
    data['time_constraints'] = [{'type': 'none'}]  # Depo kısıt yok
    for c in customers:
        constraint = parse_time_constraint(c.get('special_constraint', ''))
        data['time_constraints'].append(constraint)
    
    # Araç tipi kısıtları
    data['vehicle_constraints'] = [None]  # Depo
    for c in customers:
        allowed = c.get('allowed_vehicle_types', None)
        data['vehicle_constraints'].append(allowed)
    
    # Mesafe matrisi (kuş uçuşu - ORS sonra düzeltir)
    data['distance_matrix'] = compute_distance_matrix(data['locations'])
    
    # Zaman matrisi (dakika, 50 km/h varsayım)
    data['time_matrix'] = [[d / 50 * 60 for d in row] for row in data['distance_matrix']]
    
    # Sürücü parametreleri
    data['max_drive_time'] = 4.5 * 60  # 4.5 saat = 270 dakika
    data['break_duration'] = 45  # 45 dakika
    data['max_total_time'] = 9 * 60 + 45  # 9h sürüş + 45dk mola = 585 dakika
    
    data['depot'] = 0
    
    return data


def compute_distance_matrix(locations: List[List[float]]) -> List[List[float]]:
    """Kuş uçuşu mesafe matrisi (km)"""
    from math import radians, cos, sin, asin, sqrt
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # Dünya yarıçapı (km)
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c
    
    n = len(locations)
    matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = haversine(
                    locations[i][0], locations[i][1],
                    locations[j][0], locations[j][1]
                )
    
    return matrix


def solve_vrp(data: Dict[str, Any]) -> Dict[str, Any]:
    """OR-Tools ile VRP çöz"""
    
    # Routing model oluştur
    manager = pywrapcp.RoutingIndexManager(
        len(data['distance_matrix']),
        data['num_vehicles'],
        data['depot']
    )
    routing = pywrapcp.RoutingModel(manager)
    
    # 1. MESAFE CALLBACK
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(data['distance_matrix'][from_node][to_node] * 100)  # cm'ye çevir
    
    distance_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_callback_index)
    
    # 2. KAPASİTE KISITI
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]
    
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],
        True,  # start cumul to zero
        'Capacity'
    )
    
    # 3. ZAMAN KISITI (Sürüş + Servis + Mola)
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_time = int(data['time_matrix'][from_node][to_node])
        service_time = data['service_times'][to_node]
        return travel_time + service_time
    
    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        60,  # 60 dakika slack (esneklik)
        int(data['max_total_time']),  # Max toplam süre
        False,
        'Time'
    )
    
    time_dimension = routing.GetDimensionOrDie('Time')
    
    # Zaman kısıtlarını ekle
    for node_idx in range(1, len(data['time_constraints'])):
        constraint = data['time_constraints'][node_idx]
        index = manager.NodeToIndex(node_idx)
        
        if constraint['type'] == 'after':
            # "20:00 sonrası" → En erken 20:00
            min_time = time_to_minutes(constraint['time'])
            time_dimension.CumulVar(index).SetMin(min_time)
        
        elif constraint['type'] == 'forbidden':
            # "08:00-19:00 yasak" → Bu aralıkta olamaz
            forbidden_start = time_to_minutes(constraint['start'])
            forbidden_end = time_to_minutes(constraint['end'])
            # OR-Tools'da yasak aralık zor, alternatif: erken veya geç
            time_dimension.CumulVar(index).RemoveInterval(forbidden_start, forbidden_end)
    
    # 4. ARAC TİPİ KISITI
    for node_idx in range(1, len(data['vehicle_constraints'])):
        allowed_types = data['vehicle_constraints'][node_idx]
        if allowed_types:
            index = manager.NodeToIndex(node_idx)
            # Bu müşteriyi sadece izin verilen araç tipleri ziyaret edebilir
            for vehicle_id in range(data['num_vehicles']):
                if data['vehicle_types'][vehicle_id] not in allowed_types:
                    routing.VehicleVar(index).RemoveValue(vehicle_id)
    
    # 5. SURUCU MOLA KISITI
    # 4.5 saat sonra 45 dk mola (OR-Tools break intervals)
    for vehicle_id in range(data['num_vehicles']):
        break_intervals = routing.GetBreakIntervalsOfVehicle(vehicle_id)
        break_intervals.append(
            pywrapcp.IntervalVar(
                routing.solver(),
                int(data['max_drive_time']),  # 4.5h sonra
                int(data['max_drive_time']),  # 4.5h sonra
                int(data['break_duration']),  # 45 dk süre
                int(data['break_duration']),  # 45 dk süre
                0,
                1,
                f'break_{vehicle_id}'
            )
        )
    
    # Arama parametreleri
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    
    # İlk çözüm stratejisi: En ucuz yay
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    
    # Local search: Guided Local Search (en iyi sonuç)
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    
    # Zaman limiti: 30 saniye (256 müşteri için yeterli)
    search_parameters.time_limit.seconds = 30
    
    # Solution limit: İlk 10 çözümü değerlendir
    search_parameters.solution_limit = 10
    
    # Log seviyesi: Sessiz (production için)
    search_parameters.log_search = False
    
    # Çöz
    solution = routing.SolveWithParameters(search_parameters)
    
    if not solution:
        return {"error": "Çözüm bulunamadı"}
    
    # Sonuçları çıkar
    routes = []
    total_distance = 0
    total_time = 0
    
    for vehicle_id in range(data['num_vehicles']):
        index = routing.Start(vehicle_id)
        route_distance = 0
        route_time = 0
        route_load = 0
        route_stops = []
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            
            if node_index != 0:  # Depo değilse
                route_stops.append({
                    'customer_index': node_index - 1,  # 0-indexed
                    'arrival_time': time_dimension.CumulVar(index).Min(),
                    'load': route_load
                })
            
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id) / 100
            route_load += data['demands'][manager.IndexToNode(index)]
        
        if route_stops:  # Boş rota değilse
            route_time = time_dimension.CumulVar(index).Min()
            routes.append({
                'vehicle_id': vehicle_id,
                'vehicle_type': data['vehicle_types'][vehicle_id],
                'stops': route_stops,
                'total_distance': route_distance,
                'total_time': route_time,
                'total_load': route_load
            })
            total_distance += route_distance
            total_time += route_time
    
    return {
        'routes': routes,
        'total_distance': total_distance,
        'total_time': total_time,
        'num_routes': len(routes),
        'algorithm': 'OR-Tools'
    }


def main():
    """Ana fonksiyon"""
    try:
        # JSON girdiyi oku (stdin'den)
        input_data = json.loads(sys.stdin.read())
        
        # Veriyi hazırla
        data = create_data_model(input_data)
        
        # Çöz
        result = solve_vrp(data)
        
        # JSON çıktı
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()
