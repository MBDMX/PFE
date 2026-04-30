'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';

interface SmartPartImageProps {
  partId: number;
  partName: string;
  initialImage?: string;
  icon: string;
  className?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const SmartPartImage: React.FC<SmartPartImageProps> = ({ 
  partId, 
  partName, 
  initialImage, 
  icon,
  className = "size-12 rounded-xl"
}) => {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Observer pour le Lazy Loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const checkAndFetch = async () => {
      // Si on a déjà une image valide, on ne fait rien
      if (image && (image.startsWith('http') || image.includes('/part_'))) return;

      try {
        const idNum = typeof partId === 'string' ? parseInt(partId) : partId;
        // CORRECTION ICI : Utilisation de l'objet { id: idNum } pour Dexie
        const local = await db.stock.get({ id: idNum });
        
        if (local?.image && (local.image.startsWith('http') || local.image.includes('/part_'))) {
          setImage(local.image);
          return;
        }

        setIsLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/stock/${partId}/ensure-image`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'success' && data.image) {
          const newUrl = `${data.image}?t=${Date.now()}`;
          setImage(newUrl);
          await db.stock.update(partId, { image: newUrl });
        }
      } catch (err) {
        console.error("SmartImage load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAndFetch();
  }, [partId, isVisible]);

  const getInitials = (name: string) => {
    return name.split(' ').filter(word => word.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayImage = image && !error ? (image.startsWith('http') ? image : `${API_BASE_URL}${image}`) : null;

  return (
    <div 
      ref={containerRef}
      className={`${className} bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden shadow-lg relative group`}
    >
      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 ${displayImage && !isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <span className="text-sm font-bold text-slate-500 tracking-tighter">
          {getInitials(partName)}
        </span>
      </div>
      
      {displayImage && (
        <img
          src={displayImage}
          alt={partName}
          className={`w-full h-full object-cover relative z-10 ${isLoading ? 'opacity-40 grayscale blur-[2px]' : 'opacity-100'}`}
          onError={() => setError(true)}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="size-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
