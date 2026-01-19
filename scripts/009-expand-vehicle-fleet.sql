-- Expand vehicle fleet to 200 pallets capacity per depot
-- Adding new TIR and Kamyon vehicles to each depot

-- DEPOT-1 (Istanbul) - Adding 4 TIR + 1 Kamyon_1 (142 pallets)
INSERT INTO vehicles (id, plate, vehicle_type, capacity_pallets, capacity_kg, fuel_consumption_per_100km, cost_per_km, status, depot_id) VALUES
('v-10', '34 ABC 101', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-1'),
('v-11', '34 ABC 102', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-1'),
('v-12', '34 ABC 103', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-1'),
('v-13', '34 ABC 104', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-1'),
('v-14', '34 DEF 201', 'kamyon_1', 14, 10000.00, 22.0, 5.20, 'available', 'depot-1');

-- DEPOT-2 (Ankara) - Adding 4 TIR + 1 Kamyon_1 (142 pallets)
INSERT INTO vehicles (id, plate, vehicle_type, capacity_pallets, capacity_kg, fuel_consumption_per_100km, cost_per_km, status, depot_id) VALUES
('v-15', '06 GHI 101', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-2'),
('v-16', '06 GHI 102', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-2'),
('v-17', '06 GHI 103', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-2'),
('v-18', '06 GHI 104', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-2'),
('v-19', '06 JKL 201', 'kamyon_1', 14, 10000.00, 22.0, 5.20, 'available', 'depot-2');

-- DEPOT-3 (Izmir) - Adding 4 TIR + 1 Kamyon_2 (146 pallets)
INSERT INTO vehicles (id, plate, vehicle_type, capacity_pallets, capacity_kg, fuel_consumption_per_100km, cost_per_km, status, depot_id) VALUES
('v-20', '35 MNO 101', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-3'),
('v-21', '35 MNO 102', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-3'),
('v-22', '35 MNO 103', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-3'),
('v-23', '35 MNO 104', 'tir', 32, 25000.00, 35.0, 8.50, 'available', 'depot-3'),
('v-24', '35 PQR 201', 'kamyon_2', 18, 10000.00, 25.0, 6.00, 'available', 'depot-3');

-- Summary: 15 new vehicles added (13 TIR + 2 Kamyon)
-- New total capacity per depot:
-- Depot-1: 198 pallets (56 + 142)
-- Depot-2: 198 pallets (56 + 142)
-- Depot-3: 206 pallets (60 + 146)
-- System total capacity: 602 pallets
