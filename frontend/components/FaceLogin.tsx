'use client';

import { useRef, useState, useEffect } from 'react';
import api from '../services/api';
import { Camera, X, Loader2, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useToast } from './ui/toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FaceProfile {
    id: number;
    username: string;
    role: string;
    name: string;
    descriptors: number[][];
}

interface FaceLoginProps {
    onSuccess: (userData: any) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MODEL_URL        = '/models';
const MATCH_THRESHOLD  = 0.75;  // Local matching threshold (was 0.70)
const REQUIRED_HITS    = 1;     // Just 1 hit is enough now for maximum speed
const SCAN_INTERVAL_MS = 100;   // Scan every 100 ms - INSTANT
const MIN_CONFIDENCE   = 0.50;  // Face detection confidence (relaxed for speed)

// ─── Models singleton (loaded once for the whole session) ─────────────────────
let modelsReady = false;
async function ensureModels() {
    if (modelsReady) return;
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsReady = true;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const FaceLogin = ({ onSuccess }: FaceLoginProps) => {
    const videoRef  = useRef<HTMLVideoElement>(null);
    const matcherRef = useRef<faceapi.FaceMatcher | null>(null);
    const profilesRef = useRef<FaceProfile[]>([]);

    const [isOpen,  setIsOpen]  = useState(false);
    const [status,  setStatus]  = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('Prêt');
    const [stream,  setStream]  = useState<MediaStream | null>(null);

    const { error: toastError } = useToast();

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => () => { stopStream(); }, []);

    function stopStream() {
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
    }

    // ─── Preload on mount ─────────────────────────────────────────────────────
    useEffect(() => {
        const preload = async () => {
            try {
                await ensureModels();
                const { data: profiles } = await api.get<FaceProfile[]>('/face/descriptors');
                profilesRef.current = profiles;
            } catch (err) { console.error('Preload failed', err); }
        };
        preload();
    }, []);

    // ── Open scanner ──────────────────────────────────────────────────────────
    const openScanner = async () => {
        setIsOpen(true);
        setStatus('loading');

        try {
            // navigator.mediaDevices is only available in secure contexts (HTTPS or localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toastError('Contexte non sécurisé', 'La caméra nécessite HTTPS ou localhost. Accédez via http://localhost:3000');
                setIsOpen(false);
                return;
            }

            // 1. Load AI models (cached after first load)
            // Models and profiles are likely already loaded via useEffect
            await ensureModels();
            if (profilesRef.current.length === 0) {
                const { data: profiles } = await api.get<FaceProfile[]>('/face/descriptors');
                profilesRef.current = profiles;
            }

            if (profilesRef.current.length === 0) {
                setStatus('error');
                setMessage('Aucun profil facial enregistré');
                return;
            }

            const labeled = profilesRef.current.map(p =>
                new faceapi.LabeledFaceDescriptors(
                    String(p.id),
                    p.descriptors.map(d => new Float32Array(d))
                )
            );
            matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);

            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;

            setStatus('scanning');
            setMessage('Scanner actif');
        } catch (err: any) {
            toastError('Erreur', 'Impossible de démarrer le scanner');
            setStatus('error');
        }
    };

    // ── Close scanner ─────────────────────────────────────────────────────────
    const closeScanner = () => {
        stopStream();
        setIsOpen(false);
        setStatus('idle');
        setMessage('Prêt');
    };

    // ── Scan loop — pure client-side matching ─────────────────────────────────
    useEffect(() => {
        if (!isOpen || !stream || status !== 'scanning') return;

        let active      = true;
        let hitCount    = 0;
        let lastUserId: string | null = null;
        let lastDescriptor: Float32Array | null = null;
        let hasBlinked  = false; // Liveness check

        const getEAR = (eye: faceapi.FaceLandmarks68['getLeftEye' | 'getRightEye']) => {
            const p1 = eye[0], p2 = eye[1], p3 = eye[2], p4 = eye[3], p5 = eye[4], p6 = eye[5];
            const dist = (a: faceapi.Point, b: faceapi.Point) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
            return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
        };

        const scan = async () => {
            if (!active || !videoRef.current || !matcherRef.current) return;
            if (videoRef.current.readyState < 2) {
                if (active) setTimeout(scan, 150);
                return;
            }

            try {
                const det = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!det || !active) {
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // --- Blink Detection (Liveness) ---
                const leftEAR = getEAR(det.landmarks.getLeftEye());
                const rightEAR = getEAR(det.landmarks.getRightEye());
                const ear = (leftEAR + rightEAR) / 2;
                
                if (ear < 0.26) { // Seuil de clignement plus sensible
                    hasBlinked = true;
                }

                // Match locally
                const result = matcherRef.current.findBestMatch(det.descriptor);

                if (result.label === 'unknown') {
                    hitCount    = 0;
                    lastUserId  = null;
                    setMessage('Visage non reconnu');
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                if (result.label === lastUserId) {
                    hitCount++;
                } else {
                    hitCount = 1;
                    lastUserId = result.label;
                    lastDescriptor = det.descriptor;
                }

                if (hitCount < REQUIRED_HITS) {
                    setMessage(`Analyse... (${hitCount}/${REQUIRED_HITS})`);
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // Check liveness before proceeding
                if (!hasBlinked) {
                    setMessage('CLIGNEZ DES YEUX POUR VALIDER');
                    if (active) setTimeout(scan, 200);
                    return;
                }

                // ✅ Confirmed + Alive
                active = false;
                const profile = profilesRef.current.find(p => String(p.id) === result.label);
                setMessage(`Identification de ${profile?.name || 'utilisateur'}...`);

                try {
                    const { data } = await api.post('/face/token', {
                        user_id:    parseInt(result.label),
                        descriptor: Array.from(lastDescriptor!),
                    });

                    if (data?.access_token) {
                        setStatus('success');
                        setMessage(`Bienvenue ${data.user.name || data.user.username} !`);
                        localStorage.setItem('token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setTimeout(() => { onSuccess(data.user); closeScanner(); }, 300);
                    }
                } catch (tokenErr: any) {
                    const detail = tokenErr.response?.data?.detail ?? 'Erreur de vérification';
                    setMessage(detail);
                    // Resume scanning after a short pause
                    hitCount   = 0;
                    lastUserId = null;
                    active     = true;
                    setTimeout(scan, 1000);
                }

            } catch (err) {
                console.error('Scan error:', err);
                if (active) setTimeout(scan, SCAN_INTERVAL_MS);
            }
        };

        scan();
        return () => { active = false; };
    }, [isOpen, stream, status]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="w-full">
            {/* Trigger button */}
            <button
                type="button"
                onClick={openScanner}
                className="w-full h-14 relative flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold overflow-hidden group shadow-lg"
            >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                    <Camera size={20} />
                </div>
                <span className="text-[0.7rem] uppercase tracking-[0.2em]">Authentification Biométrique</span>
            </button>

            {/* Scanner overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl overflow-y-auto">

                    {/* Header */}
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-full mb-4">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <h3 className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-blue-400">Scanner Biométrique</h3>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Authentification</h2>
                    </div>

                    {/* Camera frame */}
                    <div className="relative w-full max-w-xl aspect-square bg-slate-900 border-2 border-blue-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.3)]">
                        <button
                            onClick={closeScanner}
                            className="absolute top-6 right-6 z-50 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                            {/* Live video */}
                            <video
                                ref={videoRef}
                                autoPlay muted playsInline
                                className={`w-full h-full object-cover transition-opacity duration-700
                                    ${status === 'scanning' || status === 'success' ? 'opacity-60' : 'opacity-0'}
                                    grayscale-[0.3] scale-110`}
                            />

                            {/* HUD overlay */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                                <div className="relative aspect-square h-full max-h-[400px] border-2 border-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]" />
                                    {status === 'scanning' && (
                                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_30px_rgba(59,130,246,1)] animate-[laser_2.5s_infinite_linear] z-20" />
                                    )}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
                                </div>
                                {status === 'scanning' && (
                                    <>
                                        <div className="absolute aspect-square h-[85%] border border-blue-500/10 rounded-full animate-ping duration-[3000ms]" />
                                        <div className="absolute aspect-square h-[90%] border border-blue-500/5  rounded-full animate-ping duration-[4500ms]" />
                                    </>
                                )}
                            </div>

                            {/* Loading */}
                            {status === 'loading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
                                    <Loader2 className="animate-spin text-blue-500" size={48} />
                                    <p className="text-blue-400 uppercase font-black text-[0.6rem] tracking-[0.4em] animate-pulse">{message}</p>
                                </div>
                            )}

                            {/* Error */}
                            {status === 'error' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
                                    <AlertCircle className="text-red-400" size={48} />
                                    <p className="text-red-400 font-black text-sm text-center px-8">{message}</p>
                                    <button
                                        onClick={closeScanner}
                                        className="mt-4 px-6 py-2 bg-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            )}

                            {/* Success */}
                            {status === 'success' && (
                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                    <div className="p-10 bg-slate-950/90 rounded-full border-4 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.6)]">
                                        <UserCheck size={100} className="text-emerald-400" />
                                    </div>
                                    <h2 className="text-white text-3xl font-black uppercase tracking-[0.3em] mt-10 text-center px-4">{message}</h2>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className="mt-10 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`size-3 rounded-full transition-colors duration-300
                                ${status === 'scanning' ? (message === 'CLIGNEZ DES YEUX POUR VALIDER' ? 'bg-amber-500 animate-bounce' : 'bg-blue-500 animate-pulse') :
                                  status === 'success'  ? 'bg-emerald-500' :
                                  status === 'error'    ? 'bg-red-500' :
                                  'bg-slate-700'}`}
                            />
                            <span className={`text-sm font-black uppercase tracking-[0.3em] transition-colors duration-300 ${message === 'CLIGNEZ DES YEUX POUR VALIDER' ? 'text-amber-400' : 'text-slate-400'}`}>
                                {message}
                            </span>
                        </div>
                        <p className="text-[0.6rem] text-slate-600 font-bold uppercase tracking-widest">GMAO PRO — Session Biométrique Sécurisée</p>
                    </div>

                    <style>{`
                        @keyframes laser {
                            0%   { top: -5%;  opacity: 0; }
                            10%  { opacity: 1; }
                            90%  { opacity: 1; }
                            100% { top: 105%; opacity: 0; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};
