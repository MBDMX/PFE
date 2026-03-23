-- Seed Data

INSERT INTO users (username, email, password, role, name) VALUES
('admin', 'admin@gmao-pro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin Principal'),
('manager', 'manager@gmao-pro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 'Chef Maintenance'),
('tech1', 'tech1@gmao-pro.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'technician', 'Technicien #1');

INSERT INTO machines (name, reference, location, status, health_score, last_maintenance) VALUES
('Compresseur A1', 'COMP-001', 'Atelier Nord', 'operational', 85, '2026-02-10'),
('Tour CN-200', 'TCN-200', 'Atelier Sud', 'maintenance', 60, '2026-01-20'),
('Convoyeur B3', 'CONV-003', 'Ligne B', 'operational', 92, '2026-02-28'),
('Presse Hydraulique P5', 'PH-005', 'Atelier Est', 'breakdown', 15, '2025-12-15');

INSERT INTO work_orders (sap_order_id, title, description, type, priority, status, technical_location, equipment_id, team, technician_id, planned_start_date, planned_end_date) VALUES
('SAP-WO-1052', 'Vidange compresseur', 'Effectuer vidange préventive', 'preventive', 'medium', 'OPEN', 'Atelier Nord', 'COMP-001', 'Maint-Meca', 3, '2026-03-10', '2026-03-10'),
('SAP-WO-1053', 'Remplacement courroie', 'Courroie de transmission usée', 'corrective', 'high', 'IN_PROGRESS', 'Atelier Sud', 'TCN-200', 'Maint-Meca', 3, '2026-03-07', '2026-03-08'),
('SAP-WO-1054', 'Inspection convoyeur', 'Contrôle périodique mensuel', 'preventive', 'low', 'DONE', 'Ligne B', 'CONV-003', 'Maint-Elec', 3, '2026-02-28', '2026-02-28'),
('SAP-WO-1055', 'Réparation presse', 'Panne hydraulique urgente', 'corrective', 'high', 'OPEN', 'Atelier Est', 'PH-005', 'Maint-Hydrique', 3, '2026-03-06', '2026-03-07');

INSERT INTO work_order_parts (work_order_id, part_code, part_name, quantity) VALUES
(2, 'CT-B47', 'Courroie trapézoïdale B47', 1),
(1, 'FH-HYD-100', 'Filtre à huile hydraulique', 2),
(4, 'JT-NBR-50', 'Joint torique NBR 50x3mm', 4);

INSERT INTO stock_items (name, reference, quantity, unit, location, image, synonyms) VALUES
('Courroie trapézoïdale B47', 'CT-B47', 12, 'unité', 'Rayon A1', '/pieces/courroie.png', 'belt, bande, courroie moteur, trapeze belt'),
('Roulement à billes SKF 6205', 'SKF-6205', 8, 'unité', 'Rayon B2', '/pieces/roulement.png', 'bearing, palier, roulement moteur, ball bearing'),
('Filtre à huile hydraulique', 'FH-HYD-100', 25, 'unité', 'Rayon C1', '/pieces/filtre.png', 'oil filter, filtre, cartouche huile, hydraulic filter'),
('Joint torique NBR 50x3mm', 'JT-NBR-50', 150, 'unité', 'Rayon A3', '/pieces/joint.png', 'o-ring, joint caoutchouc, seal, bague étanchéité'),
('Vérin pneumatique FESTO', 'VP-FESTO-32', 4, 'unité', 'Rayon D1', '', 'cylinder, piston, vérin air, pneumatic actuator'),
('Graisse industrielle Mobilux', 'GR-MOB-EP2', 18, 'kg', 'Rayon C3', '', 'grease, lubrifiant, graissage, lubrication'),
('Capteur inductif M12 PNP', 'CI-M12-PNP', 15, 'unité', 'Rayon E2', '', 'sensor, détecteur, proximity, capteur approche'),
('Relais thermique Schneider', 'RT-SCH-6A', 6, 'unité', 'Rayon E1', '', 'thermal relay, protection moteur, overload, disjoncteur thermique');
