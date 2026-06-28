/**
 * Normalize a raw phone number to E.164 format.
 * For Syrian numbers (+963), accepts all formats:
 *   9XXXXXXXX, 09XXXXXXXX, 9639XXXXXXXX, +9639XXXXXXXX
 * and normalizes to +9639XXXXXXXX
 *
 * For non-Syrian numbers, strips non-digits and returns cleaned string.
 * Returns null for empty/invalid input.
 */
function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const s = raw.replace(/[\s\-\(\)]/g, '');

  if (/^\+9639\d{8}$/.test(s)) return s;

  if (/^\+\d{7,15}$/.test(s) && !s.startsWith('+963')) return s;

  const digits = s.replace(/\D/g, '');
  if (!digits) return null;

  if (/^9639\d{8}$/.test(digits)) return `+963${digits}`;
  if (/^09\d{8}$/.test(digits)) return `+9639${digits.slice(2)}`;
  if (/^9\d{8}$/.test(digits)) return `+963${digits}`;

  if (digits.length === 8) return `+9639${digits}`;

  if (digits.startsWith('963') || digits.startsWith('+963')) return null;

  return digits;
}

module.exports = { normalizePhone };
