'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

type Item = { id: number; name: string; reference: string; quantity: number; minQuantity: number; unit: string; location: string };

const INIT: Item[] = [
    { id: 1, name: 'Filtre à huile', reference: 'FH-100', quantity: 12, minQuantity: 5, unit: 'unité', location: 'Rayon A1' },
    { id: 2, name: 'Courroie trapézoïdale', reference: 'CT-205', quantity: 3, minQuantity: 5, unit: 'unité', location: 'Rayon B2' },
    { id: 3, name: 'Joint torique 50mm', reference: 'JT-050', quantity: 45, minQuantity: 10, unit: 'unité', location: 'Rayon A3' },
    { id: 4, name: 'Graisse industrielle', reference: 'GI-500', quantity: 8, minQuantity: 5, unit: 'kg', location: 'Rayon C1' },
];

const EMPTY = { name: '', reference: '', quantity: 0, minQuantity: 5, unit: 'unité', location: '' };

export default function StockPage() {
    const [items, setItems] = useState<Item[]>(INIT);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Item | null>(null);
    const [form, setForm] = useState(EMPTY);

    function openAdd() { setForm(EMPTY); setEditing(null); setOpen(true); }
    function openEdit(s: Item) { setForm(s); setEditing(s); setOpen(true); }
    function save() {
        if (editing) setItems(ss => ss.map(s => s.id === editing.id ? { ...editing, ...form } : s));
        else setItems(ss => [...ss, { id: Date.now(), ...form }]);
        setOpen(false);
    }
    function del(id: number) { setItems(ss => ss.filter(s => s.id !== id)); }

    const alerts = items.filter(s => s.quantity <= s.minQuantity);

    return (
        <div>
            <div className="toolbar">
                <h1 className="page-header" style={{ margin: 0 }}>Stock pièces détachées</h1>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Ajouter article</button>
            </div>

            {alerts.length > 0 && (
                <div className="card" style={{ background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertTriangle size={20} color="#ea580c" />
                    <span style={{ color: '#ea580c', fontWeight: 600 }}>
                        {alerts.length} article(s) en dessous du seuil minimum : {alerts.map(a => a.name).join(', ')}
                    </span>
                </div>
            )}

            <div className="card tbl-wrap">
                <table>
                    <thead>
                        <tr><th>Désignation</th><th>Référence</th><th>Quantité</th><th>Seuil min.</th><th>Unité</th><th>Localisation</th><th>Statut</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {items.map(s => {
                            const low = s.quantity <= s.minQuantity;
                            return (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ color: 'var(--muted)' }}>{s.reference}</td>
                                    <td style={{ fontWeight: 700, color: low ? '#ef4444' : 'var(--text)' }}>{s.quantity}</td>
                                    <td style={{ color: 'var(--muted)' }}>{s.minQuantity}</td>
                                    <td>{s.unit}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{s.location}</td>
                                    <td>
                                        {low
                                            ? <span className="badge badge-red">Stock bas</span>
                                            : <span className="badge badge-green">OK</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editing ? 'Modifier article' : 'Ajouter article'}</span>
                            <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Désignation</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Référence</label>
                                <input className="form-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Localisation</label>
                                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Quantité</label>
                                <input className="form-input" type="number" min={0} value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Seuil min.</label>
                                <input className="form-input" type="number" min={0} value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: +e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Unité</label>
                            <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
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
