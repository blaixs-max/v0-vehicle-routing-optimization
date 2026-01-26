-- Seed: 3 Ana Depo (İstanbul, Ankara, İzmir)

INSERT INTO depots (name, city, address, lat, lng, capacity_pallets, status) VALUES
  ('İstanbul Ana Depo', 'İstanbul', 'Hadımköy Lojistik Merkezi, Arnavutköy', 41.1082, 28.7292, 2000, 'active'),
  ('Ankara Merkez Depo', 'Ankara', 'OSTİM Lojistik Bölgesi, Yenimahalle', 39.9738, 32.7560, 1500, 'active'),
  ('İzmir Ege Depo', 'İzmir', 'Kemalpaşa Organize Sanayi Bölgesi', 38.4650333, 27.3426415, 1200, 'active')
ON CONFLICT DO NOTHING;
