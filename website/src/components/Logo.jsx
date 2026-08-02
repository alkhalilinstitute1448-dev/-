import React from 'react';

const SIZES = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

export default function Logo({ size = 'md', showText = true, className = '', subtitle = true }) {
  return (
    <span className={`inline-flex items-center gap-3 min-w-0 ${className}`}>
      <img
        src="/logo.png"
        alt="Al-Khalil Media"
        className={`${SIZES[size]} object-contain rounded-2xl shrink-0 shadow-[0_0_28px_-8px_rgba(63,107,255,0.55)] bg-white/[0.04] border border-white/10`}
        draggable={false}
      />
      {showText && (
        <span className="leading-tight min-w-0">
          <span className="block text-base font-extrabold text-white tracking-tight truncate">Al-Khalil Media</span>
          {subtitle && <span className="block text-[11px] text-gray-500 mt-0.5 truncate">نظام إدارة الفريق الإعلامي</span>}
        </span>
      )}
    </span>
  );
}
