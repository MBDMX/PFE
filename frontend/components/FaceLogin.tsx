'use client';
/**
 * 🎓 JOUR 2 : AUTHENTIFICATION BIOMÉTRIQUE INSTANTANÉE (FACE RECOGNITION)
 * Ce composant gère l'authentification par reconnaissance faciale à l'aide de face-api.js.
 * 
 * Concepts Clés à valoriser en soutenance :
 * 1. Traitement côté client pur : La détection de visage et le calcul du "Face Descriptor" (vecteur de 128 nombres)
 *    sont faits localement sur le CPU/GPU du navigateur pour des raisons de confidentialité et de rapidité !
 * 2. Préchargement en arrière-plan : Les modèles de Deep Learning (SsdMobilenetv1 et Landmarks) et les visages 
 *    des utilisateurs sont préchargés dès l'affichage de l'écran de login pour un scan instantané sans lag.
 * 3. Distance Euclidienne : La ressemblance faciale est vérifiée via la comparaison des vecteurs.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Camera, X, Loader2, UserCheck, ShieldCheck, AlertCircle, Zap } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useToast } from './ui/toast';

// Profil facial contenant le nom, le rôle et les descripteurs faciaux enregistrés
interface FaceProfile {
    id: number;
    username: string;
    role: string;
    name: string;
    descriptors: number[][]; // Tableau de vecteurs de 128 dimensions pour chaque visage enregistré
}

interface FaceLoginProps {
    onSuccess: (userData: any) => void;
}

// ─── Global singletons — survive component re-renders ─────────────────────────
// These are module-level so they persist across the whole page session.
let modelsReady = false;
let modelsLoading = false;
let cachedProfiles: FaceProfile[] = [];
let cachedMatcher: faceapi.FaceMatcher | null = null;

const MODEL_URL = '/models';

// ─── Thresholds ───────────────────────────────────────────────────────────────
// face-api.js uses EUCLIDEAN distance (NOT cosine):
//   Same person    ≈ 0.30–0.45
//   Different person ≈ 0.60–1.0
const MATCH_THRESHOLD  = 0.55;   // Euclidean — tolerant to lighting/angle variation
const MIN_CONFIRM_HITS = 1;      // 1 frame = INSTANT login
const SCAN_INTERVAL_MS = 100;    // 100ms = 10fps detection loop
const MIN_CONFIDENCE   = 0.50;   // Relaxed for max speed
const MIN_GAP          = 0.08;   // Gap between 1st and 2nd best match

// ─── Preload function — called BEFORE scanner opens ───────────────────────────
async function preloadFaceEngine(): Promise<void> {
    if (modelsReady && cachedProfiles.length > 0 && cachedMatcher) return;
    if (modelsLoading) return;
    modelsLoading = true;
    try {
        // Load AI models in parallel
        if (!modelsReady) {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            modelsReady = true;
        }
        // Load face profiles from backend
        const { data: profiles } = await api.get<FaceProfile[]>('/face/descriptors');
        cachedProfiles = profiles;
        // Pre-build the FaceMatcher so it's ready instantly when scanner opens
        if (profiles.length > 0) {
            const labeled = profiles.map(p =>
                new faceapi.LabeledFaceDescriptors(
                    String(p.id),
                    p.descriptors.map(d => new Float32Array(d))
                )
            );
            cachedMatcher = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
        }
    } catch (err) {
        console.warn('FaceEngine preload failed:', err);
    } finally {
        modelsLoading = false;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
export const FaceLogin = ({ onSuccess }: FaceLoginProps) => {
    const videoRef   = useRef<HTMLVideoElement>(null);
    const streamRef  = useRef<MediaStream | null>(null);
    const activeRef  = useRef(false);

    const [isOpen,  setIsOpen]  = useState(false);
    const [status,  setStatus]  = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [engineReady, setEngineReady] = useState(false);

    const { error: toastError } = useToast();

    // ── Preload IMMEDIATELY on mount — not when user clicks ───────────────────
    useEffect(() => {
        preloadFaceEngine().then(() => {
            setEngineReady(modelsReady && cachedProfiles.length > 0);
        });
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => () => stopStream(), []);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    // ── Open scanner — near-instant because everything is preloaded ───────────
    const openScanner = async () => {
        setIsOpen(true);
        activeRef.current = true;

        // Ensure preload finished (should already be done)
        if (!modelsReady || cachedProfiles.length === 0 || !cachedMatcher) {
            setStatus('loading');
            setMessage('Chargement...');
            await preloadFaceEngine();
            if (!modelsReady || !cachedMatcher) {
                setStatus('error');
                setMessage('Aucun profil facial enregistré');
                return;
            }
        }

        // Security check
        if (!navigator.mediaDevices?.getUserMedia) {
            toastError('Non sécurisé', 'La caméra nécessite HTTPS ou localhost.');
            setIsOpen(false);
            return;
        }

        try {
            // Start camera (only takes ~200ms after permission granted)
            setStatus('loading');
            setMessage('Activation caméra...');
            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = s;
            if (videoRef.current) videoRef.current.srcObject = s;

            // Start scanning immediately
            setStatus('scanning');
            setMessage('Regardez la caméra...');
        } catch (err) {
            console.error(err);
            toastError('Erreur', 'Impossible d\'accéder à la caméra');
            setStatus('error');
            setMessage('Erreur caméra');
        }
    };

    const closeScanner = useCallback(() => {
        activeRef.current = false;
        stopStream();
        setIsOpen(false);
        setStatus('idle');
        setMessage('');
    }, []);

    // ── Scan loop ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || status !== 'scanning') return;

        let hitCount     = 0;
        let lastUserId: string | null = null;
        let lastDesc: Float32Array | null = null;
        let done         = false;

        const scan = async () => {
            if (done || !activeRef.current) return;
            const vid = videoRef.current;
            const matcher = cachedMatcher;
            if (!vid || !matcher) return;

            // Wait for video to be ready
            if (vid.readyState < 2) {
                setTimeout(scan, 100);
                return;
            }

            try {
                const det = await faceapi
                    .detectSingleFace(vid, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_CONFIDENCE }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!det) {
                    if (hitCount > 0) {
                        hitCount = 0;
                        lastUserId = null;
                        setMessage('Regardez la caméra...');
                    }
                    if (!done) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // Find best match
                const best = matcher.findBestMatch(det.descriptor);

                // Anti-confusion: compute distance to 2nd-best candidate
                let gap = 1.0;
                if (cachedProfiles.length >= 2) {
                    const others = cachedProfiles
                        .filter(p => String(p.id) !== best.label)
                        .map(p => Math.min(...p.descriptors.map(d =>
                            faceapi.euclideanDistance(det.descriptor, new Float32Array(d))
                        )));
                    const secondDist = Math.min(...others);
                    gap = secondDist - best.distance;
                }

                if (best.label === 'unknown' || gap < MIN_GAP) {
                    hitCount   = 0;
                    lastUserId = null;
                    setMessage(best.label === 'unknown' ? 'Visage non reconnu' : 'Repositionnez votre visage...');
                    if (!done) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // Consecutive hit accumulation
                if (best.label === lastUserId) {
                    hitCount++;
                    lastDesc = det.descriptor;
                } else {
                    hitCount   = 1;
                    lastUserId = best.label;
                    lastDesc   = det.descriptor;
                }

                if (hitCount < MIN_CONFIRM_HITS) {
                    setMessage(`Analyse... ${hitCount}/${MIN_CONFIRM_HITS}`);
                    if (!done) setTimeout(scan, SCAN_INTERVAL_MS);
                    return;
                }

                // ✅ Match confirmed — request token immediately (no blink required)
                done = true;
                const profile = cachedProfiles.find(p => String(p.id) === best.label);
                setMessage(`Identification de ${profile?.name || 'utilisateur'}...`);

                try {
                    const { data } = await api.post('/face/token', {
                        user_id:    parseInt(best.label),
                        descriptor: Array.from(lastDesc!),
                    });

                    if (data?.access_token) {
                        setStatus('success');
                        setMessage(`Bienvenue ${data.user.name || data.user.username} !`);
                        localStorage.setItem('token', data.access_token);
                        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        // Redirect immediately — no artificial delay
                        onSuccess(data.user);
                    }
                } catch (tokenErr: any) {
                    const detail = tokenErr.response?.data?.detail ?? 'Vérification échouée';
                    setMessage(detail);
                    // Resume scanning after a brief pause
                    hitCount   = 0;
                    lastUserId = null;
                    lastDesc   = null;
                    done       = false;
                    setTimeout(scan, 1200);
                }

            } catch (err) {
                if (!done) setTimeout(scan, SCAN_INTERVAL_MS);
            }
        };

        scan();
        return () => { done = true; };
    }, [isOpen, status]);

    // ─────────────────────────────────────────────────────────────────────────
    const isBlinkMsg = message.includes('CLIGNEZ');

    return (
        <div className="w-full">
            {/* Trigger button — shows preload status */}
            <button
                type="button"
                onClick={openScanner}
                className="w-full h-14 relative flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold overflow-hidden group shadow-lg"
            >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                    {engineReady ? <Zap size={20} /> : <Camera size={20} />}
                </div>
                <span className="text-[0.7rem] uppercase tracking-[0.2em]">
                    {engineReady ? 'Connexion Biométrique Instantanée' : 'Authentification Biométrique'}
                </span>
                {engineReady && (
                    <div className="absolute right-4 size-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
            </button>

            {/* Scanner overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl overflow-y-auto">

                    {/* Header */}
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-full mb-4">
                            <ShieldCheck size={16} className="text-blue-400" />
                            <h3 className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-blue-400">
                                Scanner Biométrique
                            </h3>
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
                            <video
                                ref={videoRef}
                                autoPlay muted playsInline
                                className={`w-full h-full object-cover transition-opacity duration-500
                                    ${status === 'scanning' || status === 'success' ? 'opacity-60' : 'opacity-0'}
                                    scale-110`}
                            />

                            {/* Scanning HUD */}
                            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                                <div className="relative aspect-square h-full max-h-[400px] border-2 border-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]" />
                                    {status === 'scanning' && (
                                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_30px_rgba(59,130,246,1)] animate-[laser_2s_infinite_linear] z-20" />
                                    )}
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
                                    <button onClick={closeScanner} className="mt-4 px-6 py-2 bg-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition">
                                        Fermer
                                    </button>
                                </div>
                            )}

                            {/* Success */}
                            {status === 'success' && (
                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-in zoom-in duration-200">
                                    <div className="p-10 bg-slate-950/90 rounded-full border-4 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.6)]">
                                        <UserCheck size={100} className="text-emerald-400" />
                                    </div>
                                    <h2 className="text-white text-3xl font-black uppercase tracking-[0.3em] mt-10 text-center px-4">{message}</h2>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`size-3 rounded-full transition-colors duration-300
                                ${status === 'scanning'
                                    ? (isBlinkMsg ? 'bg-amber-500 animate-bounce' : 'bg-blue-500 animate-pulse')
                                    : status === 'success' ? 'bg-emerald-500'
                                    : status === 'error'   ? 'bg-red-500'
                                    : 'bg-slate-700'}`}
                            />
                            <span className={`text-sm font-black uppercase tracking-[0.3em] ${isBlinkMsg ? 'text-amber-400' : 'text-slate-400'}`}>
                                {message || 'Initialisation...'}
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
