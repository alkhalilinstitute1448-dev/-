import React, { useEffect, useState } from 'react';

export default function BackendStatus() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    window.addEventListener('akm:backend-down', onDown);
    window.addEventListener('akm:backend-up', onUp);
    return () => {
      window.removeEventListener('akm:backend-down', onDown);
      window.removeEventListener('akm:backend-up', onUp);
    };
  }, []);

  if (!down) return null;

  return (
    <div className="sticky top-0 z-[70] px-4 py-2.5 text-center text-sm bg-amber-500/15 border-b border-amber-400/30 backdrop-blur-xl text-amber-200">
      <span className="inline-flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin inline-block" />
        الخادم قيد التشغيل الآن — جارٍ إعادة الاتصال تلقائيًا، لا تقلق فبياناتك آمنة...
      </span>
    </div>
  );
}
