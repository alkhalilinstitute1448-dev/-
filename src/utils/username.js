const { query } = require('../models/db');

const ARABIC_TO_LATIN = {
  ا: 'a', أ: 'a', إ: 'a', آ: 'a',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh',
  ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', ة: 'a', و: 'w', ي: 'y', ى: 'y',
};

const NAME_DICT = {
  أحمد: 'Ahmed',
  محمد: 'Mohammad',
  محمود: 'Mahmoud',
  علي: 'Ali',
  حسن: 'Hassan',
  حسين: 'Hussain',
  عمر: 'Omar',
  خالد: 'Khalid',
  عبدالله: 'Abdullah',
  عبدالرحمن: 'Abdulrahman',
  عبدالرحيم: 'Abdulrahim',
  إبراهيم: 'Ibrahim',
  يوسف: 'Youssef',
  موسى: 'Mousa',
  عيسى: 'Issa',
  يحيى: 'Yahya',
  سامي: 'Sami',
  سامر: 'Samer',
  مازن: 'Mazen',
  فادي: 'Fadi',
  رامي: 'Rami',
  وائل: 'Wael',
  طارق: 'Tarek',
  ماهر: 'Maher',
  باسل: 'Basel',
  هيثم: 'Haitham',
  أنس: 'Anas',
  بسام: 'Bassam',
  عصام: 'Issam',
  أنور: 'Anwar',
  عماد: 'Emad',
  نضال: 'Nidal',
  عمار: 'Ammar',
  فراس: 'Firas',
  أيمن: 'Ayman',
  وليد: 'Waleed',
  زياد: 'Ziad',
  حسام: 'Hossam',
  نبيل: 'Nabil',
  سمير: 'Samir',
  غسان: 'Ghassan',
  جورج: 'George',
  أسامة: 'Osama',
  مصطفى: 'Mustafa',
  حمزة: 'Hamza',
  بلال: 'Bilal',
  معاذ: 'Moath',
  يزن: 'Yazan',
  كنان: 'Kinan',
  جنيد: 'Junaid',
  عبدالكريم: 'Abdulkarim',
  مريم: 'Maryam',
  فاطمة: 'Fatima',
  خديجة: 'Khadija',
  عائشة: 'Aisha',
  نور: 'Noor',
  سارة: 'Sara',
  هالة: 'Hala',
  لمى: 'Lama',
  رنا: 'Rana',
  دانا: 'Dana',
  شهد: 'Shahd',
  آية: 'Aya',
  ندى: 'Nada',
  هبة: 'Hiba',
  إيمان: 'Iman',
  أماني: 'Amani',
  ريم: 'Reem',
  سلوى: 'Salwa',
  أسماء: 'Asmaa',
  ميساء: 'Maysa',
  لينا: 'Lena',
  رولا: 'Rola',
  علا: 'Ola',
  بثينة: 'Buthaina',
  ريتا: 'Rita',
  رحاب: 'Rihab',
  غادة: 'Ghada',
  سناء: 'Sanaa',
  منى: 'Mona',
  سحر: 'Sahar',
};

function normalizeArabic(str) {
  return String(str || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, 'ا')
    .replace(/\u0649/g, 'ي')
    .replace(/\u0629/g, 'ة')
    .replace(/\u0648\u0648/g, 'و')
    .trim();
}

const NORMALIZED_NAME_DICT = Object.fromEntries(
  Object.entries(NAME_DICT).map(([k, v]) => [normalizeArabic(k), v])
);

function transliterateWord(word) {
  const n = normalizeArabic(word);
  if (!n) return '';
  if (NORMALIZED_NAME_DICT[n]) return NORMALIZED_NAME_DICT[n];
  let out = '';
  for (const ch of n) {
    if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase();
    else if (ARABIC_TO_LATIN[ch]) out += ARABIC_TO_LATIN[ch];
  }
  out = out.replace(/y$/, 'i').replace(/w$/, 'u');
  if (!out) return '';
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function transliterate(firstName, nickname) {
  const first = transliterateWord(firstName);
  let nick = normalizeArabic(nickname);
  if (nick.startsWith('ال')) nick = nick.slice(2);
  const parts = nick.split(/\s+/).filter(Boolean).map(transliterateWord);
  const base = first + parts.join('');
  return base || 'Member';
}

async function generateUniqueUsername(firstName, nickname) {
  const base = transliterate(firstName, nickname);
  for (let i = 0; ; i += 1) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const { rows } = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [candidate]);
    if (!rows.length) return candidate;
  }
}

module.exports = { generateUniqueUsername, transliterate };
