'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Camera, X, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { gmaoApi } from '../services/api';
import { useToast } from './ui/toast';

interface FaceLoginProps {
    onSuccess: (userData: any) => void;
}

export const FaceLogin = ({ onSuccess }: FaceLoginProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('Prêt');
    const { error } = useToast();

    // 1. Charge les modèles au montage (ou à l'ouverture)
    const loadModels = async () => {
        if (modelsLoaded) return;
        setStatus('loading');
        setMessage('Chargement de l\'IA...');
        try {
            console.log("🧠 FaceAPI: Chargement des modèles depuis /models...");
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            console.log("✅ FaceAPI: Modèles chargés avec succès (SSD)");
            setModelsLoaded(true);
            setStatus('idle');
            setMessage('IA Prête');
        } catch (err) {
            console.error("❌ FaceAPI Error:", err);
            error('Erreur', 'Impossible de charger les modèles IA.');
            setStatus('error');
        }
    };

    // 2. Démarre la caméra
    const startCamera = async () => {
        console.log("🔘 Click: Authentification Biométrique");
        setIsOpen(true);
        setStatus('loading');
        
        // On s'assure que les modèles sont chargés
        if (!modelsLoaded) await loadModels();

        try {
            console.log("📷 Accès caméra...");
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            console.log("✅ Caméra active");
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setStatus('scanning');
            setMessage('Analyse en cours...');
        } catch (err) {
            console.error("❌ Erreur accès caméra:", err);
            error('Erreur Caméra', 'Veuillez autoriser l\'accès à votre webcam.');
            setIsOpen(false);
        }
    };

    // 3. Boucle de détection
    useEffect(() => {
        let active = true;
        let timer: NodeJS.Timeout;

        const scan = async () => {
            if (!isOpen || !stream || !videoRef.current || !modelsLoaded || status === 'success' || !active) {
                return;
            }

            // Vérifier que la vidéo est prête à être lue
            if (videoRef.current.readyState < 2) {
                console.log("⏳ Vidéo en cours de chargement...");
                timer = setTimeout(scan, 200);
                return;
            }

            try {
                console.log("🔍 Analyse du flux vidéo...");
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection && active) {
                    console.log("👤 VISAGE DÉTECTÉ ! Score:", Math.round(detection.detection.score * 100), "%");
                    setMessage('Visage détecté !');
                    const descriptor = Array.from(detection.descriptor);
                    
                    try {
                        console.log("📡 Envoi direct à localhost:5000...");
                        const res = await axios.post('http://localhost:5000/api/face/login', { 
                            descriptor 
                        }, {
                            headers: { 'Content-Type': 'application/json' }
                        });
                        
                        if (res && res.data && res.data.access_token) {
                            console.log("🏆 AUTHENTIFICATION RÉUSSIE :", res.data.user.username);
                            setStatus('success');
                            setMessage(`Bienvenue ${res.data.user.name || res.data.user.username}`);
                            
                            localStorage.setItem('token', res.data.access_token);
                            localStorage.setItem('user', JSON.stringify(res.data.user));
                            
                            setTimeout(() => {
                                onSuccess(res.data.user);
                                closeScanner();
                            }, 1500);
                            return;
                        } else {
                            setMessage('Visage non reconnu');
                        }
                    } catch (axiosErr: any) {
                        console.error("🌐 Network Error:", axiosErr.message);
                        setMessage(axiosErr.response?.status === 401 ? 'Visage non reconnu (401)' : `Erreur: ${axiosErr.message}`);
                    }
                } else {
                    console.log("❓ Aucun visage détecté dans le cadre");
                }
            } catch (err) {
                console.error("💥 Erreur Scan:", err);
            }

            if (active) {
                timer = setTimeout(scan, 500); // Scan toutes les demi-secondes
            }
        };

        if (isOpen && stream && modelsLoaded) {
            console.log("🚀 Lancement du scanner intelligent");
            scan();
        }

        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [isOpen, stream, modelsLoaded]);

    const closeScanner = () => {
        console.log("🔐 Fermeture du scanner");
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
        setIsOpen(false);
        setStatus('idle');
    };

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={startCamera}
                className="w-full h-14 relative flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold overflow-hidden group shadow-lg"
            >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                    <Camera size={20} />
                </div>
                <span className="text-[0.7rem] uppercase tracking-[0.2em]">Authentification Biométrique</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl overflow-y-auto">
                    
                    {/* Guidance Header */}
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-full mb-4">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <h3 className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-blue-400">Scanner Biométrique</h3>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Authentification</h2>
                    </div>

                    <div className="relative w-full max-w-xl aspect-square sm:aspect-square bg-slate-900 border-2 border-blue-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)]">
                        
                        {/* Exit Button */}
                        <button onClick={closeScanner} className="absolute top-6 right-6 z-50 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                            <X size={24} />
                        </button>

                        {/* Scanner Content */}
                        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                            
                            {/* Video Stream */}
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                className={`w-full h-full object-cover transition-opacity duration-700 ${status === 'scanning' || status === 'success' ? 'opacity-60' : 'opacity-0'} grayscale-[0.4] scale-110`} 
                            />

                            {/* Perfect Circular Mask & HUD */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                                <div className="relative aspect-square h-full max-h-[400px] border-2 border-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]" />
                                    
                                    {/* Laser Scan Line (FULL CIRCLE) */}
                                    {status === 'scanning' && (
                                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_30px_rgba(59,130,246,1)] animate-[laser_3.5s_infinite_linear] z-20" />
                                    )}

                                    {/* HUD Accents */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
                                </div>

                                {/* Pulse Rings */}
                                {status === 'scanning' && (
                                    <>
                                        <div className="absolute aspect-square h-[85%] border border-blue-500/10 rounded-full animate-ping duration-[3000ms]" />
                                        <div className="absolute aspect-square h-[90%] border border-blue-500/5 rounded-full animate-ping duration-[4000ms]" />
                                    </>
                                )}
                            </div>

                            {/* Loadings */}
                            {(status === 'loading') && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
                                    <Loader2 className="animate-spin text-blue-500" size={48} />
                                    <p className="text-blue-400 uppercase font-black text-[0.6rem] tracking-[0.4em] animate-pulse">Encryption...</p>
                                </div>
                            )}

                            {/* Success Overlay */}
                            {status === 'success' && (
                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                    <div className="p-10 bg-slate-950/90 rounded-full border-4 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.6)]">
                                        <UserCheck size={100} className="text-emerald-400" />
                                    </div>
                                    <h2 className="text-white text-4xl font-black uppercase tracking-[0.4em] mt-12 animate-pulse">Accès Autorisé</h2>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Status */}
                    <div className="mt-10 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`size-3 rounded-full ${status === 'scanning' ? 'bg-blue-500 animate-pulse' : status === 'success' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400">{message}</span>
                        </div>
                        <p className="text-[0.6rem] text-slate-600 font-bold uppercase tracking-widest">GMAO PRO — Session Biométrique Sécurisée</p>
                    </div>

                    <style>{`
                        @keyframes laser {
                            0% { top: -10%; opacity: 0; }
                            10% { opacity: 1; }
                            90% { opacity: 1; }
                            100% { top: 110%; opacity: 0; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};
