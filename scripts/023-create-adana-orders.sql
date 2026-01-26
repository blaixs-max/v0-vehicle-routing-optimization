-- Adana Müşterileri için Siparişler
-- Her müşteri için palet miktarlarına göre sipariş oluşturma

INSERT INTO orders (id, customer_id, order_number, order_date, delivery_date, demand_pallet, priority, status)
SELECT 
  'order-' || c.id,
  c.id,
  'ADN-' || LPAD(ROW_NUMBER() OVER (ORDER BY c.name)::text, 4, '0'),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 days',
  pallets.quantity,
  'normal',
  'pending'
FROM (VALUES
  ('McD Adana Galleria', 10),
  ('McD Adana Tepe', 6),
  ('McD Adana Optimum', 8),
  ('McD Adana Alparslan Türkeş', 10),
  ('McD Adana Barajyolu', 6),
  ('Ikea Adana Caffe Yerli', 1),
  ('Ikea Adana Caffe İthal', 1),
  ('McD Adana Türkmenbaşı', 7),
  ('OPET ADANA SEYHAN - AYTIM PTRL', 1),
  ('OPET ADANA - MERYEM YESIL', 1),
  ('OPET ADANA SEYHAN - ERDOGANLAR', 1),
  ('OPET ADANA SEYHAN - POLAT PTRL', 1),
  ('Opet Adana Seyhan-Alsevin Petrol', 1),
  ('OPET ADANA CEYHAN – OZT', 1),
  ('OPET ADANA SEYHAN – KARMA', 1),
  ('McD Adana Bulvar Relo', 9),
  ('Chocolabs Seyhan Adana', 1),
  ('Chocolabs Adana Çukurova', 1),
  ('OPET ADANA-ALISEROGLU PETROL', 1),
  ('Opet Adana Yüreğir-İpekpt-Ozt', 1),
  ('OPET ADANA-NF PETROL', 1),
  ('OPETF ADANA KOZAN-YA-PET', 1),
  ('Opet Adana-Yalman Petrol', 1)
) AS pallets(customer_name, quantity)
JOIN customers c ON c.name = pallets.customer_name
WHERE c.city = 'Adana'
ON CONFLICT DO NOTHING;
