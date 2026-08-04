const PROFILE_FIELDS = [
  'first_name',
  'nickname',
  'father_name',
  'father_status',
  'father_job',
  'mother_name',
  'mother_status',
  'mother_job',
  'phone',
  'photo',
  'dob',
  'gender',
];

function pickProfile(body) {
  const out = {};
  for (const k of PROFILE_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function validateProfile(body) {
  if (body.father_status !== undefined && body.father_status !== null && !['alive', 'deceased'].includes(body.father_status)) {
    return 'حالة الأب غير صحيحة';
  }
  if (body.mother_status !== undefined && body.mother_status !== null && !['alive', 'deceased'].includes(body.mother_status)) {
    return 'حالة الأم غير صحيحة';
  }
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '') {
    const p = String(body.phone).replace(/[^\d+]/g, '');
    if (!/^\+?\d{8,15}$/.test(p)) return 'رقم الهاتف غير صحيح';
  }
  if (body.photo !== undefined && body.photo !== null && body.photo !== '') {
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(body.photo)) return 'الصورة الشخصية غير صحيحة';
    if (String(body.photo).length > 8 * 1024 * 1024) return 'الصورة كبيرة جدًا';
  }
  if (body.dob !== undefined && body.dob !== null && body.dob !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dob))) return 'تاريخ الميلاد غير صحيح';
  }
  if (body.gender !== undefined && body.gender !== null && body.gender !== '' && !['male', 'female'].includes(body.gender)) {
    return 'الجنس غير صحيح';
  }
  return null;
}

module.exports = { PROFILE_FIELDS, pickProfile, validateProfile };
