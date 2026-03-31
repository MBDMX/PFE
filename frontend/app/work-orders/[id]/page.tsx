'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileText,
  MessageSquare,
  Paperclip,
  Check,
  MapPin,
  X,
  Loader2,
  Package,
  Plus,
} from 'lucide-react';
import { gmaoApi } from '@/services/api';
import { useToast } from '@/components/ui/toast';

// Use a mock ID for the UI, since we're not using real data yet
export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({ code: '', qty: 1 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oData, sData] = await Promise.all([
          gmaoApi.getWorkOrder(id),
          gmaoApi.getStock()
        ]);
        setOrder(oData);
        setStockItems(sData);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  async function markAsDone() {
    if (updating || !order) return;
    setUpdating(true);
    try {
      const res = await gmaoApi.updateWorkOrder(order.id, { status: 'done' });
      setOrder(res);
      const updates = (res as any)._stock_updates ?? [];
      if (updates.length > 0) {
        const parts = updates.map((u: any) => `${u.part} (−${u.deducted})`).join(', ');
        toastSuccess('OT terminé — Stock mis à jour', parts);
      } else {
        toastSuccess('OT marqué comme terminé');
      }
    } catch {
      // Global interceptor handles business errors
      console.error("Update failed");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddPart() {
    if (!newPart.code || newPart.qty < 1) return;
    try {
      await gmaoApi.addWorkOrderPart(order.id, {
        part_code: newPart.code,
        quantity: newPart.qty
      });
      // Refresh order to show new parts
      const updated = await gmaoApi.getWorkOrder(id);
      setOrder(updated);
      setShowAddPart(false);
      setNewPart({ code: '', qty: 1 });
      toastSuccess("Pièce ajoutée à l'OT");
    } catch (err) {
      console.error("Failed to add part");
    }
  }

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'open': return { label: 'Ouvert', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock };
      case 'in_progress': return { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Activity };
      case 'done': return { label: 'Terminé', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle };
      case 'closed': return { label: 'Clôturé', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: X };
      default: return { label: 'Inconnu', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Clock };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'low': return { label: 'Priorité Faible', color: 'text-slate-400', border: 'border-slate-500/30' };
      case 'medium': return { label: 'Priorité Moyenne', color: 'text-blue-400', border: 'border-blue-500/30' };
      case 'high': return { label: 'Priorité Élevée', color: 'text-orange-400', border: 'border-orange-500/30' };
      case 'critical': return { label: 'Priorité Critique', color: 'text-rose-400', border: 'border-rose-500/40 bg-rose-500/5' };
      default: return { label: priority || 'Normale', color: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };


  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin size-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center text-center px-4">
        <div className="size-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20">
          <AlertTriangle size={36} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ordre de travail introuvable</h2>
        <p className="text-slate-500 font-bold mt-2 mb-8">L'ID #{id} n'existe pas ou a été supprimé du système SAP.</p>
        <button onClick={() => router.push('/work-orders')} className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-xl font-bold border border-white/5 transition-all flex items-center gap-2 uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Retour à la liste
        </button>
      </div>
    );
  }

  const status = getStatusStyle(order.status);
  const priority = getPriorityStyle(order.priority);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/work-orders')}
          className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 shadow-inner"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            OT #{order.sap_order_id || order.id}
            <span className={`px-2 py-0.5 rounded-md border text-[0.6rem] font-black uppercase tracking-widest ${priority.border} ${priority.color}`}>
              {priority.label}
            </span>
          </h1>
          <p className="text-sm font-bold text-slate-500">{order.title}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className={`azure-badge ${status.bg} ${status.color} border px-4 py-2`}>
            <status.icon size={16} />
            <span className="uppercase tracking-widest font-black text-sm">{status.label}</span>
          </div>
          {/* Show action button only when not yet done/closed */}
          {order.status !== 'done' && order.status !== 'closed' && (
            <button
              onClick={markAsDone}
              disabled={updating}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
            >
              {updating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {updating ? 'Mise à jour…' : 'Marquer Terminé'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Details & Description */}
        <div className="lg:col-span-2 space-y-6">

          {/* Global Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="azure-card p-5 group flex items-start gap-4">
              <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 shadow-inner group-hover:bg-blue-900/40 transition-colors">
                <Wrench size={24} className="text-blue-400" />
              </div>
              <div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Équipement (SAP)</div>
                <div className="font-bold text-white leading-tight">{order.equipment_id}</div>
                <div className="text-xs text-blue-400 mt-1 font-bold">Ref: {order.serial_number || 'N/A'}</div>
              </div>
            </div>

            <div className="azure-card p-5 group flex items-start gap-4">
              <div className="size-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 shadow-inner group-hover:bg-indigo-900/40 transition-colors">
                <User size={24} className="text-indigo-400" />
              </div>
              <div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Responsable / Équipe</div>
                <div className="font-bold text-white leading-tight">{order.team || 'Équipe Centrale'}</div>
                <div className="text-xs text-indigo-400 mt-1 font-bold">Tech ID: {order.technician_id || '--'}</div>
              </div>
            </div>
          </div>

          {/* New Line: Location & Planned starts */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="azure-card p-4 flex items-center gap-4 bg-slate-900/40">
              <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20"><MapPin size={18} /></div>
              <div>
                <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Localisation Technique</div>
                <div className="text-sm font-bold text-white">{order.technical_location}</div>
              </div>
            </div>
            <div className="azure-card p-4 flex items-center gap-4 bg-slate-900/40">
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"><Calendar size={18} /></div>
              <div>
                <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Planification Initiale</div>
                <div className="text-sm font-bold text-white">{order.planned_start_date}</div>
              </div>
            </div>
          </div>

          {/* Description Block */}
          <div className="azure-card p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <FileText size={18} className="text-slate-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Description & Tâches</h2>
            </div>
            <div className="text-slate-300 font-medium leading-relaxed text-sm">
              {order.description}
            </div>

            {order.parts && order.parts.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <h3 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pièces de rechange consommées</h3>
                <div className="space-y-2">
                  {order.parts.map((p: any) => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20 font-black text-[0.6rem] shrink-0">
                          {p.part_code}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{p.part_name}</div>
                          <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            {p.unit_price_at_consumption ? `${p.unit_price_at_consumption.toFixed(3)} TND / Unité` : '0.000 TND / Unité'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center self-end sm:self-auto gap-4">
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-400">{((p.unit_price_at_consumption || 0) * p.quantity).toFixed(3)} TND</div>
                          <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Qté : {p.quantity}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center shadow-inner">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Coût Matériel Total
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {order.parts.reduce((sum: number, p: any) => sum + (p.quantity * (p.unit_price_at_consumption || 0)), 0).toFixed(3)} TND
                  </span>
                </div>
              </div>
            )}

            {/* Add Part Form */}
            <div className="mt-6 pt-6 border-t border-white/5">
              {!showAddPart ? (
                <button
                  onClick={() => setShowAddPart(true)}
                  className="w-full py-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Ajouter une pièce consommée
                </button>
              ) : (
                <div className="azure-card p-4 bg-slate-950/30 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest">Nouvelle Consommation</span>
                    <button onClick={() => setShowAddPart(false)}><X size={14} className="text-slate-500" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <select
                        value={newPart.code}
                        onChange={e => setNewPart({ ...newPart, code: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Sélectionner une pièce...</option>
                        {stockItems.map(item => (
                          <option key={item.id} value={item.reference}>{item.name} ({item.quantity} dispo)</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={newPart.qty}
                      onChange={e => setNewPart({ ...newPart, qty: Number(e.target.value) })}
                      className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                      placeholder="Qté"
                    />
                  </div>
                  <button
                    onClick={handleAddPart}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[0.65rem] uppercase tracking-widest transition-all"
                  >
                    Enregistrer la pièce
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <h3 className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-3">Notes & Travaux (Work Log)</h3>
              <div className="p-4 rounded-xl bg-slate-900/50 text-xs italic text-slate-400 leading-relaxed border border-white/5">
                {order.work_log || "Aucune note technique enregistrée pour le moment."}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Timeline & Meta */}
        <div className="space-y-6">

          {/* Timeline Card */}
          <div className="azure-card p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Clock size={18} className="text-slate-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Chronologie</h2>
            </div>

            <div className="relative pl-6 space-y-6 border-l-2 border-slate-800">

              {/* Created */}
              <div className="relative">
                <div className="absolute -left-[31px] bg-slate-800 border-2 border-slate-600 size-4 rounded-full mt-1"></div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Création</div>
                <div className="font-bold text-sm text-white">{order.created_at}</div>
              </div>

              {/* Planned */}
              <div className="relative">
                <div className="absolute -left-[31px] bg-blue-500 border-2 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] size-4 rounded-full mt-1"></div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Planification SAP</div>
                <div className="font-bold text-sm text-white">{order.planned_start_date}</div>
              </div>

              {/* Started */}
              <div className={order.actual_start_date ? 'relative' : 'relative opacity-40'}>
                <div className={`absolute -left-[31px] ${order.actual_start_date ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800 border-slate-600'} border-2 size-4 rounded-full mt-1`}></div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Début Réel</div>
                <div className="font-bold text-sm text-white">{order.actual_start_date || 'En attente'}</div>
              </div>

              {/* Ended */}
              <div className={order.actual_end_date ? 'relative' : 'relative opacity-40'}>
                <div className={`absolute -left-[31px] ${order.actual_end_date ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800 border-slate-600'} border-2 size-4 rounded-full mt-1`}></div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Fin Réelle</div>
                <div className="font-bold text-sm text-white">{order.actual_end_date || 'Non terminé'}</div>
              </div>

            </div>
          </div>

          <div className="azure-card p-6 border-dashed border-2 bg-slate-900/20 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Paperclip size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Documents & Photos</div>
              <div className="text-xs text-slate-500 mt-1">Aucun fichier joint pour le moment</div>
            </div>
            <button className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-4 py-2 rounded-lg">
              Ajouter un fichier
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
