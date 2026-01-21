-- Create initial orders for all existing customers
-- This creates pending orders for customers who don't have active orders yet

INSERT INTO orders (
  id,
  order_number,
  customer_id,
  order_date,
  delivery_date,
  demand_pallet,
  status,
  priority,
  notes
)
SELECT 
  'order-' || c.id || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD'),
  'ORD-' || LPAD(ROW_NUMBER() OVER (ORDER BY c.id)::text, 6, '0'),
  c.id,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  (RANDOM() * 20 + 5)::INTEGER, -- Random demand between 5-25 pallets
  'pending',
  'normal',
  'Auto-generated order for existing customer'
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.customer_id = c.id 
  AND o.status NOT IN ('completed', 'cancelled')
);

-- Show created orders count
SELECT COUNT(*) as created_orders_count FROM orders WHERE notes LIKE 'Auto-generated%';
