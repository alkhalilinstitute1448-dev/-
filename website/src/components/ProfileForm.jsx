import React from 'react';
import PhotoPicker from './PhotoPicker';
import { Input, Select } from './ui';

export const EMPTY_PROFILE = {
  photo: '',
  first_name: '',
  nickname: '',
  father_name: '',
  father_status: 'alive',
  father_job: '',
  mother_name: '',
  mother_status: 'alive',
  mother_job: '',
  phone: '',
  dob: '',
  gender: '',
};

export function profileFromUser(u) {
  if (!u) return { ...EMPTY_PROFILE };
  return {
    photo: u.photo || '',
    first_name: u.first_name || '',
    nickname: u.nickname || '',
    father_name: u.father_name || '',
    father_status: u.father_status || 'alive',
    father_job: u.father_job || '',
    mother_name: u.mother_name || '',
    mother_status: u.mother_status || 'alive',
    mother_job: u.mother_job || '',
    phone: u.phone || '',
    dob: u.dob ? String(u.dob).slice(0, 10) : '',
    gender: u.gender || '',
  };
}

export default function ProfileForm({ form, setForm }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setVal = (key) => (val) => setForm({ ...form, [key]: val });

  return (
    <div className="space-y-4">
      <PhotoPicker value={form.photo} onChange={setVal('photo')} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="الاسم الأول" value={form.first_name} onChange={set('first_name')} />
        <Input label="الاسم الشائع (اللقب)" value={form.nickname} onChange={set('nickname')} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Input label="اسم الأب" value={form.father_name} onChange={set('father_name')} />
        <Select label="حالة الأب" value={form.father_status} onChange={set('father_status')}>
          <option value="alive">حي</option>
          <option value="deceased">متوفى</option>
        </Select>
        <Input label="عمل الأب" value={form.father_job} onChange={set('father_job')} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Input label="اسم الأم" value={form.mother_name} onChange={set('mother_name')} />
        <Select label="حالة الأم" value={form.mother_status} onChange={set('mother_status')}>
          <option value="alive">حية</option>
          <option value="deceased">متوفاة</option>
        </Select>
        <Input label="عمل الأم" value={form.mother_job} onChange={set('mother_job')} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Input label="رقم الهاتف" dir="ltr" value={form.phone} onChange={set('phone')} />
        <Input label="تاريخ الميلاد" type="date" value={form.dob} onChange={set('dob')} />
        <Select label="الجنس" value={form.gender} onChange={set('gender')}>
          <option value="">— اختر —</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </Select>
      </div>
    </div>
  );
}
