-- Seed Data

INSERT INTO users (username, password, role, name) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin Principal'),
('manager', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 'Chef Maintenance'),
('tech1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'technician', 'Technicien #1');

INSERT INTO machines (name, reference, location, status, health_score, last_maintenance) VALUES
('Compresseur A1', 'COMP-001', 'Atelier Nord', 'operational', 85, '2026-02-10'),
('Tour CN-200', 'TCN-200', 'Atelier Sud', 'maintenance', 60, '2026-01-20'),
('Convoyeur B3', 'CONV-003', 'Ligne B', 'operational', 92, '2026-02-28'),
('Presse Hydraulique P5', 'PH-005', 'Atelier Est', 'breakdown', 15, '2025-12-15');

INSERT INTO work_orders (title, machine_id, assigned_to, priority, status, description, due_date) VALUES
('Vidange compresseur', 1, 3, 'medium', 'pending', 'Effectuer vidange préventive', '2026-03-10'),
('Remplacement courroie', 2, 3, 'high', 'in_progress', 'Courroie de transmission usée', '2026-03-07'),
('Inspection convoyeur', 3, 3, 'low', 'done', 'Contrôle périodique mensuel', '2026-02-28'),
('Réparation presse', 4, 3, 'critical', 'pending', 'Panne hydraulique urgente', '2026-03-06');

INSERT INTO stock_items (name, reference, quantity, min_quantity, unit, location) VALUES
('Filtre à huile', 'FH-100', 12, 5, 'unité', 'Rayon A1'),
('Courroie trapézoïdale', 'CT-205', 3, 5, 'unité', 'Rayon B2'),
('Joint torique 50mm', 'JT-050', 45, 10, 'unité', 'Rayon A3'),
('Graisse industrielle', 'GI-500', 8, 5, 'kg', 'Rayon C1');
