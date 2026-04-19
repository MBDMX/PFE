'use client';
import { useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceApi = () => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadModels = useCallback(async () => {
        if (modelsLoaded) return;
        setLoading(true);
        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        } catch (error) {
            console.error('Erreur chargement modèles face-api:', error);
        } finally {
            setLoading(false);
        }
    }, [modelsLoaded]);

    const getDescriptorFromVideo = async (videoElement: HTMLVideoElement) => {
        if (!modelsLoaded) await loadModels();
        
        const detection = await faceapi
            .detectSingleFace(videoElement)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;
        return Array.from(detection.descriptor);
    };

    return {
        loadModels,
        modelsLoaded,
        loading,
        getDescriptorFromVideo,
    };
};
