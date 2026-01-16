#!/usr/bin/env python3
"""
Multi-Depot VRP Test Script

Tests the multi-depot optimization with 3 depots across Istanbul.
"""

import sys
import time
from ortools_optimizer_v2 import optimize_routes, OptimizerConfig

print("="*70)
print("Multi-Depot VRP Optimization Test")
print("="*70)

# Test configuration
config = OptimizerConfig(
    time_limit_seconds=30,
    search_strategy="SAVINGS",
    use_local_search=True,
    enable_time_windows=False
)

# 3 depots across Istanbul
depots = [
    {
        "id": "depot-1",
        "name": "Anadolu Depo (Asian Side)",
        "location": {"lat": 40.9924, "lng": 29.1253}  # Pendik
    },
    {
        "id": "depot-2",
        "name": "Avrupa Depo (European Side)",
        "location": {"lat": 41.0411, "lng": 28.9869}  # Şişli
    },
    {
        "id": "depot-3",
        "name": "Kuzey Depo (North)",
        "location": {"lat": 41.1600, "lng": 29.0200}  # Beykoz
    }
]

# 20 customers distributed across Istanbul
customers = [
    # Customers near Depot 1 (Pendik - Asian Side South)
    {"id": "c1", "name": "Müşteri 1 - Pendik", "location": {"lat": 40.9800, "lng": 29.1100}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c2", "name": "Müşteri 2 - Kartal", "location": {"lat": 40.9050, "lng": 29.1950}, "demand_pallets": 3, "business_type": "restaurant"},
    {"id": "c3", "name": "Müşteri 3 - Maltepe", "location": {"lat": 40.9364, "lng": 29.1268}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c4", "name": "Müşteri 4 - Tuzla", "location": {"lat": 40.8269, "lng": 29.3009}, "demand_pallets": 1, "business_type": "restaurant"},
    {"id": "c5", "name": "Müşteri 5 - Gebze", "location": {"lat": 40.7997, "lng": 29.4305}, "demand_pallets": 2, "business_type": "restaurant"},

    # Customers near Depot 2 (Şişli - European Side)
    {"id": "c6", "name": "Müşteri 6 - Şişli", "location": {"lat": 41.0550, "lng": 28.9870}, "demand_pallets": 3, "business_type": "restaurant"},
    {"id": "c7", "name": "Müşteri 7 - Beşiktaş", "location": {"lat": 41.0427, "lng": 29.0078}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c8", "name": "Müşteri 8 - Beyoğlu", "location": {"lat": 41.0351, "lng": 28.9773}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c9", "name": "Müşteri 9 - Bakırköy", "location": {"lat": 40.9802, "lng": 28.8696}, "demand_pallets": 3, "business_type": "restaurant"},
    {"id": "c10", "name": "Müşteri 10 - Fatih", "location": {"lat": 41.0204, "lng": 28.9496}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c11", "name": "Müşteri 11 - Eyüpsultan", "location": {"lat": 41.0504, "lng": 28.9221}, "demand_pallets": 1, "business_type": "restaurant"},

    # Customers near Depot 3 (Beykoz - North)
    {"id": "c12", "name": "Müşteri 12 - Beykoz", "location": {"lat": 41.1450, "lng": 29.0950}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c13", "name": "Müşteri 13 - Çekmeköy", "location": {"lat": 41.0325, "lng": 29.1850}, "demand_pallets": 3, "business_type": "restaurant"},
    {"id": "c14", "name": "Müşteri 14 - Ümraniye", "location": {"lat": 41.0175, "lng": 29.1247}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c15", "name": "Müşteri 15 - Üsküdar", "location": {"lat": 41.0236, "lng": 29.0151}, "demand_pallets": 2, "business_type": "restaurant"},

    # Additional scattered customers
    {"id": "c16", "name": "Müşteri 16 - Kadıköy", "location": {"lat": 40.9900, "lng": 29.0250}, "demand_pallets": 3, "business_type": "restaurant"},
    {"id": "c17", "name": "Müşteri 17 - Sarıyer", "location": {"lat": 41.1650, "lng": 29.0430}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c18", "name": "Müşteri 18 - Küçükçekmece", "location": {"lat": 41.0150, "lng": 28.7850}, "demand_pallets": 2, "business_type": "restaurant"},
    {"id": "c19", "name": "Müşteri 19 - Sultanbeyli", "location": {"lat": 40.9650, "lng": 29.2700}, "demand_pallets": 1, "business_type": "restaurant"},
    {"id": "c20", "name": "Müşteri 20 - Sancaktepe", "location": {"lat": 40.9950, "lng": 29.2350}, "demand_pallets": 2, "business_type": "restaurant"},
]

# 6 vehicles with different capacities
vehicles = [
    {"id": "v1", "type": 1, "capacity_pallets": 14, "fuel_consumption": 20.0, "plate": "34 ABC 01"},
    {"id": "v2", "type": 2, "capacity_pallets": 18, "fuel_consumption": 30.0, "plate": "34 ABC 02"},
    {"id": "v3", "type": 1, "capacity_pallets": 14, "fuel_consumption": 20.0, "plate": "34 ABC 03"},
    {"id": "v4", "type": 2, "capacity_pallets": 18, "fuel_consumption": 30.0, "plate": "34 ABC 04"},
    {"id": "v5", "type": 0, "capacity_pallets": 10, "fuel_consumption": 15.0, "plate": "34 ABC 05"},
    {"id": "v6", "type": 0, "capacity_pallets": 10, "fuel_consumption": 15.0, "plate": "34 ABC 06"},
]

fuel_price = 47.50

print("\nTest Configuration:")
print(f"  Depots: {len(depots)}")
print(f"  Customers: {len(customers)}")
print(f"  Vehicles: {len(vehicles)}")
print(f"  Total demand: {sum(c['demand_pallets'] for c in customers)} pallets")
print(f"  Total capacity: {sum(v['capacity_pallets'] for v in vehicles)} pallets")
print(f"  Fuel price: {fuel_price} TL/L")

print("\nDepot Locations:")
for depot in depots:
    print(f"  - {depot['name']}: ({depot['location']['lat']:.4f}, {depot['location']['lng']:.4f})")

print("\nStarting optimization...\n")

start_time = time.time()

try:
    result = optimize_routes(
        depots=depots,
        customers=customers,
        vehicles=vehicles,
        fuel_price=fuel_price,
        config=config
    )

    elapsed = time.time() - start_time

    print("\n" + "="*70)
    print("OPTIMIZATION RESULTS")
    print("="*70)

    summary = result["summary"]
    routes = result["routes"]

    print(f"\n📊 Summary:")
    print(f"  Total Routes: {summary['total_routes']}")
    print(f"  Total Distance: {summary['total_distance_km']:.2f} km")
    print(f"  Total Vehicles Used: {summary['total_vehicles_used']}")
    print(f"  Total Depots Used: {summary['total_depots_used']}")
    print(f"  Computation Time: {summary['computation_time_seconds']:.2f}s")

    print(f"\n💰 Cost Breakdown:")
    print(f"  Fuel Cost: {summary['total_fuel_cost']:.2f} TL")
    print(f"  Distance Cost: {summary['total_distance_cost']:.2f} TL")
    print(f"  Fixed Cost: {summary['total_fixed_cost']:.2f} TL")
    print(f"  Toll Cost: {summary['total_toll_cost']:.2f} TL")
    print(f"  TOTAL COST: {summary['total_cost']:.2f} TL")

    print(f"\n🏭 Depot Breakdown:")
    for depot_info in summary.get('depot_breakdown', []):
        print(f"  {depot_info['depot_name']}:")
        print(f"    - Customers: {depot_info['customers']}")
        print(f"    - Routes: {depot_info['routes']}")
        print(f"    - Distance: {depot_info['distance_km']:.2f} km")
        print(f"    - Vehicles: {depot_info['vehicles_used']}")

    print(f"\n🚚 Route Details:")
    for i, route in enumerate(routes, 1):
        print(f"\n  Route {i} - {route['plate']} (from {route['depot_name']})")
        print(f"    Distance: {route['distance_km']:.2f} km")
        print(f"    Stops: {len(route['stops'])}")
        print(f"    Total Pallets: {route['total_pallets']}")
        print(f"    Cost: {route['total_cost']:.2f} TL")
        print(f"    Stops:")
        for stop in route['stops']:
            print(f"      {stop['stopOrder']}. {stop['customer_name']} - {stop['demand']} pallets ({stop['distanceFromPrev']:.1f} km)")

    print("\n" + "="*70)
    print("✅ Multi-Depot Optimization SUCCESSFUL!")
    print("="*70)

    # Verification
    print("\n🔍 Verification:")
    total_customers_served = sum(len(r['stops']) for r in routes)
    print(f"  Total customers: {len(customers)}")
    print(f"  Customers served: {total_customers_served}")

    if total_customers_served == len(customers):
        print("  ✅ All customers served!")
    else:
        print(f"  ⚠️  Missing {len(customers) - total_customers_served} customers")

    # Check which depot each route belongs to
    depot_route_count = {}
    for route in routes:
        depot_id = route['depot_id']
        depot_route_count[depot_id] = depot_route_count.get(depot_id, 0) + 1

    print(f"\n  Routes per depot:")
    for depot in depots:
        count = depot_route_count.get(depot['id'], 0)
        print(f"    {depot['name']}: {count} routes")

except Exception as e:
    print(f"\n❌ Optimization FAILED!")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
