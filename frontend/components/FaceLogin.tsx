'use client';
import { useRef, useState, useEffect } from 'react';
import { useFaceApi } from '../hooks/useFaceApi';
import { useRouter } from 'next/navigation';
import { Camera, X, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { useToast } from './ui/toast';
import { gmaoApi } from '../services/api';

interface FaceLoginProps {
    onSuccess: (data: any) => void;
}

export const FaceLogin = ({ onSuccess }: FaceLoginProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { loadModels, modelsLoaded, loading: modelsLoading, getDescriptorFromVideo } = useFaceApi();
    const [isOpen, setIsOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const { error } = useToast();

    const startCamera = async () => {
        setIsOpen(true);
        setStatus('idle');
        try {
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            error('Erreur', 'Impossible d\'accéder à la caméra.');
            setIsOpen(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
        setIsOpen(false);
    };

    useEffect(() => {
        if (isOpen) loadModels();
        return () => stopCamera();
    }, [isOpen]);

    // Loop for detection once camera is up
    useEffect(() => {
        let active = true;
        const scan = async () => {
            if (!isOpen || !stream || !videoRef.current || !modelsLoaded || status === 'success') return;
            
            setStatus('scanning');
            const descriptor = await getDescriptorFromVideo(videoRef.current);
            
            if (descriptor && active) {
                    const res = await gmaoApi.faceLogin(descriptor);
                    if (res.data) {
                        setStatus('success');
                        setTimeout(() => {
                            onSuccess(res.data);
                            stopCamera();
                        }, 1000);
                    } else {
                        // Keep scanning
                        setTimeout(scan, 1000);
                    }
                } catch (err) {
                    setTimeout(scan, 2000);
                }
            } else if (active) {
                setTimeout(scan, 800);
            }
        };

        if (stream && modelsLoaded) scan();
        return () => { active = false; };
    }, [stream, modelsLoaded, isOpen]);

    return (
        <div className="w-full">
            <button
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold group"
            >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                    <Camera size={18} />
                </div>
                <span className="text-[0.65rem] uppercase tracking-[0.2em]">Connexion Faciale</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-blue-400" size={20} />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Authentification Biométrique</h3>
                            </div>
                            <button onClick={stopCamera} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="relative aspect-video bg-black">
                            {(!modelsLoaded || status === 'idle') && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-blue-400">
                                    <Loader2 className="animate-spin" size={32} />
                                    <span className="text-[0.6rem] font-black uppercase tracking-widest animate-pulse">Initialisation de l'IA...</span>
                                </div>
                            )}

                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                className={`w-full h-full object-cover transition-opacity duration-1000 ${modelsLoaded ? 'opacity-100' : 'opacity-0'}`} 
                            />

                            {status === 'scanning' && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-500/30 rounded-full scale-150 animate-ping" />
                                    <div className="absolute inset-x-0 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(96,165,250,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                                </div>
                            )}

                            {status === 'success' && (
                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center animate-in zoom-in duration-300">
                                    <div className="flex flex-col items-center gap-3 text-emerald-400">
                                        <div className="p-4 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                            <UserCheck size={48} />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-[0.3em]">Identité Confirmée</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">
                                    {status === 'success' ? 'Redirection en cours...' : 'Alignez votre visage avec la caméra pour continuer'}
                                </p>
                            </div>
                        </div>

                        <style jsx>{`
                            @keyframes scan {
                                0%, 100% { top: 0% }
                                50% { top: 100% }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    );
};
