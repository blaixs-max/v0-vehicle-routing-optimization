#!/usr/bin/env python3
"""
Test script to verify vehicle count optimization logic
Run this BEFORE deploying to production to validate changes
"""

import math

def test_vehicle_optimization():
    """Test the vehicle limiting logic with different scenarios"""
    
    print("=" * 60)
    print("VEHICLE OPTIMIZATION LOGIC TEST")
    print("=" * 60)
    
    # Test scenarios
    scenarios = [
        {
            "name": "Low Demand (30 pallets)",
            "total_demand": 30,
            "max_capacity": 33,
            "available_vehicles": 50
        },
        {
            "name": "Medium Demand (60 pallets)",
            "total_demand": 60,
            "max_capacity": 33,
            "available_vehicles": 50
        },
        {
            "name": "High Demand (100 pallets)",
            "total_demand": 100,
            "max_capacity": 33,
            "available_vehicles": 50
        },
        {
            "name": "Very High Demand (200 pallets)",
            "total_demand": 200,
            "max_capacity": 33,
            "available_vehicles": 50
        },
        {
            "name": "Small Fleet (60 pallets, 3 vehicles)",
            "total_demand": 60,
            "max_capacity": 33,
            "available_vehicles": 3
        }
    ]
    
    for scenario in scenarios:
        print(f"\n{'=' * 60}")
        print(f"Scenario: {scenario['name']}")
        print(f"{'=' * 60}")
        print(f"Total Demand: {scenario['total_demand']} pallets")
        print(f"Max Vehicle Capacity: {scenario['max_capacity']} pallets")
        print(f"Available Vehicles: {scenario['available_vehicles']}")
        
        # Apply the NEW logic
        total_demand = scenario['total_demand']
        max_vehicle_capacity = scenario['max_capacity']
        available_vehicles = scenario['available_vehicles']
        
        # Calculate minimum vehicles needed
        min_vehicles_needed = math.ceil(total_demand / max_vehicle_capacity)
        
        # Add 20% buffer for inefficiency, but cap at reasonable limit
        optimal_vehicle_count = min(
            max(2, math.ceil(min_vehicles_needed * 1.2)),  # At least 2, +20% buffer
            available_vehicles,  # Don't exceed available
            6  # Hard cap at 6 vehicles maximum
        )
        
        print(f"\n✓ Min vehicles needed: {min_vehicles_needed}")
        print(f"✓ With 20% buffer: {math.ceil(min_vehicles_needed * 1.2)}")
        print(f"✓ After applying minimum (2): {max(2, math.ceil(min_vehicles_needed * 1.2))}")
        print(f"✓ OPTIMAL VEHICLE COUNT: {optimal_vehicle_count}")
        
        # Validation
        capacity_check = optimal_vehicle_count * max_vehicle_capacity
        print(f"\n📊 Total capacity with {optimal_vehicle_count} vehicles: {capacity_check} pallets")
        
        if capacity_check >= total_demand:
            print(f"✅ PASS: Capacity ({capacity_check}) >= Demand ({total_demand})")
        else:
            print(f"❌ FAIL: Capacity ({capacity_check}) < Demand ({total_demand})")
        
        # Expected routes
        print(f"\n🎯 Expected Routes: {optimal_vehicle_count}")
        
    print(f"\n{'=' * 60}")
    print("TEST COMPLETE")
    print(f"{'=' * 60}")
    print("\n✅ If all scenarios PASS, you're ready to deploy!")
    print("⚠️  If any FAIL, the logic needs adjustment.")

def test_fixed_cost_impact():
    """Show the impact of fixed cost increase"""
    
    print("\n\n" + "=" * 60)
    print("FIXED COST IMPACT ANALYSIS")
    print("=" * 60)
    
    print("\nOLD Fixed Cost: 10,000 units (~10 km equivalent)")
    print("NEW Fixed Cost: 50,000 units (~50 km equivalent)")
    print("\nImpact: 5x increase makes using extra vehicles MUCH more expensive")
    
    # Example calculation
    route_distance = 100  # km
    old_cost_per_vehicle = 10  # km equivalent
    new_cost_per_vehicle = 50  # km equivalent
    
    print(f"\nExample: 100 km route")
    print(f"  OLD: Route cost (100 km) + Vehicle cost (10 km) = 110 km total")
    print(f"  NEW: Route cost (100 km) + Vehicle cost (50 km) = 150 km total")
    print(f"  → Using an extra vehicle now costs 36% more!")
    
    print("\n✅ This strongly incentivizes the optimizer to minimize vehicle count")

if __name__ == "__main__":
    test_vehicle_optimization()
    test_fixed_cost_impact()
    
    print("\n\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("1. Review test results above")
    print("2. If all tests pass, commit changes to main branch")
    print("3. Railway will auto-deploy from main")
    print("4. Monitor first optimization in production")
    print("5. Check Railway logs for 'VEHICLE OPTIMIZATION' messages")
    print("=" * 60)
