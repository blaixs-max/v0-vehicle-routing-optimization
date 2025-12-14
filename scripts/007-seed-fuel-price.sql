-- Seed: Güncel Yakıt Fiyatı

INSERT INTO fuel_prices (fuel_type, price_per_liter, effective_date) VALUES
  ('diesel', 47.50, CURRENT_DATE)
ON CONFLICT DO NOTHING;
