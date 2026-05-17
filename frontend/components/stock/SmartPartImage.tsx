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

// Fallback stylisé : initiales de la pièce avec une couleur basée sur le nom
function getColorFromName(name: string): string {
  const colors = [
    'from-blue-600 to-blue-800', 'from-violet-600 to-violet-800',
    'from-emerald-600 to-emerald-800', 'from-amber-600 to-amber-800',
    'from-rose-600 to-rose-800', 'from-cyan-600 to-cyan-800',
    'from-indigo-600 to-indigo-800', 'from-teal-600 to-teal-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export const SmartPartImage: React.FC<SmartPartImageProps> = ({
  partId,
  partName,
  initialImage,
  icon,
  className = "size-12 rounded-xl"
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);  // Skeleton visible par défaut
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading : on ne charge que quand la ligne est visible
  // Reset state when image source changes (e.g., after polling updates)
  useEffect(() => {
    setFailed(false);
    setImgSrc(null);
    setIsLoading(true);
  }, [initialImage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '150px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const load = async () => {
      // 1. On essaie d'abord l'image initiale passée en props
      if (initialImage && (initialImage.startsWith('http') || initialImage.includes('/static/') || initialImage.startsWith('data:image'))) {
        const fullUrl = (initialImage.startsWith('http') || initialImage.startsWith('data:image'))
          ? initialImage
          : `${API_BASE_URL}${initialImage}`;
        setImgSrc(fullUrl);
        setIsLoading(false);
        return;
      }

      // 2. On vérifie le cache local Dexie
      try {
        const cached = await db.stock.get({ id: partId });
        if (cached?.image && (cached.image.startsWith('http') || cached.image.includes('/static/') || cached.image.startsWith('data:image'))) {
          const url = (cached.image.startsWith('http') || cached.image.startsWith('data:image'))
            ? cached.image
            : `${API_BASE_URL}${cached.image}`;
          setImgSrc(url);
          setIsLoading(false);
          return;
        }
      } catch { /* Ignore Dexie errors */ }

      // 3. On demande au backend de déclencher le téléchargement
      try {
        const res = await fetch(`${API_BASE_URL}/api/stock/${partId}/ensure-image`, { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success' && data.image) {
          const url = data.image.startsWith('http') ? data.image : `${API_BASE_URL}${data.image}`;
          setImgSrc(`${url}?t=${Date.now()}`); // Cache-busting
          await db.stock.update(partId, { image: url });
        }
      } catch { /* Silently fail */ }
      
      setIsLoading(false);
    };

    load();
  }, [partId, isVisible, initialImage]);

  const handleImageError = () => {
    setFailed(true);
    // On ne fait rien de plus — le fallback gradient s'affiche
  };

  const gradient = getColorFromName(partName);
  const initials = getInitials(partName);

  return (
    <div
      ref={containerRef}
      className={`${className} relative overflow-hidden flex-shrink-0 flex items-center justify-center`}
    >
      {/* Skeleton pulsant pendant le chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-xl" />
      )}

      {/* Image réelle si disponible et pas échouée */}
      {imgSrc && !failed ? (
        <img
          src={imgSrc}
          alt={partName}
          className="w-full h-full object-cover"
          onError={() => { setFailed(true); setIsLoading(false); }}
          onLoad={() => setIsLoading(false)}
        />
      ) : !isLoading ? (
        /* Fallback : avatar stylisé avec les initiales de la pièce */
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-white font-black text-xs tracking-widest opacity-90">
            {initials}
          </span>
        </div>
      ) : null}
    </div>
  );
};
