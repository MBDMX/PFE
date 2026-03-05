const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory data (replace with DB later)
const data = {
  users: [
    { id: 1, username: 'admin',   password: 'admin123',  role: 'admin',      name: 'Admin Principal' },
    { id: 2, username: 'manager', password: 'mgr123',    role: 'manager',    name: 'Chef Maintenance' },
    { id: 3, username: 'tech1',   password: 'tech123',   role: 'technician', name: 'Technicien #1' },
  ],
  machines: [
    { id: 1, name: 'Compresseur A1',      reference: 'COMP-001', location: 'Atelier Nord', status: 'operational', healthScore: 85 },
    { id: 2, name: 'Tour CN-200',          reference: 'TCN-200',  location: 'Atelier Sud',  status: 'maintenance', healthScore: 60 },
    { id: 3, name: 'Convoyeur B3',         reference: 'CONV-003', location: 'Ligne B',      status: 'operational', healthScore: 92 },
    { id: 4, name: 'Presse Hydraulique P5',reference: 'PH-005',   location: 'Atelier Est',  status: 'breakdown',   healthScore: 15 },
  ],
  workOrders: [
    { id: 1, title: 'Vidange compresseur',  machineId: 1, assignedTo: 3, priority: 'medium',   status: 'pending',      dueDate: '2026-03-10' },
    { id: 2, title: 'Remplacement courroie',machineId: 2, assignedTo: 3, priority: 'high',     status: 'in_progress',  dueDate: '2026-03-07' },
    { id: 3, title: 'Inspection convoyeur', machineId: 3, assignedTo: 3, priority: 'low',      status: 'done',         dueDate: '2026-02-28' },
    { id: 4, title: 'Réparation presse',    machineId: 4, assignedTo: 3, priority: 'critical', status: 'pending',      dueDate: '2026-03-06' },
  ],
  stock: [
    { id: 1, name: 'Filtre à huile',        reference: 'FH-100', quantity: 12, minQuantity: 5,  unit: 'unité' },
    { id: 2, name: 'Courroie trapézoïdale', reference: 'CT-205', quantity: 3,  minQuantity: 5,  unit: 'unité' },
    { id: 3, name: 'Joint torique 50mm',    reference: 'JT-050', quantity: 45, minQuantity: 10, unit: 'unité' },
    { id: 4, name: 'Graisse industrielle',  reference: 'GI-500', quantity: 8,  minQuantity: 5,  unit: 'kg'    },
  ],
};

// AUTH
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  const user = data.users.find(u => u.username === username && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: `mock-token-${user.id}` });
});

// MACHINES
app.get('/api/machines', (_, res) => res.json(data.machines));
app.post('/api/machines', (req, res) => {
  const m = { id: data.machines.length + 1, ...req.body };
  data.machines.push(m); res.status(201).json(m);
});
app.put('/api/machines/:id', (req, res) => {
  const i = data.machines.findIndex(m => m.id == req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  data.machines[i] = { ...data.machines[i], ...req.body };
  res.json(data.machines[i]);
});
app.delete('/api/machines/:id', (req, res) => {
  data.machines = data.machines.filter(m => m.id != req.params.id);
  res.json({ ok: true });
});

// WORK ORDERS
app.get('/api/work-orders', (_, res) => res.json(data.workOrders));
app.post('/api/work-orders', (req, res) => {
  const wo = { id: data.workOrders.length + 1, ...req.body };
  data.workOrders.push(wo); res.status(201).json(wo);
});
app.put('/api/work-orders/:id', (req, res) => {
  const i = data.workOrders.findIndex(w => w.id == req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  data.workOrders[i] = { ...data.workOrders[i], ...req.body };
  res.json(data.workOrders[i]);
});
app.delete('/api/work-orders/:id', (req, res) => {
  data.workOrders = data.workOrders.filter(w => w.id != req.params.id);
  res.json({ ok: true });
});

// STOCK
app.get('/api/stock', (_, res) => res.json(data.stock));
app.post('/api/stock', (req, res) => {
  const s = { id: data.stock.length + 1, ...req.body };
  data.stock.push(s); res.status(201).json(s);
});
app.put('/api/stock/:id', (req, res) => {
  const i = data.stock.findIndex(s => s.id == req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Not found' });
  data.stock[i] = { ...data.stock[i], ...req.body };
  res.json(data.stock[i]);
});
app.delete('/api/stock/:id', (req, res) => {
  data.stock = data.stock.filter(s => s.id != req.params.id);
  res.json({ ok: true });
});

// STATS
app.get('/api/stats', (_, res) => {
  res.json({
    totalMachines: data.machines.length,
    operational: data.machines.filter(m => m.status === 'operational').length,
    openOrders: data.workOrders.filter(w => w.status !== 'done').length,
    lowStock: data.stock.filter(s => s.quantity <= s.minQuantity).length,
  });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`GMAO API running on http://localhost:${PORT}`));
