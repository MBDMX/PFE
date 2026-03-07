'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Status = 'operational' | 'maintenance' | 'breakdown';
type Machine = { id: number; name: string; reference: string; location: string; status: Status; healthScore: number };

const INIT: Machine[] = [
    { id: 1, name: 'Compresseur A1', reference: 'COMP-001', location: 'Atelier Nord', status: 'operational', healthScore: 85 },
    { id: 2, name: 'Tour CN-200', reference: 'TCN-200', location: 'Atelier Sud', status: 'maintenance', healthScore: 60 },
    { id: 3, name: 'Convoyeur B3', reference: 'CONV-003', location: 'Ligne B', status: 'operational', healthScore: 92 },
    { id: 4, name: 'Presse Hydraulique P5', reference: 'PH-005', location: 'Atelier Est', status: 'breakdown', healthScore: 15 },
];

const statusBadge: Record<Status, string> = { operational: 'badge badge-green', maintenance: 'badge badge-yellow', breakdown: 'badge badge-red' };
const statusLabel: Record<Status, string> = { operational: 'Opérationnel', maintenance: 'Maintenance', breakdown: 'En panne' };
const healthColor = (s: number) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';

const EMPTY = { name: '', reference: '', location: '', status: 'operational' as Status, healthScore: 100 };

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>(INIT);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Machine | null>(null);
    const [form, setForm] = useState(EMPTY);

    function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
    function openEdit(m: Machine) { setForm(m); setEditing(m); setOpen(true); }
    function save() {
        if (editing) {
            setMachines(ms => ms.map(m => m.id === editing.id ? { ...editing, ...form } : m));
        } else {
            setMachines(ms => [...ms, { id: Date.now(), ...form }]);
        }
        setOpen(false);
    }
    function del(id: number) { setMachines(ms => ms.filter(m => m.id !== id)); }

    return (
        <div>
            <div className="toolbar">
                <h1 className="page-header" style={{ margin: 0 }}>Machines</h1>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Ajouter</button>
            </div>

            <div className="card tbl-wrap">
                <table>
                    <thead>
                        <tr><th>Nom</th><th>Référence</th><th>Localisation</th><th>Statut</th><th>Santé</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {machines.map(m => (
                            <tr key={m.id}>
                                <td style={{ fontWeight: 600 }}>{m.name}</td>
                                <td style={{ color: 'var(--muted)' }}>{m.reference}</td>
                                <td>{m.location}</td>
                                <td><span className={statusBadge[m.status]}>{statusLabel[m.status]}</span></td>
                                <td style={{ width: 120 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="health-bar" style={{ flex: 1 }}>
                                            <div className="health-fill" style={{ width: `${m.healthScore}%`, background: healthColor(m.healthScore) }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: healthColor(m.healthScore) }}>{m.healthScore}%</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}><Pencil size={14} /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => del(m.id)}><Trash2 size={14} /></button>
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
                            <span className="modal-title">{editing ? 'Modifier machine' : 'Ajouter machine'}</span>
                            <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nom</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Référence</label>
                                <input className="form-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Localisation</label>
                            <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Statut</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}>
                                    <option value="operational">Opérationnel</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="breakdown">En panne</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Santé (%)</label>
                                <input className="form-input" type="number" min={0} max={100} value={form.healthScore} onChange={e => setForm({ ...form, healthScore: +e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 0.5 + 'rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
                            <button className="btn btn-primary" onClick={save}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
