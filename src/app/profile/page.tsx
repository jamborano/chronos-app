'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();

  // ===== STATE UNTUK PAYMENT =====
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrisData, setQrisData] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrCodeInstanceRef = useRef<any>(null);

  // ===== CEK SESSION & STATUS VIP =====
  useEffect(() => {
    const vipStatus = localStorage.getItem('chronos_vip_status');
    if (!vipStatus) {
      router.push('/');
      return;
    }
    const parsed = JSON.parse(vipStatus);
    if (!parsed.isVipMode) {
      router.push('/');
      return;
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.push('/');
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  // ===== BACA TEMA =====
  useEffect(() => {
    const savedTheme = localStorage.getItem('chronos_theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // ===== AMBIL SESI DARI LOCALSTORAGE =====
  useEffect(() => {
    const raw = localStorage.getItem('chronos_sessions');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) setSessions(data);
      } catch {}
    }
  }, []);

  // ===== AMBIL PROFILE DARI SUPABASE =====
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!data) {
          const newProfile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
            vip_expiry: null,
            created_at: new Date().toISOString(),
          };
          console.log('Creating profile with:', newProfile);
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setProfile(null);
          } else {
            setProfile(inserted);
            updateLocalVip(inserted.vip_expiry);
          }
        } else {
          setProfile(data);
          updateLocalVip(data.vip_expiry);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // ===== UPDATE LOCALSTORAGE VIP =====
  const updateLocalVip = (vipExpiry: string | null) => {
    const isVip = vipExpiry ? new Date(vipExpiry) > new Date() : false;
    localStorage.setItem('chronos_vip_status', JSON.stringify({
      isVipMode: isVip,
      isFocusMode: isVip,
    }));
  };

  // ===== AKTIFKAN VIP GRATIS (TESTING) =====
  const activateVip = async () => {
    if (!profile) return;
    try {
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 1);
      const expiryDateStr = newExpiry.toISOString().split('T')[0];

      const { error } = await supabase
        .from('profiles')
        .update({ vip_expiry: expiryDateStr })
        .eq('id', profile.id);

      if (error) {
        alert('Gagal mengaktifkan VIP');
        console.error(error);
      } else {
        setProfile({ ...profile, vip_expiry: expiryDateStr });
        updateLocalVip(expiryDateStr);
        alert('✅ VIP aktif selama 1 bulan! (Gratis)');
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan');
    }
  };

  // ===== BAYAR VIP (MIDTRANS) =====
  const handleBayarVip = async () => {
    if (!profile) return;

    setPaymentLoading(true);
    try {
      const response = await fetch('/api/payment/create-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          email: profile.email,
          name: profile.full_name,
          amount: 10000,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat pembayaran');

      if (data.success) {
        setQrisData(data.qrisString);
        setPaymentId(data.paymentId);
        setCountdown(300);
        setShowPaymentModal(true);

        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ===== RENDER QR CODE =====
  useEffect(() => {
    if (!showPaymentModal || !qrisData) return;

    // Tunggu library QRCode.js siap
    const loadQR = () => {
      if (typeof window !== 'undefined' && (window as any).QRCode) {
        const canvas = document.getElementById('qrisCanvas') as HTMLCanvasElement;
        if (canvas) {
          try {
            // Hapus instance sebelumnya jika ada
            if (qrCodeInstanceRef.current) {
              qrCodeInstanceRef.current.clear();
            }
            qrCodeInstanceRef.current = new (window as any).QRCode(canvas, {
              text: qrisData,
              width: 180,
              height: 180,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: (window as any).QRCode.CorrectLevel.H,
            });
          } catch (e) {
            console.warn('QRCode error:', e);
          }
        }
      } else {
        setTimeout(loadQR, 200);
      }
    };
    loadQR();

    return () => {
      if (qrCodeInstanceRef.current) {
        try { qrCodeInstanceRef.current.clear(); } catch (e) {}
        qrCodeInstanceRef.current = null;
      }
    };
  }, [showPaymentModal, qrisData]);

  // ===== TUTUP MODAL PAYMENT =====
  const tutupPaymentModal = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowPaymentModal(false);
    setQrisData(null);
    setPaymentId(null);
    setCountdown(300);
    qrCodeInstanceRef.current = null;
  };

  // ===== COUNTDOWN FORMAT =====
  const formatCountdown = (seconds: number) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ===== TOGGLE TEMA =====
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('chronos_theme', newTheme);
  };

  // ===== STYLING =====
  const isVip = profile?.vip_expiry ? new Date(profile.vip_expiry) > new Date() : false;
  const bg = theme === 'dark' ? '#0d1117' : '#FFFFFF';
  const cardBg = theme === 'dark' ? '#161b22' : '#F5F5F5';
  const border = theme === 'dark' ? '#30363d' : '#DDDDDD';
  const textColor = theme === 'dark' ? 'text-[#e6edf3]' : 'text-black';
  const mutedText = theme === 'dark' ? 'text-[#e6edf3]/60' : 'text-gray-600';
  const borderColor = theme === 'dark' ? 'border-[#30363d]' : 'border-black/20';

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const pomodoroCount = sessions.filter(s => s.mode === 'pomodoro').length;

  // ===== LOADING =====
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0366d6]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-colors" style={{ backgroundColor: bg }}>
      <div className="w-full max-w-2xl">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${theme === 'dark' ? 'border-[#30363d] hover:bg-white/10 text-[#e6edf3]' : 'border-black/20 hover:bg-black/10 text-black'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Kembali
          </Link>
          <button onClick={toggleTheme} className={`rounded-full p-2 border transition-all hover:scale-105 ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-[#e6edf3] border-[#30363d]' : 'bg-black/10 hover:bg-black/20 text-black border-black/30'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </button>
        </div>

        {/* CARD PROFILE */}
        <div className="p-6 rounded-xl shadow-2xl border" style={{ backgroundColor: cardBg, borderColor: border }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0366d6]"></div>
            </div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={profile.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full border-2 border-[#0366d6] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
                <div>
                  <h1 className={`text-2xl font-bold ${textColor}`}>{profile.full_name || 'Pengguna'}</h1>
                  <p className={`text-sm ${mutedText}`}>{profile.email || 'email@example.com'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isVip ? 'bg-[#0366d6] text-white' : 'bg-gray-500 text-white'}`}>
                      {isVip ? '⭐ VIP' : 'FREE'}
                    </span>
                    {isVip && profile.vip_expiry && (
                      <span className={`text-xs ${mutedText}`}>
                        (sampai {new Date(profile.vip_expiry).toLocaleDateString('id-ID')})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== BUTTONS VIP ===== */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {!isVip && (
                  <button
                    onClick={activateVip}
                    className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-[#2d3748] text-white hover:bg-[#4a5568] transition active:scale-[0.98]"
                  >
                    🔓 Buka VIP (Gratis 1 Bulan)
                  </button>
                )}
                {!isVip && (
                  <button
                    onClick={handleBayarVip}
                    disabled={paymentLoading}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2 ${
                      paymentLoading
                        ? 'bg-gray-500 text-white cursor-not-allowed'
                        : 'bg-[#0366d6] hover:bg-[#0355b0] text-white shadow-lg shadow-[#0366d6]/30'
                    }`}
                  >
                    {paymentLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <span>💳</span> Bayar VIP (Rp 10.000)
                      </>
                    )}
                  </button>
                )}
                {isVip && (
                  <div className="w-full py-2.5 text-center rounded-lg font-bold text-sm bg-green-500/20 text-green-400 border border-green-500/30">
                    ✅ VIP Aktif sampai {new Date(profile.vip_expiry).toLocaleDateString('id-ID')}
                  </div>
                )}
              </div>

              {/* STATISTIK */}
              <div className={`grid grid-cols-2 gap-4 border-t ${borderColor} pt-4`}>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${mutedText}`}>Total Sesi</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{totalSessions}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${mutedText}`}>Total Waktu</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{totalHours} jam</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${mutedText}`}>Sesi Pomodoro</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{pomodoroCount}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${mutedText}`}>Rata-rata</p>
                  <p className={`text-2xl font-bold ${textColor}`}>
                    {totalSessions > 0 ? (totalMinutes / totalSessions).toFixed(0) : 0} mnt
                  </p>
                </div>
              </div>

              {sessions.length > 0 && (
                <div className={`mt-4 pt-4 border-t ${borderColor}`}>
                  <p className={`text-xs uppercase tracking-wider ${mutedText} mb-2`}>Sesi Terakhir</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sessions.slice(-3).reverse().map((s, idx) => (
                      <div key={idx} className={`flex justify-between text-sm ${textColor}`}>
                        <span>{s.task || 'Tanpa tugas'}</span>
                        <span className={mutedText}>{s.duration} mnt · {new Date(s.completedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-red-400">Gagal memuat profil. Silakan coba lagi.</p>
          )}
        </div>
      </div>

      {/* ===== MODAL PAYMENT (QRIS) ===== */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={tutupPaymentModal}
        >
          <div
            className={`w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl relative ${
              theme === 'dark' ? 'bg-[#161b22] border border-[#30363d]' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={tutupPaymentModal}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center text-3xl mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-[#e6edf3]' : 'text-black'}`}>
                Bayar VIP
              </h3>
              <p className={`text-sm ${mutedText}`}>Scan QRIS untuk membayar Rp 10.000</p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <canvas id="qrisCanvas" width="180" height="180"></canvas>
              </div>
            </div>

            <div className="text-center mb-3">
              <span className={`text-sm font-bold ${countdown < 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                ⏳ Sisa waktu: {formatCountdown(countdown)}
              </span>
            </div>

            <p className={`text-center text-xs ${mutedText}`}>
              ID: <span className="font-mono">{paymentId}</span>
            </p>

            <button
              onClick={tutupPaymentModal}
              className={`w-full mt-4 py-2.5 rounded-lg font-bold text-sm transition ${
                theme === 'dark'
                  ? 'bg-[#30363d] hover:bg-[#484f58] text-[#e6edf3]'
                  : 'bg-gray-200 hover:bg-gray-300 text-black'
              }`}
            >
              Tutup
            </button>

            <p className={`text-center text-[10px] mt-2 ${mutedText}`}>
              Pembayaran akan otomatis terverifikasi. Refresh halaman jika perlu.
            </p>
          </div>
        </div>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" />
    </div>
  );
}