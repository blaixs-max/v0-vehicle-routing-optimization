-- Seed: Adana Müşterileri (İzmir Deposuna Atanmış)
-- 23 adet Adana bölgesi müşterisi
-- Araç Tipi: 3=kamyon_2 (18 palet), 4=tir (32 palet)

INSERT INTO customers (name, address, city, district, lat, lng, demand_pallets, demand_kg, priority, required_vehicle_type, assigned_depot_id, status) 
VALUES
  -- McDonald's Lokasyonları (Araç Tipi: 4=TIR)
  ('McD Adana Galleria', 'Galleria AVM', 'Adana', 'Seyhan', 36.991651, 35.330687, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Tepe', 'Tepe Mahallesi', 'Adana', 'Yüreğir', 37.016486, 35.243164, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Optimum', 'Optimum AVM', 'Adana', 'Seyhan', 36.990284, 35.339926, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Alparslan Türkeş', 'Alparslan Türkeş Bulvarı', 'Adana', 'Sarıçam', 37.042481, 35.284782, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Barajyolu', 'Barajyolu Caddesi', 'Adana', 'Yüreğir', 37.030528, 35.313914, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Türkmenbaşı', 'Türkmenbaşı Bulvarı', 'Adana', 'Sarıçam', 37.053778, 35.299746, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('McD Adana Bulvar Relo', 'Bulvar Relo', 'Adana', 'Sarıçam', 37.045480, 35.306791, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  
  -- IKEA Caffe Lokasyonları (Araç Tipi: 4=TIR)
  ('Ikea Adana Caffe Yerli', 'IKEA Mağazası', 'Adana', 'Yüreğir', 37.016486, 35.243164, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('Ikea Adana Caffe İthal', 'IKEA Mağazası', 'Adana', 'Yüreğir', 37.016486, 35.243164, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  
  -- OPET Petrol İstasyonları (Çoğu Araç Tipi: 4=TIR)
  ('OPET ADANA SEYHAN - AYTIM PTRL', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.992258, 35.316126, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA - MERYEM YESIL', 'Merkez Bölge', 'Adana', 'Sarıçam', 37.046376, 35.282304, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA SEYHAN - ERDOGANLAR', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.996077, 35.261718, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA SEYHAN - POLAT PTRL', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.997154, 35.249282, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('Opet Adana Seyhan-Alsevin Petrol', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 37.020958, 35.274092, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA CEYHAN – OZT', 'Ceyhan İlçesi', 'Adana', 'Ceyhan', 37.051629, 35.809875, 4, 3200, 3, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA SEYHAN – KARMA', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 37.029853, 35.294098, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA-ALISEROGLU PETROL', 'Merkez Bölge', 'Adana', 'Sarıçam', 37.048015, 35.262477, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('Opet Adana Yüreğir-İpekpt-Ozt', 'Yüreğir Bölgesi', 'Adana', 'Yüreğir', 36.979319, 35.434469, 4, 3200, 3, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPET ADANA-NF PETROL', 'Merkez Bölge', 'Adana', 'Yüreğir', 36.984537, 35.372871, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('OPETF ADANA KOZAN-YA-PET', 'Kozan İlçesi', 'Adana', 'Kozan', 37.370494, 35.825847, 4, 3200, 4, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('Opet Adana-Yalman Petrol', 'Merkez Bölge', 'Adana', 'Seyhan', 37.013812, 35.303297, 4, 3200, 2, 'tir', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  
  -- Chocolabs Lokasyonları (Araç Tipi: 3=Kamyon 2)
  ('Chocolabs Seyhan Adana', 'Seyhan Merkez', 'Adana', 'Seyhan', 36.999230, 35.320715, 3, 2400, 2, 'kamyon_2', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending'),
  ('Chocolabs Adana Çukurova', 'Çukurova Bölgesi', 'Adana', 'Sarıçam', 37.045574, 35.308803, 3, 2400, 2, 'kamyon_2', (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1), 'pending')
ON CONFLICT DO NOTHING;
