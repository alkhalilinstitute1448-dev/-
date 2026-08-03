import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Alert, Button, Input, Select, Loader } from '../components/ui';
import Logo from '../components/Logo';
import PhotoPicker from '../components/PhotoPicker';

const EMPTY = {
  first_name: '', nickname: '',
  father_name: '', father_job: '', father_status: 'alive',
  mother_name: '', mother_job: '', mother_status: 'alive',
  phone: '', photo: '',
};

const PHONE_RE = /^\+?\d{8,15}$/;

export default function Register() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState('loading');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .post('/registrations/validate-link', { token })
      .then(() => { if (active) setLinkState('valid'); })
      .catch(() => { if (active) setLinkState('invalid'); });
    return () => { active = false; };
  }, [token]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const fe = {};
    for (const key of Object.keys(EMPTY)) {
      if (!String(form[key] || '').trim()) fe[key] = 'مطلوب';
    }
    if (!PHONE_RE.test(String(form.phone).replace(/\s/g, ''))) fe.phone = 'رقم هاتف غير صحيح';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) {
      setError('يرجى إكمال جميع الحقول المطلوبة بشكل صحيح');
      return;
    }
    setLoading(true);
    try {
      await api.post('/registrations', { token, ...form, phone: String(form.phone).replace(/\s/g, '') });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const input = (key, label, props = {}) => (
    <Input
      label={label}
      value={form[key]}
      onChange={(e) => set(key, e.target.value)}
      className={fieldErrors[key] ? 'border-red-500/50' : ''}
      {...props}
    />
  );

  if (linkState === 'loading') {
    return (
      <Shell>
        <Loader text="جارٍ التحقق من الرابط..." />
      </Shell>
    );
  }

  if (linkState === 'invalid') {
    return (
      <Shell>
        <div className="glass-strong rounded-3xl p-8 text-center shadow-glass-lg">
          <div className="text-4xl mb-3 opacity-70">⚠</div>
          <h2 className="text-xl font-bold text-white">رابط التسجيل غير صالح</h2>
          <p className="text-sm text-gray-400 mt-2">هذا الرابط ملغي أو غير موجود. تواصل مع إدارة الأكاديمية للحصول على رابط جديد.</p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/login')}>العودة للصفحة الرئيسية</Button>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="glass-strong rounded-3xl p-8 text-center shadow-glass-lg animate-[floatIn_.4s_ease]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl text-emerald-300">✓</div>
          <h2 className="text-xl font-bold text-white">تم استلام طلبك</h2>
          <p className="text-sm text-gray-300 mt-3 leading-relaxed">
            تم إرسال طلب التسجيل بنجاح، سيتم مراجعته من قبل الإدارة، وسيتم التواصل معك بعد قبول الطلب.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-7">
          <Logo size="md" className="mx-auto" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-4">طلب انضمام لعضو الفريق</h1>
          <p className="text-gray-400 text-sm mt-2">تعبئة البيانات أدناه لمراجعة طلبك من قبل الإدارة</p>
        </div>

        <form onSubmit={submit} className="glass-strong rounded-3xl p-6 sm:p-8 space-y-6 shadow-glass-lg">
          {error && <Alert type="error">{error}</Alert>}

          <section>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-royal-500/15 border border-royal-400/30 text-royal-300 flex items-center justify-center text-sm">1</span>
              البيانات الشخصية
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {input('first_name', 'الاسم الأول')}
              {input('nickname', 'الكنية')}
              {input('phone', 'رقم الهاتف', { dir: 'ltr', inputMode: 'tel', placeholder: '09xxxxxxxx' })}
              <div>
                <PhotoPicker value={form.photo} onChange={(v) => set('photo', v)} />
                {fieldErrors.photo && <p className="text-xs text-red-400 mt-1">الصورة الشخصية مطلوبة</p>}
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-royal-500/15 border border-royal-400/30 text-royal-300 flex items-center justify-center text-sm">2</span>
              معلومات الأب
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {input('father_name', 'اسم الأب')}
              <Select
                label="حالة الأب"
                value={form.father_status}
                onChange={(e) => set('father_status', e.target.value)}
              >
                <option value="alive">حي</option>
                <option value="deceased">متوفى</option>
              </Select>
              {input('father_job', 'عمل الأب')}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-royal-500/15 border border-royal-400/30 text-royal-300 flex items-center justify-center text-sm">3</span>
              معلومات الأم
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {input('mother_name', 'اسم الأم')}
              <Select
                label="حالة الأم"
                value={form.mother_status}
                onChange={(e) => set('mother_status', e.target.value)}
              >
                <option value="alive">حية</option>
                <option value="deceased">متوفاة</option>
              </Select>
              {input('mother_job', 'عمل الأم')}
            </div>
          </section>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'جارٍ إرسال الطلب...' : 'إرسال طلب التسجيل'}
          </Button>
        </form>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(900px 500px at 80% -10%, rgba(63,107,255,0.22), transparent 60%), radial-gradient(700px 400px at 10% 110%, rgba(88,101,242,0.16), transparent 60%), #070B1E',
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md animate-[floatIn_.4s_ease]">{children}</div>
    </div>
  );
}
