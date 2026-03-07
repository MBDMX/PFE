'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Priority = 'low' | 'medium' | 'high' | 'critical';
type WOStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
type WO = { id: number; title: string; machine: string; assignedTo: string; priority: Priority; status: WOStatus; dueDate: string };

const INIT: WO[] = [
    { id: 1, title: 'Vidange compresseur', machine: 'Compresseur A1', assignedTo: 'Technicien #1', priority: 'medium', status: 'pending', dueDate: '2026-03-10' },
    { id: 2, title: 'Remplacement courroie', machine: 'Tour CN-200', assignedTo: 'Technicien #1', priority: 'high', status: 'in_progress', dueDate: '2026-03-07' },
    { id: 3, title: 'Inspection convoyeur', machine: 'Convoyeur B3', assignedTo: 'Technicien #1', priority: 'low', status: 'done', dueDate: '2026-02-28' },
    { id: 4, title: 'Réparation presse', machine: 'Presse Hydraulique P5', assignedTo: 'Technicien #1', priority: 'critical', status: 'pending', dueDate: '2026-03-06' },
];

const sBadge: Record<WOStatus, string> = { pending: 'badge badge-yellow', in_progress: 'badge badge-blue', done: 'badge badge-green', cancelled: 'badge badge-gray' };
const sLabel: Record<WOStatus, string> = { pending: 'En attente', in_progress: 'En cours', done: 'Terminé', cancelled: 'Annulé' };
const pBadge: Record<Priority, string> = { low: 'badge badge-gray', medium: 'badge badge-blue', high: 'badge badge-orange', critical: 'badge badge-red' };
const pLabel: Record<Priority, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' };

const EMPTY = { title: '', machine: '', assignedTo: '', priority: 'medium' as Priority, status: 'pending' as WOStatus, dueDate: '' };

export default function WorkOrdersPage() {
    const [items, setItems] = useState<WO[]>(INIT);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<WO | null>(null);
    const [form, setForm] = useState(EMPTY);

    function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
    function openEdit(w: WO) { setForm(w); setEditing(w); setOpen(true); }
    function save() {
        if (editing) setItems(ws => ws.map(w => w.id === editing.id ? { ...editing, ...form } : w));
        else setItems(ws => [...ws, { id: Date.now(), ...form }]);
        setOpen(false);
    }
    function del(id: number) { setItems(ws => ws.filter(w => w.id !== id)); }

    return (
        <div>
            <div className="toolbar">
                <h1 className="page-header" style={{ margin: 0 }}>Ordres de travail</h1>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Créer un OT</button>
            </div>

            <div className="card tbl-wrap">
                <table>
                    <thead>
                        <tr><th>#</th><th>Titre</th><th>Machine</th><th>Assigné à</th><th>Priorité</th><th>Statut</th><th>Échéance</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {items.map(w => (
                            <tr key={w.id}>
                                <td style={{ color: 'var(--muted)', fontWeight: 600 }}>#{w.id}</td>
                                <td style={{ fontWeight: 600 }}>{w.title}</td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{w.machine}</td>
                                <td style={{ fontSize: '0.82rem' }}>{w.assignedTo}</td>
                                <td><span className={pBadge[w.priority]}>{pLabel[w.priority]}</span></td>
                                <td><span className={sBadge[w.status]}>{sLabel[w.status]}</span></td>
                                <td style={{ fontSize: '0.82rem' }}>{w.dueDate}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}><Pencil size={14} /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => del(w.id)}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editing ? 'Modifier OT' : 'Créer un OT'}</span>
                            <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Titre</label>
                            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Machine</label>
                                <input className="form-input" value={form.machine} onChange={e => setForm({ ...form, machine: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assigné à</label>
                                <input className="form-input" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Priorité</label>
                                <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                                    <option value="low">Faible</option><option value="medium">Moyen</option>
                                    <option value="high">Élevé</option><option value="critical">Critique</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Statut</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as WOStatus })}>
                                    <option value="pending">En attente</option><option value="in_progress">En cours</option>
                                    <option value="done">Terminé</option><option value="cancelled">Annulé</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date d'échéance</label>
                            <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
                            <button className="btn btn-primary" onClick={save}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
