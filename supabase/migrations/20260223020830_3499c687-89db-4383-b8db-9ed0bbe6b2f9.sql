
-- Backfill: Ensure dim_event_types exist for each tenant
INSERT INTO dim_event_types (tenant_id, name, category, description)
SELECT DISTINCT t.id, evt.name, evt.category, evt.description
FROM tenants t
CROSS JOIN (VALUES
  ('receivable_created', 'finance', 'Conta a receber criada'),
  ('payable_created', 'finance', 'Conta a pagar criada'),
  ('order_created', 'sales', 'Pedido criado'),
  ('deal_created', 'sales', 'Deal criado'),
  ('deal_won', 'sales', 'Deal ganho')
) AS evt(name, category, description)
WHERE NOT EXISTS (
  SELECT 1 FROM dim_event_types det WHERE det.tenant_id = t.id AND det.name = evt.name
);

-- Backfill receivables
INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, metadata)
SELECT r.tenant_id, det.id, r.created_at, r.amount,
  jsonb_build_object('source', 'backfill', 'receivable_id', r.id, 'description', r.description)
FROM receivables r
JOIN dim_event_types det ON det.tenant_id = r.tenant_id AND det.name = 'receivable_created'
WHERE NOT EXISTS (
  SELECT 1 FROM fact_events fe
  WHERE fe.tenant_id = r.tenant_id AND fe.event_type_id = det.id
    AND fe.metadata->>'receivable_id' = r.id::text
);

-- Backfill payables
INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, metadata)
SELECT p.tenant_id, det.id, p.created_at, p.amount,
  jsonb_build_object('source', 'backfill', 'payable_id', p.id, 'description', p.description)
FROM payables p
JOIN dim_event_types det ON det.tenant_id = p.tenant_id AND det.name = 'payable_created'
WHERE NOT EXISTS (
  SELECT 1 FROM fact_events fe
  WHERE fe.tenant_id = p.tenant_id AND fe.event_type_id = det.id
    AND fe.metadata->>'payable_id' = p.id::text
);

-- Backfill orders
INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, metadata)
SELECT o.tenant_id, det.id, o.created_at, o.total,
  jsonb_build_object('source', 'backfill', 'order_id', o.id, 'order_number', o.number)
FROM orders o
JOIN dim_event_types det ON det.tenant_id = o.tenant_id AND det.name = 'order_created'
WHERE NOT EXISTS (
  SELECT 1 FROM fact_events fe
  WHERE fe.tenant_id = o.tenant_id AND fe.event_type_id = det.id
    AND fe.metadata->>'order_id' = o.id::text
);

-- Backfill deals (deal_created)
INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, metadata)
SELECT d.tenant_id, det.id, d.created_at, COALESCE(d.estimated_value, 0),
  jsonb_build_object('source', 'backfill', 'deal_id', d.id, 'deal_name', d.name)
FROM deals d
JOIN dim_event_types det ON det.tenant_id = d.tenant_id AND det.name = 'deal_created'
WHERE NOT EXISTS (
  SELECT 1 FROM fact_events fe
  WHERE fe.tenant_id = d.tenant_id AND fe.event_type_id = det.id
    AND fe.metadata->>'deal_id' = d.id::text
);

-- Backfill deals (deal_won)
INSERT INTO fact_events (tenant_id, event_type_id, event_timestamp, value, metadata)
SELECT d.tenant_id, det.id, d.updated_at, COALESCE(d.estimated_value, 0),
  jsonb_build_object('source', 'backfill', 'deal_id', d.id, 'deal_name', d.name)
FROM deals d
JOIN dim_event_types det ON det.tenant_id = d.tenant_id AND det.name = 'deal_won'
WHERE d.status = 'won'
AND NOT EXISTS (
  SELECT 1 FROM fact_events fe
  WHERE fe.tenant_id = d.tenant_id AND fe.event_type_id = det.id
    AND fe.metadata->>'deal_id' = d.id::text
);
