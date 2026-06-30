import { useState, useEffect } from 'react';
import api from '../../api';
import SelectField from '../../components/SelectField';

export default function AdminBookDelivery() {
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    studentId: '', bookName: '', receivedDate: '', returnedDate: '', status: 'received'
  });
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchData(); }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [bRes, sRes] = await Promise.all([
        api.get('/bookdelivery', { params }),
        api.get('/students'),
      ]);
      setBooks(bRes.data);
      setStudents(sRes.data);
    } catch (err) {
      setError('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...newRecord,
        receivedDate: newRecord.receivedDate || null,
        returnedDate: newRecord.returnedDate || null,
      };
      await api.post('/bookdelivery', payload);
      setShowForm(false);
      setNewRecord({ studentId: '', bookName: '', receivedDate: '', returnedDate: '', status: 'received' });
      fetchData();
    } catch (err) {
      setError('فشل إنشاء السجل');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    const record = books.find((b) => b.id === id);
    if (!record) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.put(`/bookdelivery/${id}`, {
        bookName: record.bookName,
        receivedDate: record.receivedDate,
        returnedDate: newStatus === 'returned' ? today : record.returnedDate,
        status: newStatus,
      });
      fetchData();
    } catch (err) {
      setError('فشل تحديث الحالة');
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.delete(`/bookdelivery/${id}`);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError('فشل حذف السجل');
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'badge-amber',
      received: 'badge-emerald',
      returned: 'badge-red',
    };
    const labels = {
      pending: 'معلق', received: 'تم الاستلام', returned: 'تم الإرجاع',
    };
    return <span className={styles[status] || 'badge-gold'}>{labels[status] || status}</span>;
  };

  return (
    <div dir="rtl" className="app-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="page-header !mb-0">تسليم الكتب</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary !px-5 !py-2.5 !text-sm">
            {showForm ? 'إلغاء' : 'إضافة تسليم جديد'}
          </button>
        </div>

        {error && <div className="alert-error mb-6"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}

        {showForm && (
          <div className="card mb-6 border-gold-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">تسليم كتاب جديد</h3>
            </div>
            <form onSubmit={createRecord} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="label-text">الطالب</label>
                <SelectField
                  value={newRecord.studentId}
                  onChange={(e) => setNewRecord({ ...newRecord, studentId: e.target.value })}
                  options={students.map((s) => ({ value: String(s.id), label: s.fullName }))}
                  placeholder="اختر الطالب"
                />
              </div>
              <div>
                <label className="label-text">اسم الكتاب</label>
                <input type="text" value={newRecord.bookName} onChange={(e) => setNewRecord({ ...newRecord, bookName: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label-text">تاريخ الاستلام</label>
                <input type="date" value={newRecord.receivedDate} onChange={(e) => setNewRecord({ ...newRecord, receivedDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label-text">تاريخ الإرجاع</label>
                <input type="date" value={newRecord.returnedDate} onChange={(e) => setNewRecord({ ...newRecord, returnedDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label-text">الحالة</label>
                <SelectField
                  value={newRecord.status}
                  onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                  options={[
                    { value: 'received', label: 'تم الاستلام' },
                    { value: 'pending', label: 'معلق' },
                    { value: 'returned', label: 'تم الإرجاع' },
                  ]}
                />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={creating} className="btn-primary w-full">
                  {creating ? <span className="flex items-center gap-2"><div className="spinner" />جاري...</span> : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-gray-400">تصفية:</span>
          <div className="flex gap-2 flex-wrap">
            {['', 'received', 'pending', 'returned'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`!px-4 !py-1.5 !text-sm rounded-xl border transition-all ${
                  statusFilter === s
                    ? 'bg-gold-500 text-black border-gold-500 font-bold'
                    : 'bg-transparent text-gray-400 border-gold-500/20 hover:border-gold-500/40'
                }`}
              >
                {s === '' ? 'الكل' : s === 'received' ? 'مستلمة' : s === 'pending' ? 'معلقة' : 'مرتجعة'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="spinner" /></div>
        ) : (
          <div className="card !p-0 overflow-hidden">
            <div className="table-wrap">
              <table className="w-full table-responsive-cards">
                <thead>
                  <tr>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">الطالب</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">الكتاب</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">تاريخ الاستلام</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">تاريخ الإرجاع</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">الحالة</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-gold-400 uppercase tracking-wider bg-[#141414] border-b border-gold-500/10">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/8">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-gold-500/5 transition-colors duration-150 even:bg-gold-500/3">
                      <td className="px-6 py-4 font-medium text-white" data-label="الطالب">{b.studentName}</td>
                      <td className="px-6 py-4 text-gray-400" data-label="الكتاب">{b.bookName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500" data-label="تاريخ الاستلام">{b.receivedDate || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500" data-label="تاريخ الإرجاع">{b.returnedDate || '—'}</td>
                      <td className="px-6 py-4" data-label="الحالة">{statusBadge(b.status)}</td>
                      <td className="px-6 py-4" data-label="">
                        <div className="flex items-center gap-2 justify-end">
                          {b.status !== 'returned' && (
                            <button onClick={() => updateStatus(b.id, 'returned')} className="btn-ghost !px-3 !py-1.5 !text-xs text-amber-400 hover:bg-amber-500/10">إرجاع</button>
                          )}
                          {b.status === 'pending' && (
                            <button onClick={() => updateStatus(b.id, 'received')} className="btn-ghost !px-3 !py-1.5 !text-xs text-emerald-400 hover:bg-emerald-500/10">استلام</button>
                          )}
                          <button onClick={() => deleteRecord(b.id)} className="btn-ghost !px-3 !py-1.5 !text-xs text-red-400 hover:bg-red-500/10">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {books.length === 0 && (
              <div className="text-center py-12 text-gray-500">لا توجد سجلات تسليم كتب</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}