const crypto = require('crypto');

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*_-+=?';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomFrom(set) {
  return set[crypto.randomInt(set.length)];
}

function shuffle(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function generateStrongPassword(length = 14) {
  const len = Math.max(12, Math.min(16, length));
  let pw = randomFrom(UPPER) + randomFrom(LOWER) + randomFrom(DIGITS) + randomFrom(SYMBOLS);
  while (pw.length < len) pw += randomFrom(ALL);
  return shuffle(pw);
}

module.exports = { generateStrongPassword };
