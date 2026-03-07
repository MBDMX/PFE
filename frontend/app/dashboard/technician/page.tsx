'use client';
import { ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const stats = [
    { label: 'Mes OT', value: 4, icon: ClipboardList, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'En cours', value: 1, icon: Clock, color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Terminés', value: 3, icon: CheckCircle, color: '#10b981', bg: '#dcfce7' },
    { label: 'Urgents', value: 1, icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
];
const myOTs = [
    { id: 1, title: 'Vidange compresseur', machine: 'Compresseur A1', priority: 'medium', status: 'pending', due: '10/03' },
    { id: 2, title: 'Remplacement courroie', machine: 'Tour CN-200', priority: 'high', status: 'in_progress', due: '07/03' },
    { id: 3, title: 'Inspection convoyeur', machine: 'Convoyeur B3', priority: 'low', status: 'done', due: '28/02' },
    { id: 4, title: 'Réparation presse', machine: 'Presse Hydraulique P5', priority: 'critical', status: 'pending', due: '06/03' },
];
const statusBadge: Record<string, string> = { pending: 'badge badge-yellow', in_progress: 'badge badge-blue', done: 'badge badge-green' };
const priorityBadge: Record<string, string> = { medium: 'badge badge-blue', high: 'badge badge-orange', critical: 'badge badge-red', low: 'badge badge-gray' };
const statusLabel: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', done: 'Terminé' };
const priorityLabel: Record<string, string> = { medium: 'Moyen', high: 'Élevé', critical: 'Critique', low: 'Faible' };

export default function TechnicianDashboard() {
    return (
        <div>
            <h1 className="page-header">Tableau de bord — Technicien</h1>
            <div className="stat-grid">
                {stats.map(s => (
                    <div key={s.label} className="card stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}><s.icon size={22} color={s.color} /></div>
                        <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
                    </div>
                ))}
            </div>
            <div className="card">
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Mes ordres de travail</h2>
                <table>
                    <thead><tr><th>#</th><th>Titre</th><th>Machine</th><th>Priorité</th><th>Statut</th><th>Échéance</th></tr></thead>
                    <tbody>
                        {myOTs.map(o => (
                            <tr key={o.id}>
                                <td style={{ color: 'var(--muted)' }}>#{o.id}</td>
                                <td style={{ fontWeight: 600 }}>{o.title}</td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{o.machine}</td>
                                <td><span className={priorityBadge[o.priority]}>{priorityLabel[o.priority]}</span></td>
                                <td><span className={statusBadge[o.status]}>{statusLabel[o.status]}</span></td>
                                <td style={{ fontSize: '0.82rem' }}>{o.due}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
