#!/usr/bin/env python3
"""
OR-Tools optimizer test script
45 müşteri senaryosu ile test eder
"""

import json
import subprocess
import sys

# Test verisi: 45 müşteri (Adana bölgesi - MCD, IKEA, CHL, OPT)
test_input = {
    "depot": {
        "lat": 37.0,
        "lng": 35.32,
        "name": "Adana Merkez Depo"
    },
    "vehicles": [
        # Kamyonet (10 palet) - 9 adet
        {"id": 0, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 1, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 2, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 3, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 4, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 5, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 6, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 7, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        {"id": 8, "type": 1, "capacity_pallets": 10, "fuel_l_100km": 15},
        # Kamyon-1 (14 palet) - 9 adet
        {"id": 9, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 10, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 11, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 12, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 13, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 14, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 15, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 16, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        {"id": 17, "type": 2, "capacity_pallets": 14, "fuel_l_100km": 20},
        # Kamyon-2 (18 palet) - 9 adet
        {"id": 18, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 19, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 20, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 21, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 22, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 23, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 24, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 25, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        {"id": 26, "type": 3, "capacity_pallets": 18, "fuel_l_100km": 30},
        # TIR (32 palet) - 9 adet
        {"id": 27, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 28, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 29, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 30, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 31, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 32, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 33, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 34, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        {"id": 35, "type": 4, "capacity_pallets": 32, "fuel_l_100km": 35},
        # Romork (36 palet) - 9 adet
        {"id": 36, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 37, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 38, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 39, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 40, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 41, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 42, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 43, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
        {"id": 44, "type": 5, "capacity_pallets": 36, "fuel_l_100km": 40},
    ],
    "customers": [
        # MCD müşterileri (60 dk servis, bazıları sadece Kamyon-2 tip 3)
        {"lat": 36.991651, "lng": 35.308687, "pallets": 8, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": [4]},
        {"lat": 37.016486, "lng": 35.243164, "pallets": 6, "business": "MCD", "special_constraint": "22:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 36.990284, "lng": 35.339926, "pallets": 7, "business": "MCD", "special_constraint": "23:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.024281, "lng": 35.284782, "pallets": 5, "business": "MCD", "special_constraint": "20:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.030528, "lng": 35.313914, "pallets": 9, "business": "MCD", "special_constraint": "08:00-19:00 arası verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.045480, "lng": 35.306791, "pallets": 6, "business": "MCD", "special_constraint": "21:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        
        # IKEA müşterileri (45 dk servis, sadece Kamyon-2 tip 3)
        {"lat": 37.016486, "lng": 35.243164, "pallets": 12, "business": "IKEA", "special_constraint": "19:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.016486, "lng": 35.243164, "pallets": 10, "business": "IKEA", "special_constraint": "19:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.053778, "lng": 35.293746, "pallets": 14, "business": "IKEA", "special_constraint": "08:00-19:00 arası verilemiyor", "allowed_vehicle_types": [4]},
        
        # OPET müşterileri (30 dk servis, araç tipi serbest)
        {"lat": 36.992258, "lng": 35.316126, "pallets": 4, "business": "OPT", "special_constraint": "02:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.046376, "lng": 35.282304, "pallets": 5, "business": "OPT", "special_constraint": "02:15 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 36.996077, "lng": 35.261718, "pallets": 3, "business": "OPT", "special_constraint": "03:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 36.997154, "lng": 35.249282, "pallets": 4, "business": "OPT", "special_constraint": "03:15 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.020958, "lng": 35.274092, "pallets": 6, "business": "OPT", "special_constraint": "03:30 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.051629, "lng": 35.809875, "pallets": 5, "business": "OPT", "special_constraint": "05:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.029853, "lng": 35.294098, "pallets": 4, "business": "OPT", "special_constraint": "18:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 36.979319, "lng": 35.434469, "pallets": 7, "business": "OPT", "special_constraint": "18:40 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 36.984537, "lng": 35.372871, "pallets": 6, "business": "OPT", "special_constraint": "19:00 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.370494, "lng": 35.825847, "pallets": 5, "business": "OPT", "special_constraint": "19:15 den önce verilemiyor", "allowed_vehicle_types": [4]},
        {"lat": 37.013812, "lng": 35.303297, "pallets": 4, "business": "OPT", "special_constraint": "19:30 den önce verilemiyor", "allowed_vehicle_types": [4]},
        
        # Chocolabs müşterileri (30 dk servis, sadece Araç Tipi 3 girebilir)
        {"lat": 36.999230, "lng": 35.320715, "pallets": 8, "business": "CHL", "special_constraint": "22:00 den önce verilemiyor", "allowed_vehicle_types": [3]},
        {"lat": 37.045574, "lng": 35.308803, "pallets": 7, "business": "CHL", "special_constraint": "22:30 den önce verilemiyor", "allowed_vehicle_types": [3]},
        {"lat": 37.048015, "lng": 35.262477, "pallets": 6, "business": "CHL", "special_constraint": "18:30 den önce verilemiyor", "allowed_vehicle_types": [3]},
        
        # Ek müşteriler (kısıtsız)
        {"lat": 37.000000, "lng": 35.300000, "pallets": 5, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.010000, "lng": 35.310000, "pallets": 6, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.020000, "lng": 35.320000, "pallets": 4, "business": "OPT", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.030000, "lng": 35.330000, "pallets": 7, "business": "CHL", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.980000, "lng": 35.280000, "pallets": 8, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.990000, "lng": 35.290000, "pallets": 9, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.040000, "lng": 35.340000, "pallets": 5, "business": "OPT", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.050000, "lng": 35.350000, "pallets": 6, "business": "CHL", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.970000, "lng": 35.270000, "pallets": 4, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.960000, "lng": 35.260000, "pallets": 7, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.060000, "lng": 35.360000, "pallets": 8, "business": "OPT", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.070000, "lng": 35.370000, "pallets": 5, "business": "CHL", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.950000, "lng": 35.250000, "pallets": 6, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.940000, "lng": 35.240000, "pallets": 9, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.080000, "lng": 35.380000, "pallets": 4, "business": "OPT", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.090000, "lng": 35.390000, "pallets": 7, "business": "CHL", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.930000, "lng": 35.230000, "pallets": 8, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.920000, "lng": 35.220000, "pallets": 5, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.100000, "lng": 35.400000, "pallets": 6, "business": "OPT", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 37.110000, "lng": 35.410000, "pallets": 4, "business": "CHL", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.910000, "lng": 35.210000, "pallets": 7, "business": "MCD", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
        {"lat": 36.900000, "lng": 35.200000, "pallets": 8, "business": "IKEA", "special_constraint": "HAYIR", "allowed_vehicle_types": None},
    ]
}

def main():
    print("=" * 60)
    print("OR-TOOLS OPTIMIZER TEST")
    print("=" * 60)
    print(f"Müşteri sayısı: {len(test_input['customers'])}")
    print(f"Araç sayısı: {len(test_input['vehicles'])}")
    print(f"Toplam palet talebi: {sum(c['pallets'] for c in test_input['customers'])}")
    print("-" * 60)
    
    # Python script'i çağır
    print("\nOptimizasyon başlatılıyor...")
    try:
        result = subprocess.run(
            ['python3', 'scripts/ortools_optimizer.py'],
            input=json.dumps(test_input),
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            print(f"\n❌ HATA:")
            print(result.stderr)
            sys.exit(1)
        
        # Sonucu parse et
        output = json.loads(result.stdout)
        
        if 'error' in output:
            print(f"\n❌ Optimizasyon hatası: {output['error']}")
            sys.exit(1)
        
        # Sonuçları göster
        print("\n✅ OPTİMİZASYON BAŞARILI!")
        print("-" * 60)
        print(f"Toplam rota sayısı: {output['num_routes']}")
        print(f"Toplam mesafe: {output['total_distance']:.1f} km")
        print(f"Toplam süre: {output['total_time']:.0f} dakika ({output['total_time']/60:.1f} saat)")
        print(f"Algoritma: {output['algorithm']}")
        print("\n" + "=" * 60)
        print("ROTALAR:")
        print("=" * 60)
        
        for i, route in enumerate(output['routes'], 1):
            print(f"\nRota {i}:")
            print(f"  Araç ID: {route['vehicle_id']} (Tip {route['vehicle_type']})")
            print(f"  Duraklar: {len(route['stops'])}")
            print(f"  Mesafe: {route['total_distance']:.1f} km")
            print(f"  Süre: {route['total_time']} dk")
            print(f"  Yük: {route['total_load']} palet")
            print(f"  Durak listesi:")
            for stop in route['stops']:
                print(f"    - Müşteri #{stop['customer_index']} (Varış: {stop['arrival_time']} dk)")
        
        print("\n" + "=" * 60)
        print("TEST TAMAMLANDI")
        print("=" * 60)
        
    except subprocess.TimeoutExpired:
        print("\n❌ HATA: Optimizasyon 60 saniyede tamamlanamadı")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
