-- Seed: Adana Müşterileri (İzmir Deposuna Atanmış)
-- 23 adet Adana bölgesi müşterisi
-- Araç Tipi: 3=kamyon_2 (18 palet), 4=tir (32 palet)

INSERT INTO customers (name, address, city, district, lat, lng, required_vehicle_type, service_duration_minutes, assigned_depot_id) 
VALUES
  -- McDonald's Lokasyonları (Araç Tipi: 4=TIR)
  ('McD Adana Galleria', 'Galleria AVM', 'Adana', 'Seyhan', 36.991651, 35.330687, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Tepe', 'Tepe Mahallesi', 'Adana', 'Yüreğir', 37.016486, 35.243164, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Optimum', 'Optimum AVM', 'Adana', 'Seyhan', 36.990284, 35.339926, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Alparslan Türkeş', 'Alparslan Türkeş Bulvarı', 'Adana', 'Sarıçam', 37.042481, 35.284782, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Barajyolu', 'Barajyolu Caddesi', 'Adana', 'Yüreğir', 37.030528, 35.313914, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Türkmenbaşı', 'Türkmenbaşı Bulvarı', 'Adana', 'Sarıçam', 37.053778, 35.299746, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('McD Adana Bulvar Relo', 'Bulvar Relo', 'Adana', 'Sarıçam', 37.045480, 35.306791, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  
  -- IKEA Caffe Lokasyonları (Araç Tipi: 4=TIR)
  ('Ikea Adana Caffe Yerli', 'IKEA Mağazası', 'Adana', 'Yüreğir', 37.016486, 35.243164, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('Ikea Adana Caffe İthal', 'IKEA Mağazası', 'Adana', 'Yüreğir', 37.016486, 35.243164, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  
  -- OPET Petrol İstasyonları (Çoğu Araç Tipi: 4=TIR)
  ('OPET ADANA SEYHAN - AYTIM PTRL', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.992258, 35.316126, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA - MERYEM YESIL', 'Merkez Bölge', 'Adana', 'Sarıçam', 37.046376, 35.282304, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA SEYHAN - ERDOGANLAR', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.996077, 35.261718, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA SEYHAN - POLAT PTRL', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 36.997154, 35.249282, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('Opet Adana Seyhan-Alsevin Petrol', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 37.020958, 35.274092, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA CEYHAN – OZT', 'Ceyhan İlçesi', 'Adana', 'Ceyhan', 37.051629, 35.809875, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA SEYHAN – KARMA', 'Seyhan Bölgesi', 'Adana', 'Seyhan', 37.029853, 35.294098, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA-ALISEROGLU PETROL', 'Merkez Bölge', 'Adana', 'Sarıçam', 37.048015, 35.262477, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('Opet Adana Yüreğir-İpekpt-Ozt', 'Yüreğir Bölgesi', 'Adana', 'Yüreğir', 36.979319, 35.434469, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPET ADANA-NF PETROL', 'Merkez Bölge', 'Adana', 'Yüreğir', 36.984537, 35.372871, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('OPETF ADANA KOZAN-YA-PET', 'Kozan İlçesi', 'Adana', 'Kozan', 37.370494, 35.825847, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('Opet Adana-Yalman Petrol', 'Merkez Bölge', 'Adana', 'Seyhan', 37.013812, 35.303297, 'tir', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  
  -- Chocolabs Lokasyonları (Araç Tipi: 3=Kamyon 2)
  ('Chocolabs Seyhan Adana', 'Seyhan Merkez', 'Adana', 'Seyhan', 36.999230, 35.320715, 'kamyon_2', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1)),
  ('Chocolabs Adana Çukurova', 'Çukurova Bölgesi', 'Adana', 'Sarıçam', 37.045574, 35.308803, 'kamyon_2', 15, (SELECT id FROM depots WHERE city = 'İzmir' LIMIT 1))
ON CONFLICT DO NOTHING;
