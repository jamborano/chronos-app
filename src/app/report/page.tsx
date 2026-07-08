'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function ReportPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPomodoro: 0,
    totalShort: 0,
    totalLong: 0,
    averagePerDay: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // ===== PROTEKSI: HANYA VIP YANG BISA AKSES =====
  useEffect(() => {
    const vipStatus = localStorage.getItem('chronos_vip_status');
    if (!vipStatus) {
      window.location.href = '/';
      return;
    }
    const parsed = JSON.parse(vipStatus);
    if (!parsed.isVipMode) {
      window.location.href = '/';
      return;
    }

    const data = getSessions();
    setSessions(data);
    calculateStats(data);
    setIsLoading(false);
  }, []);

  const getSessions = (): any[] => {
    try {
      const raw = localStorage.getItem('chronos_sessions');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.setItem('chronos_sessions', '[]');
      return [];
    }
  };

  const calculateStats = (data: any[]) => {
    if (data.length === 0) {
      setStats({
        totalSessions: 0,
        totalPomodoro: 0,
        totalShort: 0,
        totalLong: 0,
        averagePerDay: 0,
      });
      return;
    }

    const totalSessions = data.length;
    let totalPomodoro = 0,
      totalShort = 0,
      totalLong = 0;
    data.forEach((s) => {
      if (s.mode === 'pomodoro') totalPomodoro += s.duration || 0;
      else if (s.mode === 'short') totalShort += s.duration || 0;
      else if (s.mode === 'long') totalLong += s.duration || 0;
    });

    const days = new Set(data.map((s) => s.completedAt?.split('T')[0] || '')).size;
    const averagePerDay = days > 0 ? totalSessions / days : 0;

    setStats({
      totalSessions,
      totalPomodoro,
      totalShort,
      totalLong,
      averagePerDay,
    });
  };

  // ===== DATA UNTUK CHART =====
  const modeBarData = [
    { name: 'Pomodoro', minutes: stats.totalPomodoro },
    { name: 'Istirahat Singkat', minutes: stats.totalShort },
    { name: 'Istirahat Panjang', minutes: stats.totalLong },
  ];

  const getDailySessions = () => {
    const days: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = s.completedAt?.split('T')[0] || 'unknown';
      days[day] = (days[day] || 0) + 1;
    });
    const labels = Object.keys(days).slice(-7);
    const values = labels.map((l) => days[l]);
    return labels.map((label, idx) => ({ date: label, sessions: values[idx] }));
  };
  const barData = getDailySessions();

  const getDailyMinutes = () => {
    const days: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = s.completedAt?.split('T')[0] || 'unknown';
      days[day] = (days[day] || 0) + (s.duration || 0);
    });
    const labels = Object.keys(days).slice(-7);
    const values = labels.map((l) => days[l]);
    return labels.map((label, idx) => ({ date: label, minutes: values[idx] }));
  };
  const lineData = getDailyMinutes();

  const taskList = sessions.slice().reverse();

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} jam ${mins} menit`;
  };

  // ===== FUNGSI KEMBALI KE TIMER =====
  const goToTimer = () => {
    // Pastikan mode VIP tetap aktif
    localStorage.setItem('chronos_vip_status', JSON.stringify({
      isVipMode: true,
      isFocusMode: true,
    }));
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center">
        <p className="text-lg">Memuat laporan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-[0.3em] mb-8">
          📊 LAPORAN VIP
        </h1>

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <p className="text-sm text-[#e6edf3]/60">Total Sesi</p>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
          </div>
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <p className="text-sm text-[#e6edf3]/60">Waktu Pomodoro</p>
            <p className="text-2xl font-bold">{formatMinutes(stats.totalPomodoro)}</p>
          </div>
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <p className="text-sm text-[#e6edf3]/60">Waktu Istirahat Singkat</p>
            <p className="text-2xl font-bold">{formatMinutes(stats.totalShort)}</p>
          </div>
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <p className="text-sm text-[#e6edf3]/60">Waktu Istirahat Panjang</p>
            <p className="text-2xl font-bold">{formatMinutes(stats.totalLong)}</p>
          </div>
          <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
            <p className="text-sm text-[#e6edf3]/60">Rata-rata Sesi/Hari</p>
            <p className="text-2xl font-bold">{stats.averagePerDay.toFixed(1)}</p>
          </div>
        </div>

        {/* GRAFIK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
            <h2 className="text-sm font-bold tracking-wider mb-4">🧩 Distribusi Waktu</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modeBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="name" tick={{ fill: '#e6edf3' }} />
                  <YAxis tick={{ fill: '#e6edf3' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#e6edf3' }}
                    formatter={(value: any) => formatMinutes(Number(value))}
                  />
                  <Bar dataKey="minutes" fill="#0366d6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
            <h2 className="text-sm font-bold tracking-wider mb-4">📊 Sesi per Hari</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="date" tick={{ fill: '#e6edf3' }} />
                  <YAxis tick={{ fill: '#e6edf3' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#e6edf3' }}
                  />
                  <Bar dataKey="sessions" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
            <h2 className="text-sm font-bold tracking-wider mb-4">📈 Trend Menit Fokus</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="date" tick={{ fill: '#e6edf3' }} />
                  <YAxis tick={{ fill: '#e6edf3' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#e6edf3' }}
                    formatter={(value: any) => formatMinutes(Number(value))}
                  />
                  <Line type="monotone" dataKey="minutes" stroke="#79c0ff" strokeWidth={2} dot={{ fill: '#79c0ff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DAFTAR TUGAS */}
        <div className="mt-8 bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
          <h2 className="text-sm font-bold tracking-wider mb-4">📋 Catatan Tugas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#e6edf3]/60 border-b border-[#30363d]">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Task</th>
                  <th className="text-left py-2 px-3">Mode</th>
                  <th className="text-left py-2 px-3">Durasi</th>
                  <th className="text-left py-2 px-3">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {taskList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#e6edf3]/40">
                      Belum ada sesi tersimpan. Mulai timer VIP sekarang!
                    </td>
                  </tr>
                ) : (
                  taskList.map((session, idx) => (
                    <tr key={session.id || idx} className="border-b border-[#30363d]/50 hover:bg-white/5">
                      <td className="py-2 px-3">{idx + 1}</td>
                      <td className="py-2 px-3">{session.task || 'Tanpa Nama'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            session.mode === 'pomodoro'
                              ? 'bg-[#0366d6] text-white'
                              : session.mode === 'short'
                              ? 'bg-[#58a6ff] text-white'
                              : 'bg-[#79c0ff] text-white'
                          }`}
                        >
                          {session.mode === 'pomodoro'
                            ? 'Fokus'
                            : session.mode === 'short'
                            ? 'Istirahat Singkat'
                            : 'Istirahat Panjang'}
                        </span>
                      </td>
                      <td className="py-2 px-3">{session.duration || 0} menit</td>
                      <td className="py-2 px-3 text-[#e6edf3]/60">
                        {session.completedAt
                          ? new Date(session.completedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== TOMBOL KEMBALI ===== */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={goToTimer}
            className="px-6 py-2 bg-[#0366d6] hover:bg-[#0355b0] rounded-full text-sm font-bold tracking-wide transition-all cursor-pointer"
          >
            ← Kembali ke Timer (Mode VIP)
          </button>
        </div>
      </div>
    </div>
  );
}