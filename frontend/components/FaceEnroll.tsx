'use client';
import * as faceapi from 'face-api.js';
import { useRef, useState, useEffect } from 'react';
import { gmaoApi } from '../services/api';
import { Camera, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from './ui/toast';

type ScanStep = 'FRONT' | 'LEFT' | 'RIGHT' | 'SUCCESS';
const STEPS: ScanStep[] = ['FRONT', 'LEFT', 'RIGHT'];
const MODEL_URL = '/models';

// ─── Fix: use REF for descriptors to avoid stale closure in setInterval ────────
// useState inside setInterval always reads the INITIAL value (stale closure bug).
// useRef always reads the CURRENT value → correctly accumulates all 15 samples.

export const FaceEnroll = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // ── Refs (no stale closure) ───────────────────────────────────────────────
    const collectedRef    = useRef<number[][]>([]);  // all descriptors collected
    const currentStepRef  = useRef<ScanStep>('FRONT');
    const holdCountRef    = useRef(0);               // consecutive valid frames
    const samplesForStepRef = useRef(0);             // samples collected this step

    // ── State (for UI only) ───────────────────────────────────────────────────
    const [stream,       setStream]       = useState<MediaStream | null>(null);
    const [enrolling,    setEnrolling]    = useState(false);
    const [status,       setStatus]       = useState<'idle' | 'enrolling' | 'saving' | 'success' | 'error'>('idle');
    const [currentStep,  setCurrentStep]  = useState<ScanStep>('FRONT');
    const [progress,     setProgress]     = useState(0);       // 0-100
    const [totalCollected, setTotalCollected] = useState(0);   // for display
    const [feedback,     setFeedback]     = useState('Regardez droit devant la caméra');
    const [modelsLoading, setModelsLoading] = useState(false);

    const { success, error } = useToast();

    const SAMPLES_PER_STEP = 5; // 5 × 3 poses = 15 total
    const TOTAL_SAMPLES    = STEPS.length * SAMPLES_PER_STEP;
    const HOLD_FRAMES      = 2; // must hold pose for 2 consecutive frames

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()); }, [stream]);

    // ── Keep ref in sync with state (for setInterval to read) ─────────────────
    useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

    // ── Head pose from landmarks ──────────────────────────────────────────────
    const getHeadPose = (lm: faceapi.FaceLandmarks68) => {
        const nose  = lm.getNose()[0];
        const lEye  = lm.getLeftEye()[0];
        const rEye  = lm.getRightEye()[0];
        const midX  = (lEye.x + rEye.x) / 2;
        const midY  = (lEye.y + rEye.y) / 2;
        const fw    = Math.abs(rEye.x - lEye.x) || 1;
        return {
            h: (nose.x - midX) / fw,      // <0 = turned left, >0 = right
            v: (nose.y - midY) / fw,       // <0 = looking up, >0 = down
        };
    };

    // ── Pose validation — HORIZONTAL only (reliable on all PC webcams) ─────
    // Horizontal ratio h = (nose.x - eyeMidX) / faceWidth
    //   FRONT : h ≈ 0      (centered)
    //   LEFT  : h < 0      (nose shifted left)
    //   RIGHT : h > 0      (nose shifted right)
    // Vertical ratio is NOT used — it depends on camera angle & face shape
    // and is unreliable on desk/monitor webcams.
    const isPoseValid = (h: number, _v: number, step: ScanStep): boolean => {
        switch (step) {
            case 'FRONT': return Math.abs(h) < 0.18;  // centered
            case 'LEFT':  return h < -0.15;            // turned left
            case 'RIGHT': return h >  0.15;            // turned right
            default:      return false;
        }
    };

    // ── Start camera ──────────────────────────────────────────────────────────
    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                error('Erreur', 'Caméra non disponible (requiert HTTPS ou localhost)');
                return;
            }
            setModelsLoading(true);
            // Load models (face-api.js caches internally after 1st load)
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoading(false);

            const s = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;

            // Reset all collection state
            collectedRef.current      = [];
            holdCountRef.current      = 0;
            samplesForStepRef.current = 0;
            currentStepRef.current    = 'FRONT';
            setCurrentStep('FRONT');
            setProgress(0);
            setTotalCollected(0);
            setFeedback('Regardez droit devant la caméra');
            setStatus('enrolling');
            setEnrolling(true);

        } catch (err: any) {
            setModelsLoading(false);
            error('Erreur Caméra', 'Impossible d\'ouvrir la caméra');
            console.error(err);
        }
    };

    // ── Detection loop (setInterval + refs = no stale closure) ───────────────
    useEffect(() => {
        if (!enrolling) return;

        const interval = setInterval(async () => {
            const vid  = videoRef.current;
            const step = currentStepRef.current;

            if (!vid || step === 'SUCCESS') return;
            // readyState >= 2 means data is available (don't require 4)
            if (vid.readyState < 2) return;

            try {
                const det = await faceapi
                    .detectSingleFace(vid, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!det) {
                    holdCountRef.current = 0;
                    setFeedback('Aucun visage détecté — regardez la caméra');
                    return;
                }

                const { h, v } = getHeadPose(det.landmarks);

                if (!isPoseValid(h, v, step)) {
                    holdCountRef.current = 0;
                    setFeedback(getInstruction(step));
                    return;
                }

                // Pose is valid — wait for HOLD_FRAMES consecutive frames
                holdCountRef.current++;
                setFeedback(`Restez stable... (${holdCountRef.current}/${HOLD_FRAMES})`);

                if (holdCountRef.current < HOLD_FRAMES) return;

                // ── Capture sample ────────────────────────────────────────────
                holdCountRef.current = 0;
                collectedRef.current.push(Array.from(det.descriptor));
                samplesForStepRef.current++;

                const newTotal = collectedRef.current.length;
                setTotalCollected(newTotal); // triggers re-render for display

                if (samplesForStepRef.current < SAMPLES_PER_STEP) {
                    setFeedback(`✓ Échantillon ${samplesForStepRef.current}/${SAMPLES_PER_STEP}`);
                    return;
                }

                // ── Step complete ─────────────────────────────────────────────
                samplesForStepRef.current = 0;
                holdCountRef.current      = 0;

                const idx         = STEPS.indexOf(step);
                const newProgress = ((idx + 1) / STEPS.length) * 100;
                setProgress(newProgress);

                if (idx < STEPS.length - 1) {
                    const next = STEPS[idx + 1];
                    currentStepRef.current = next;
                    setCurrentStep(next);
                    setFeedback(getInstruction(next));
                } else {
                    // ── All poses done → save ─────────────────────────────────
                    setEnrolling(false);
                    setStatus('saving');
                    setFeedback('Sauvegarde du profil...');
                    try {
                        await gmaoApi.enrollFaceMulti(collectedRef.current);
                        setStatus('success');
                        setCurrentStep('SUCCESS');
                        success('Profil enregistré !', `${collectedRef.current.length} descripteurs sauvegardés`);
                        setTimeout(() => window.location.reload(), 2000);
                    } catch (saveErr) {
                        setStatus('error');
                        error('Erreur', 'Impossible de sauvegarder le profil');
                    }
                }
            } catch (detErr) {
                console.error('Detection error:', detErr);
            }
        }, 150); // 150ms = ~6fps, fast enough for PC webcam

        return () => clearInterval(interval);
    }, [enrolling]); // only restarts if enrolling changes

    // ── UI helpers ────────────────────────────────────────────────────────────
    const getInstruction = (step: ScanStep): string => {
        switch (step) {
            case 'FRONT':   return 'Regardez droit devant la caméra';
            case 'LEFT':    return 'Tournez la tête à GAUCHE';
            case 'RIGHT':   return 'Tournez la tête à DROITE';
            case 'SUCCESS': return 'Profil enregistré !';
            default:        return '';
        }
    };

    const getStepLabel = (step: ScanStep): string => {
        switch (step) {
            case 'FRONT': return 'Face'; case 'LEFT': return 'Gauche';
            case 'RIGHT': return 'Droite'; case 'SUCCESS': return '✓ OK';
            default: return '';
        }
    };

    return (
        <div className="relative w-full flex flex-col items-center justify-center p-4 min-h-[540px]">

            {/* Header */}
            <div className="text-center mb-5">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Face ID Setup</h2>
                <p className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-widest">
                    {TOTAL_SAMPLES} descripteurs · {STEPS.length} poses · Précision maximale
                </p>

                {/* Live feedback badge */}
                {status === 'enrolling' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-5 py-2 rounded-full">
                        <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                            {getStepLabel(currentStep)} — {feedback}
                        </span>
                    </div>
                )}
                {status === 'saving' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-5 py-2 rounded-full">
                        <Loader2 className="size-3 text-amber-400 animate-spin" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Sauvegarde...</span>
                    </div>
                )}
                {status === 'success' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 rounded-full">
                        <CheckCircle className="size-3 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Profil Enregistré !</span>
                    </div>
                )}
            </div>

            {/* Step progress dots */}
            {status === 'enrolling' && (
                <div className="flex gap-3 mb-5">
                    {STEPS.map((step, i) => {
                        const doneIdx = STEPS.indexOf(currentStep);
                        const done    = i < doneIdx;
                        const active  = i === doneIdx;
                        return (
                            <div key={step} className="flex flex-col items-center gap-1">
                                <div className={`size-8 rounded-full border-2 flex items-center justify-center text-[0.6rem] font-black transition-all
                                    ${done   ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                      active ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' :
                                               'bg-white/5 border-white/10 text-slate-600'}`}>
                                    {done ? '✓' : i + 1}
                                </div>
                                <span className={`text-[0.5rem] font-black uppercase ${done ? 'text-emerald-400' : active ? 'text-blue-400' : 'text-slate-700'}`}>
                                    {getStepLabel(step)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Camera ring */}
            <div className="relative size-[300px] sm:size-[360px] flex items-center justify-center mb-5">
                {/* SVG progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none">
                    <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                    <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="6" fill="transparent"
                        strokeDasharray="1500" strokeDashoffset={1500 - (15 * progress)}
                        className={`transition-all duration-500 ${status === 'success' ? 'text-emerald-500' : 'text-blue-500'}`}
                        style={{ strokeLinecap: 'round' }} />
                </svg>

                {/* Video */}
                <div className={`relative size-[90%] rounded-full overflow-hidden border-4 z-0
                    ${status === 'success' ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]' :
                      status === 'enrolling' ? 'border-blue-500/40' : 'border-white/10'} bg-slate-900`}>

                    <video ref={videoRef} autoPlay muted playsInline
                        className={`w-full h-full object-cover transition-opacity duration-500 ${stream ? 'opacity-100' : 'opacity-0'}`} />

                    {/* Pose arrow — LEFT / RIGHT only */}
                    {status === 'enrolling' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            {currentStep === 'LEFT'  && <ArrowLeft  size={80} className="text-blue-400/40 animate-pulse" />}
                            {currentStep === 'RIGHT' && <ArrowRight size={80} className="text-blue-400/40 animate-pulse" />}
                        </div>
                    )}

                    {/* Idle screen */}
                    {status === 'idle' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4">
                            <Camera size={48} className="text-slate-700" />
                            {modelsLoading ? (
                                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                                    <Loader2 size={14} className="animate-spin" /> Chargement IA...
                                </div>
                            ) : (
                                <button onClick={startCamera}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-colors">
                                    Démarrer l'Enregistrement
                                </button>
                            )}
                        </div>
                    )}

                    {/* Success overlay */}
                    {status === 'success' && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center z-30">
                            <CheckCircle size={80} className="text-emerald-400" />
                        </div>
                    )}

                    {/* Sample progress bar (bottom of video) */}
                    {status === 'enrolling' && (
                        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-900/80 z-30">
                            <div className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${(samplesForStepRef.current / SAMPLES_PER_STEP) * 100}%` }} />
                        </div>
                    )}
                </div>

                {/* Counter display */}
                {status === 'enrolling' && (
                    <div className="absolute -bottom-6 text-[0.6rem] font-black text-slate-500 uppercase tracking-widest text-center w-full">
                        {Math.round(progress)}% — {totalCollected}/{TOTAL_SAMPLES} échantillons
                    </div>
                )}
            </div>

            {/* Cancel */}
            {status !== 'idle' && status !== 'success' && (
                <button onClick={() => window.location.reload()}
                    className="mt-10 text-[0.6rem] font-bold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors">
                    Annuler la configuration
                </button>
            )}
        </div>
    );
};
