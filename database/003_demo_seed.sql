-- Dados de demonstração opcionais para ambiente local. Não executar em produção.
INSERT INTO gyms (name, slug) VALUES ('Academia Força Total', 'forca-total-demo') ON CONFLICT (slug) DO NOTHING;
INSERT INTO plans (gym_id, name, price, duration_days)
SELECT id, v.name, v.price, v.days FROM gyms CROSS JOIN (VALUES ('Plano Mensal',100.00,30),('Plano Trimestral',270.00,90),('Plano Semestral',500.00,180)) v(name,price,days)
WHERE slug='forca-total-demo' ON CONFLICT (gym_id,name) DO NOTHING;
