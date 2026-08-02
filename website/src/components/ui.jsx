import React from 'react';

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl bg-dark-850 border border-dark-700/60 shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const variants = {
    primary:
      'bg-gold-500 text-dark-950 hover:bg-gold-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-dark-700 text-gold-200 hover:bg-dark-600 border border-dark-600',
    danger: 'bg-red-600/90 text-white hover:bg-red-500',
    ghost: 'text-gold-300 hover:bg-dark-800',
    outline: 'border border-gold-500/40 text-gold-300 hover:bg-gold-500/10',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-gold-200/80">{label}</label>}
      <input
        className={`w-full rounded-xl bg-dark-900 border border-dark-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-gold-200/80">{label}</label>}
      <select
        className={`w-full rounded-xl bg-dark-900 border border-dark-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-gold-200/80">{label}</label>}
      <textarea
        className={`w-full rounded-xl bg-dark-900 border border-dark-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/40 px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors resize-y ${className}`}
        {...props}
      />
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-dark-850 border border-dark-600 shadow-card-glow max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/60">
          <h3 className="text-lg font-bold text-gold-200">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gold-300 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-dark-700/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ color = 'gold', children }) {
  const colors = {
    gold: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    gray: 'bg-dark-700 text-gray-400 border-dark-600',
    orange: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Loader({ text = 'جاري التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
      <div className="w-9 h-9 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({ title = 'لا توجد بيانات', sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
      <div className="text-3xl opacity-60">✦</div>
      <p className="text-gold-200/70 font-medium">{title}</p>
      {sub && <p className="text-sm text-gray-600">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gold-200">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    info: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  };
  return <div className={`px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>{children}</div>;
}

export function Field({ children }) {
  return <div>{children}</div>;
}
