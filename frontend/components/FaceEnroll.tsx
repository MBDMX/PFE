'use client';
import * as faceapi from 'face-api.js';
import { useRef, useState, useEffect } from 'react';
import { gmaoApi } from '../services/api';
import { Camera, CheckCircle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from './ui/toast';

type ScanStep = 'FRONT' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'SUCCESS';

export const FaceEnroll = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState<ScanStep>('FRONT');
    const [enrolling, setEnrolling] = useState(false);
    const { success, error } = useToast();

    const getHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
        const nose = landmarks.getNose()[0];
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[0];
        const midEyeX = (leftEye.x + rightEye.x) / 2;
        const faceWidth = rightEye.x - leftEye.x;
        const horizontalRatio = (nose.x - midEyeX) / faceWidth;
        const verticalRatio = (nose.y - (leftEye.y + rightEye.y) / 2) / faceWidth;
        return { horizontalRatio, verticalRatio };
    };

    const loadModels = async () => {
        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        } catch (err) { console.error("Models Load Fail", err); }
    };

    const startCamera = async () => {
        setStatus('scanning');
        try {
            if (!modelsLoaded) await loadModels();
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setStatus('idle');
            // Auto-start enrollment
            setEnrolling(true);
        } catch (err: any) {
            error('Erreur', 'Impossible d\'ouvrir la caméra');
            setStatus('error');
        }
    };

    useEffect(() => {
        if (!enrolling || !videoRef.current || currentStep === 'SUCCESS') return;
        const interval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
                try {
                    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        const { horizontalRatio, verticalRatio } = getHeadPose(detection.landmarks);
                        let stepValid = false;
                        switch (currentStep) {
                            case 'FRONT': if (Math.abs(horizontalRatio) < 0.2) stepValid = true; break;
                            case 'LEFT':  if (horizontalRatio < -0.3) stepValid = true; break;
                            case 'RIGHT': if (horizontalRatio > 0.3) stepValid = true; break;
                            case 'UP':    if (verticalRatio < 0.25) stepValid = true; break;
                            case 'DOWN':  if (verticalRatio > 0.55) stepValid = true; break;
                        }

                        if (stepValid) {
                            if (currentStep === 'DOWN') {
                                setProgress(100);
                                setEnrolling(false);
                                const res = await gmaoApi.enrollFace(Array.from(detection.descriptor));
                                if (res) {
                                    setStatus('success');
                                    setCurrentStep('SUCCESS');
                                    success('Succès', 'Profil enregistré !');
                                    setTimeout(() => window.location.reload(), 2000);
                                }
                            } else {
                                const order: ScanStep[] = ['FRONT', 'LEFT', 'RIGHT', 'UP', 'DOWN'];
                                const nextIndex = order.indexOf(currentStep) + 1;
                                setCurrentStep(order[nextIndex] as ScanStep);
                                setProgress(nextIndex * 20);
                            }
                        }
                    }
                } catch (err) { console.error(err); }
            }
        }, 200);
        return () => clearInterval(interval);
    }, [enrolling, currentStep]);

    const getStepLabel = () => {
        switch (currentStep) {
            case 'FRONT': return 'Regardez en face';
            case 'LEFT':  return 'Tournez à GAUCHE';
            case 'RIGHT': return 'Tournez à DROITE';
            case 'UP':    return 'Regardez en HAUT';
            case 'DOWN':  return 'Regardez en BAS';
            case 'SUCCESS': return 'Profil Enregistré !';
            default: return 'Prêt';
        }
    };

    return (
        <div className="relative w-full flex flex-col items-center justify-center p-4 min-h-[500px]">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Face ID Setup</h2>
                <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-full">
                    <div className={`size-2 rounded-full ${enrolling ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">{getStepLabel()}</span>
                </div>
            </div>

            <div className="relative size-[300px] sm:size-[400px] flex items-center justify-center mb-8">
                <svg className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none">
                    <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="1500" strokeDashoffset={1500 - (15 * progress)} className="text-blue-500 transition-all duration-500" style={{ strokeLinecap: 'round' }} />
                </svg>

                <div className={`relative size-[90%] rounded-full overflow-hidden border-4 ${currentStep === 'SUCCESS' ? 'border-emerald-500' : 'border-white/10'} bg-slate-900 z-0`}>
                    <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${stream ? 'opacity-100' : 'opacity-0'}`} />
                    
                    {enrolling && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            {currentStep === 'LEFT' && <ArrowLeft size={100} className="text-white/30 animate-pulse" />}
                            {currentStep === 'RIGHT' && <ArrowRight size={100} className="text-white/30 animate-pulse" />}
                            {currentStep === 'UP' && <ArrowUp size={100} className="text-white/30 animate-pulse" />}
                            {currentStep === 'DOWN' && <ArrowDown size={100} className="text-white/30 animate-pulse" />}
                        </div>
                    )}

                    {!stream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <Camera size={48} className="text-slate-700 mb-4" />
                            <button onClick={startCamera} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-blue-500 transition-colors">Démarrer Caméra</button>
                        </div>
                    )}
                </div>
            </div>

            {currentStep !== 'SUCCESS' && (
                <button onClick={() => window.location.reload()} className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">Annuler la configuration</button>
            )}
        </div>
    );
};
