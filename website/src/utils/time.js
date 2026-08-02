export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) return { text: `${days} يوم ${hours} س`, parts: { days, hours } };
  if (hours > 0) return { text: `${hours} س ${String(minutes).padStart(2, '0')} د`, parts: { hours, minutes } };
  if (minutes > 0) return { text: `${minutes} د ${String(secs).padStart(2, '0')} ث`, parts: { minutes, secs } };
  return { text: `${secs} ث`, parts: { secs } };
}

export function formatClock(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}
