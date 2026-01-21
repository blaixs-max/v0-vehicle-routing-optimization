-- Create settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Insert default settings
INSERT INTO settings (key, value, description, category) VALUES
  ('fuel_price_per_liter', '35.50', 'Yakıt fiyatı (TL/litre)', 'cost'),
  ('driver_cost_per_hour', '150.00', 'Sürücü maliyeti (TL/saat)', 'cost'),
  ('vehicle_maintenance_cost', '2.50', 'Araç bakım maliyeti (TL/km)', 'cost'),
  ('max_route_duration', '540', 'Maksimum rota süresi (dakika)', 'routing'),
  ('max_stops_per_route', '25', 'Rota başına maksimum durak', 'routing'),
  ('depot_start_time', '08:00', 'Depo başlangıç saati', 'time'),
  ('depot_end_time', '18:00', 'Depo bitiş saati', 'time'),
  ('service_time_per_stop', '10', 'Durak başına servis süresi (dakika)', 'time'),
  ('break_duration', '30', 'Mola süresi (dakika)', 'time'),
  ('break_after_hours', '4', 'Mola öncesi çalışma süresi (saat)', 'time'),
  ('osrm_url', '', 'OSRM sunucu URL', 'integration'),
  ('vroom_url', '', 'VROOM sunucu URL', 'integration'),
  ('n8n_webhook_url', '', 'N8N webhook URL', 'integration')
ON CONFLICT (key) DO NOTHING;

COMMIT;
