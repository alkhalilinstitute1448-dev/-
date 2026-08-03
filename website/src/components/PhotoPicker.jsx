import React, { useRef } from 'react';

const MAX_DIM = 900;
const QUALITY = 0.82;

async function fileToDataUrl(file) {
  const raw = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = raw;
  });
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

export default function PhotoPicker({ value, onChange }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      onChange(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-white/15 overflow-hidden flex items-center justify-center bg-navy-900/60 shrink-0">
          {value ? (
            <img src={value} alt="الصورة الشخصية" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-gray-600">☺</span>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl text-sm bg-white/[0.06] hover:bg-white/[0.12] text-electric-300 border border-white/10 transition-all"
          >
            ⬆ رفع صورة من الجهاز
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="px-4 py-2.5 rounded-2xl text-sm bg-white/[0.06] hover:bg-white/[0.12] text-electric-300 border border-white/10 transition-all"
          >
            ◉ التقاط صورة بالكاميرا
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-red-300/80 hover:text-red-200 text-right"
            >
              إزالة الصورة
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <p className="text-xs text-gray-600">صورة شخصية واضحة — تُعرض على إدارة النظام للموافقة على الطلب</p>
    </div>
  );
}
