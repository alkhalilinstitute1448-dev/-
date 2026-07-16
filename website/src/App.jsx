import { useState, useEffect } from 'react';
import api from './api';

function StatusRow({ label, status }) {
  return (
    <div className="flex items-center justify-between py-4 px-6 bg-[#1c1c1c] rounded-xl border border-gold-500/10">
      <span className="text-white font-medium text-lg">{label}</span>
      <span className={`flex items-center gap-2 text-lg font-bold ${status ? 'text-emerald-400' : 'text-red-400'}`}>
        {status ? '✅' : '❌'}
        {status ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

export default function App() {
  const [backend, setBackend] = useState(null);
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/connection-status')
      .then(res => {
        setBackend(res.data.backend);
        setDatabase(res.data.database);
      })
      .catch(() => {
        setBackend(false);
        setDatabase(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-gold-500 mb-1">أكاديمية الخليل</h1>
          <p className="text-gray-500 text-sm">Al-Khalil Academy — System Status</p>
        </div>

        <div className="space-y-3">
          <StatusRow label="Frontend" status={!loading} />
          <StatusRow label="Backend" status={backend} />
          <StatusRow label="Database" status={database} />
        </div>

        {loading && (
          <div className="text-center text-gray-500 text-sm">Checking connection...</div>
        )}

        {backend && database && !loading && (
          <div className="text-center pt-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm">
              ✅ All systems operational
            </span>
          </div>
        )}

        {!loading && (!backend || !database) && (
          <div className="text-center pt-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              ❌ Some systems are down
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
