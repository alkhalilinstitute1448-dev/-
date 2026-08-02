import React from 'react';
import { useData } from '../hooks/useData';
import api from '../api';
import { Card, Loader, PageHeader, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Assistant() {
  const { user } = useAuth();
  const { data, loading } = useData(() => api.get('/assistant'));

  if (loading) return <Loader />;

  return (
    <>
      <PageHeader
        title="المساعد الذكي"
        subtitle="أداة ذكية لمساعدة الفريق — قيد التطوير"
      />
      <Card className="p-10 flex flex-col items-center text-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-4xl text-gold-400">
          ✦
        </div>
        <h3 className="text-xl font-bold text-gold-200">{data?.message || 'المساعد الذكي'}</h3>
        <p className="text-gray-500 max-w-md leading-relaxed">
          سيتيح هذا القسم مساعدًا ذكيًا يساعد فريق العمل في صياغة المحتوى، وتلخيص الدروس،
          واقتراح التسميات التوضيحية، وأكثر من ذلك. نعمل على تفعيله قريبًا.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
          <span className="text-xs text-gold-600">ميزة قادمة</span>
        </div>
        <Button variant="outline" disabled>غير متاح حاليًا</Button>
      </Card>
    </>
  );
}
