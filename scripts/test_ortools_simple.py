#!/usr/bin/env python3
"""
Basit OR-Tools testi - v0 içinde çalışır
"""

import json
import sys

# Test datası
test_input = {
    "customers": [
        {"id": "1", "name": "MCD Galleria", "lat": 37.0, "lng": 35.3, "demand": 10, "business": "MCD", "time_constraint": None, "vehicle_types": [3, 4]},
        {"id": "2", "name": "IKEA Adana", "lat": 37.02, "lng": 35.32, "demand": 14, "business": "IKEA", "time_constraint": None, "vehicle_types": [4]},
        {"id": "3", "name": "Opet Seyhan", "lat": 36.99, "lng": 35.31, "demand": 8, "business": "OPT", "time_constraint": "after_20:00", "vehicle_types": [3, 4]},
    ],
    "vehicles": [
        {"id": "1", "capacity": 18, "type": 3, "fuel_consumption": 30},
        {"id": "2", "capacity": 32, "type": 4, "fuel_consumption": 35},
    ],
    "depot": {"lat": 37.0, "lng": 35.3},
    "fuel_price": 47.50
}

print("[v0] OR-Tools Test Başladı")
print(json.dumps(test_input, indent=2))
print("[v0] Test verisi hazır - 3 müşteri, 2 araç")
