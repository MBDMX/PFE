'use client';
import { useRef, useState, useEffect } from 'react';
import { useFaceApi } from '../hooks/useFaceApi';
import { gmaoApi } from '../services/api';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from './ui/toast';

export const FaceEnroll = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { loadModels, modelsLoaded, loading: modelsLoading, getDescriptorFromVideo } = useFaceApi();
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [enrolling, setEnrolling] = useState(false);
    const { success, error } = useToast();

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setStatus('idle');
        } catch (err) {
            console.error('Erreur Camera:', err);
            error('Erreur Caméra', 'Impossible d\'accéder à votre webcam.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        loadModels();
        return () => stopCamera();
    }, []);

    const handleEnroll = async () => {
        if (!videoRef.current) return;
        setEnrolling(true);
        setStatus('scanning');

        try {
            const descriptor = await getDescriptorFromVideo(videoRef.current);
            if (!descriptor) {
                setStatus('error');
                error('Visage non détecté', 'Assurez-vous d\'être bien en face de la caméra.');
                return;
            }

            // Backend call
            const res = await fetch('http://localhost:4000/api/face/enroll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ descriptor })
            });

            if (res.ok) {
                setStatus('success');
                success('Visage enregistré', 'Votre authentification biométrique est active.');
                setTimeout(stopCamera, 2000);
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
            error('Erreur', 'Impossible d\'enregistrer le visage.');
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Camera size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight">Authentification Faciale</h3>
                    <p className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-widest">Sécurité Biométrique Premium</p>
                </div>
            </div>

            <div className="relative aspect-video bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center mb-6 shadow-2xl">
                {!stream && !modelsLoading && (
                    <button 
                        onClick={startCamera}
                        className="group flex flex-col items-center gap-3 text-slate-400 hover:text-white transition-all"
                    >
                        <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-all">
                            <Camera size={32} />
                        </div>
                        <span className="text-[0.65rem] font-black uppercase tracking-widest">Activer la caméra</span>
                    </button>
                )}

                {modelsLoading && (
                    <div className="flex flex-col items-center gap-3 text-blue-400">
                        <Loader2 size={32} className="animate-spin" />
                        <span className="text-[0.65rem] font-black uppercase tracking-widest animate-pulse">Chargement de l'IA...</span>
                    </div>
                )}

                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={`w-full h-full object-cover ${stream ? 'opacity-100' : 'opacity-0'}`} 
                />

                {status === 'scanning' && (
                    <div className="absolute inset-0 border-2 border-blue-500/50 animate-pulse flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-blue-400 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
                    </div>
                )}
                
                {status === 'success' && (
                    <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-500">
                        <div className="flex flex-col items-center gap-2 text-emerald-400">
                            <CheckCircle size={48} />
                            <span className="text-xs font-black uppercase tracking-widest">Enregistré !</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <p className="text-xs font-bold text-slate-300">Statut: {status === 'idle' ? 'Prêt' : status === 'scanning' ? 'Analyse...' : status === 'success' ? 'Activé' : 'Erreur'}</p>
                    <p className="text-[0.6rem] text-slate-500 mt-1">Vos données biométriques sont stockées sous forme de vecteur mathématique sécurisé.</p>
                </div>
                
                {stream && status !== 'success' && (
                    <button
                        onClick={handleEnroll}
                        disabled={enrolling || !modelsLoaded}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[0.65rem] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {enrolling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Enregistrer mon visage
                    </button>
                )}
            </div>
        </div>
    );
};
