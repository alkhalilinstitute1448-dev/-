import React from 'react';

export function Card({ className = '', hover, children, ...props }) {
  return (
    <div
      className={`glass rounded-3xl transition-all duration-300 ${hover ? 'hover:bg-white/[0.06] hover:border-white/[0.14] hover:shadow-glass-lg hover:-translate-y-0.5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const variants = {
    primary:
      'bg-royal-500 hover:bg-royal-400 text-white shadow-glow font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
    secondary:
      'bg-white/[0.06] hover:bg-white/[0.12] text-electric-300 border border-white/10',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-semibold shadow-glow-green',
    danger: 'bg-red-500/85 hover:bg-red-400 text-white',
    ghost: 'text-gray-300 hover:bg-white/[0.06] hover:text-white',
    outline: 'border border-royal-400/40 text-royal-300 hover:bg-royal-500/10',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, hint, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-gray-300/90">{label}</label>}
      <input
        className={`w-full rounded-2xl bg-navy-900/70 border border-white/10 focus:border-royal-400/60 focus:ring-2 focus:ring-royal-500/20 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-all ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm text-gray-300/90">{label}</label>}
      <select
        className={`w-full rounded-2xl bg-navy-900/70 border border-white/10 focus:border-royal-400/60 focus:ring-2 focus:ring-royal-500/20 px-4 py-2.5 text-sm text-gray-100 outline-none transition-all ${className}`}
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
      {label && <label className="block text-sm text-gray-300/90">{label}</label>}
      <textarea
        className={`w-full rounded-2xl bg-navy-900/70 border border-white/10 focus:border-royal-400/60 focus:ring-2 focus:ring-royal-500/20 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-all resize-y ${className}`}
        {...props}
      />
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-3xl glass-strong shadow-glass-lg max-h-[90vh] flex flex-col animate-[fadeIn_.2s_ease]`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Badge({ color = 'gray', children, className = '' }) {
  const colors = {
    gold: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/10 text-red-300 border-red-500/30',
    blue: 'bg-electric-500/10 text-electric-300 border-electric-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    gray: 'bg-white/[0.05] text-gray-400 border-white/10',
    orange: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  };
  return <span className={`chip ${colors[color]} ${className}`}>{children}</span>;
}

export function Loader({ text = 'جاري التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
      <div className="w-10 h-10 border-2 border-royal-400/30 border-t-royal-400 rounded-full animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({ title = 'لا توجد بيانات', sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
      <div className="text-3xl opacity-50 text-royal-400">✦</div>
      <p className="text-gray-300/80 font-medium">{title}</p>
      {sub && <p className="text-sm text-gray-600">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-200',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    info: 'bg-electric-500/10 border-electric-500/30 text-electric-200',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
  };
  return <div className={`px-4 py-3 rounded-2xl border text-sm ${styles[type]}`}>{children}</div>;
}

export function StatCard({ icon, label, value, accent = 'royal', to, onClick, sub }) {
  const accents = {
    royal: 'text-royal-300 bg-royal-500/10 border-royal-500/20',
    indigo: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    electric: 'text-electric-300 bg-electric-500/10 border-electric-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-300 bg-red-500/10 border-red-500/20',
    gray: 'text-gray-300 bg-white/[0.06] border-white/10',
  };
  const Comp = to ? 'a' : 'div';
  return (
    <Comp
      href={to}
      onClick={onClick}
      className={`glass rounded-3xl p-5 flex items-center gap-4 transition-all duration-300 ${to ? 'hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-0.5' : ''}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${accents[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-white leading-none">{value}</div>
        <div className="text-sm text-gray-400 mt-1.5">{label}</div>
        {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
      </div>
    </Comp>
  );
}
