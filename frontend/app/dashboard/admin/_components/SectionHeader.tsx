import React from 'react';

interface Props {
  title: string;
  sub?: string;
}

export function SectionHeader({ title, sub }: Props) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
      {sub && (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
          {sub}
        </p>
      )}
    </div>
  );
}
