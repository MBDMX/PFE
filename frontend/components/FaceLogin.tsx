'use client';

import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
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
const API_BASE         = 'http://localhost:5000/api';
const MODEL_URL        = '/models';
const MATCH_THRESHOLD  = 0.50;  // Local matching threshold (face-api FaceMatcher)
const REQUIRED_HITS    = 2;     // Must match same user 2× in a row before login
const SCAN_INTERVAL_MS = 500;   // Scan every 500 ms
const MIN_CONFIDENCE   = 0.65;  // Face detection confidence

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

    // ── Open scanner ──────────────────────────────────────────────────────────
    const openScanner = async () => {
        setIsOpen(true);
        setStatus('loading');
        setMessage('Chargement de l\'IA...');

        try {
            // navigator.mediaDevices is only available in secure contexts (HTTPS or localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toastError('Contexte non sécurisé', 'La caméra nécessite HTTPS ou localhost. Accédez via http://localhost:3000');
                setIsOpen(false);
                return;
            }

            // 1. Load AI models (cached after first load)
            await ensureModels();

            // 2. Fetch all face profiles from server (ONE request for the whole session)
            setMessage('Chargement des profils...');
            const { data: profiles } = await axios.get<FaceProfile[]>(`${API_BASE}/face/descriptors`);
            profilesRef.current = profiles;

            if (profiles.length === 0) {
                setStatus('error');
                setMessage('Aucun profil facial enregistré');
                return;
            }

            // 3. Build FaceMatcher from all profiles (client-side, no network)
            const labeled = profiles.map(p =>
                new faceapi.LabeledFaceDescriptors(
                    String(p.id),  // label = user id
                    p.descriptors.map(d => new Float32Array(d))
                )
            );
            matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);

            // 4. Start camera
            setMessage('Activation de la caméra...');
            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;

            setStatus('scanning');
            setMessage('Placez votre visage dans le cadre');
        } catch (err: any) {
            console.error('FaceLogin open error:', err);
            toastError('Erreur', err?.message ?? 'Impossible de démarrer le scanner');
            setStatus('error');
            setMessage('Erreur de démarrage');
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

        const scan = async () => {
            if (!active || !videoRef.current || !matcherRef.current) return;
            if (videoRef.current.readyState < 2) {
                if (active) setTimeout(scan, 200);
                return;
            }

            try {
                // Detect face + compute descriptor (all in-browser, no network)
                const det = await faceapi
                    .detectSingleFace(
                        videoRef.current,
                        new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!det || !active) {
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // Match against all profiles locally — zero network latency
                const result = matcherRef.current.findBestMatch(det.descriptor);

                if (result.label === 'unknown') {
                    hitCount    = 0;
                    lastUserId  = null;
                    setMessage('Visage non reconnu — repositionnez-vous');
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // Got a match — require REQUIRED_HITS consecutive confirmations
                if (result.label === lastUserId) {
                    hitCount++;
                } else {
                    hitCount       = 1;
                    lastUserId     = result.label;
                    lastDescriptor = det.descriptor;
                }

                const profile = profilesRef.current.find(p => String(p.id) === result.label);
                const displayName = profile?.name ?? result.label;

                if (hitCount < REQUIRED_HITS) {
                    setMessage(`Identification... (${hitCount}/${REQUIRED_HITS})`);
                    if (active) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // ✅ Confirmed — ask server for tokens (1 single request total)
                active = false; // Stop the loop
                setMessage(`Vérification de ${displayName}...`);

                try {
                    const { data } = await axios.post(`${API_BASE}/face/token`, {
                        user_id:    parseInt(result.label),
                        descriptor: Array.from(lastDescriptor!),
                    });

                    if (data?.access_token) {
                        setStatus('success');
                        setMessage(`Bienvenue ${data.user.name || data.user.username} !`);
                        localStorage.setItem('token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setTimeout(() => { onSuccess(data.user); closeScanner(); }, 1400);
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
                                ${status === 'scanning' ? 'bg-blue-500 animate-pulse' :
                                  status === 'success'  ? 'bg-emerald-500' :
                                  status === 'error'    ? 'bg-red-500' :
                                  'bg-slate-700'}`}
                            />
                            <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">{message}</span>
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
