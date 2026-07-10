'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChronosPomodoro() {
  // ===== STATE =====
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [currentMode, setCurrentMode] = useState<'pomodoro' | 'short' | 'long'>('pomodoro');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [isBeat, setIsBeat] = useState(false);
  const [isVipMode, setIsVipMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [currentTask, setCurrentTask] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // ===== PAYMENT STATE =====
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrisData, setQrisData] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== REF YOUTUBE =====
  const playerRef = useRef<any>(null);
  const apiLoadedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  // ===== CEK SESSION =====
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // ===== FETCH PROFILE =====
  useEffect(() => {
    if (!user) {
      setProfileData(null);
      setIsFocusMode(false);
      setIsVipMode(false);
      return;
    }
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileData(data);
        const isVip = data.vip_expiry ? new Date(data.vip_expiry) > new Date() : false;
        setIsVipMode(isVip);
        setIsFocusMode(isVip);
        localStorage.setItem('chronos_vip_status', JSON.stringify({ isVipMode: isVip, isFocusMode: isVip }));
      }
    };
    fetchProfile();
  }, [user]);

  // ===== TUTUP POPUP =====
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowProfilePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== YOUTUBE PLAYER =====
  const initPlayer = () => {
    if (typeof window === 'undefined') return;
    const container = document.getElementById('youtube-player-container');
    if (!container || playerRef.current) return;

    try {
      const newPlayer = new (window as any).YT.Player('youtube-player', {
        videoId: 'OUnk5RpRKzA',
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            // 🔥 Tidak unmute otomatis, biarkan user klik tombol suara
          },
          onError: () => {
            const container = document.getElementById('youtube-player-container');
            if (container) {
              container.innerHTML = `<iframe src="https://www.youtube.com/embed/OUnk5RpRKzA?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full"></iframe>`;
            }
          },
        },
      });
    } catch (e) {
      const container = document.getElementById('youtube-player-container');
      if (container) {
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/OUnk5RpRKzA?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1" title="YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full"></iframe>`;
      }
    }
  };

  // ===== UNMUTE YOUTUBE (user-initiated) =====
  const handleUnmute = () => {
    if (playerRef.current) {
      playerRef.current.unMute();
      playerRef.current.playVideo();
      setIsMuted(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || apiLoadedRef.current) return;
    apiLoadedRef.current = true;
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
      return;
    }
    const originalCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (originalCallback) originalCallback();
      initPlayer();
    };
    if (!document.getElementById('youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    return () => {
      if ((window as any).YT && playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, []);

  // ===== PREMIUM ALARM =====
  const playPremiumAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const playChime = (freq: number, delay: number, dur: number = 0.4) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + dur);
        }, delay * 1000);
      };
      playChime(523, 0, 0.5);
      playChime(659, 0.35, 0.5);
      playChime(784, 0.7, 0.6);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(890, ctx.currentTime + 0.3);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 1200);
    } catch (e) { console.log('Alarm error:', e); }
  };

  // ===== SIMPAN DATA =====
  const saveSessionData = (task: string, mode: string, duration: number) => {
    if (!task.trim()) return;
    const session = { id: Date.now(), task: task.trim(), mode, duration, completedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('chronos_sessions') || '[]');
    existing.push(session);
    localStorage.setItem('chronos_sessions', JSON.stringify(existing));
  };

  // ===== WARNA =====
  const darkBg = '#0d1117';
  const darkCard = '#161b22';
  const darkBorder = '#30363d';
  const getBgColor = () => (theme === 'dark' ? darkBg : '#FFFFFF');
  const getCardStyle = () => ({
    backgroundColor: theme === 'dark' ? darkCard : '#F5F5F5',
    border: `1px solid ${theme === 'dark' ? darkBorder : '#DDDDDD'}`,
    boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
    borderRadius: '1.5rem',
  });

  const getStatusText = () => {
    switch (currentMode) {
      case 'pomodoro': return '1# Tetap Fokus!';
      case 'short': return '2# Ngopi Dulu!';
      case 'long': return '3# Makan Dulu!';
    }
  };

  // ===== TIMER FUNCTIONS =====
  const changeMode = (min: number, mode: 'pomodoro' | 'short' | 'long') => {
    setTimerState('idle');
    setMinutes(min);
    setSeconds(0);
    setCurrentMode(mode);
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
  };
  const resetTimer = (mode = currentMode) => {
    setTimerState('idle');
    const defaultMins = mode === 'pomodoro' ? 25 : mode === 'short' ? 5 : 15;
    setMinutes(defaultMins);
    setSeconds(0);
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
  };

  const handleTimer = () => {
    if (isFocusMode && !isVipMode) {
      setShowPremiumModal(true);
      return;
    }
    if (timerState === 'idle') setTimerState('running');
    else if (timerState === 'running') setTimerState('paused');
    else if (timerState === 'paused') setTimerState('running');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerState === 'running') {
      timer = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(timer);
            if (isVipMode && currentTask.trim()) {
              const duration = currentMode === 'pomodoro' ? 25 : currentMode === 'short' ? 5 : 15;
              saveSessionData(currentTask, currentMode, duration);
            }
            if (isVipMode) playPremiumAlarm();
            else alert(`Sesi selesai!`);
            resetTimer(currentMode);
          } else {
            setMinutes(prev => prev - 1);
            setSeconds(59);
            setIsBeat(true);
            setTimeout(() => setIsBeat(false), 300);
          }
        } else {
          setSeconds(prev => prev - 1);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerState, minutes, seconds, currentMode, isVipMode, currentTask]);

  const formatTime = () => {
    const m = minutes < 10 ? `0${minutes}` : minutes;
    const s = seconds < 10 ? `0${seconds}` : seconds;
    return `${m}:${s}`;
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // ===== TOMBOL VIP =====
  const handleVipToggle = () => {
    if (user && isVipMode) {
      setIsFocusMode(!isFocusMode);
      return;
    }
    setShowPremiumModal(true);
  };

  // ===== LOGIN =====
  const handleLoginWithGoogle = async () => {
    if (!isVipMode) {
      alert('Anda harus membayar VIP terlebih dahulu sebelum login.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        console.error('Login error:', error);
        alert('Gagal login, coba lagi.');
        setIsLoggingIn(false);
      } else {
        setShowLoginModal(false);
        setTimeout(() => setIsLoggingIn(false), 5000);
      }
    } catch (err) {
      console.error(err);
      setIsLoggingIn(false);
      alert('Terjadi kesalahan saat login.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfileData(null);
    setShowProfilePopup(false);
    setIsFocusMode(false);
  };

  // ===== BAYAR VIP =====
  const handleBayarVip = async () => {
    const email = user?.email || prompt('Masukkan email Anda untuk pembayaran:');
    if (!email) {
      alert('Email diperlukan untuk pembayaran.');
      return;
    }
    const name = user?.user_metadata?.full_name || email.split('@')[0] || 'Pengguna';

    setPaymentLoading(true);
    try {
      const response = await fetch('/api/payment/create-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || email,
          email: email,
          name: name,
          amount: 10000,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat pembayaran');

      if (data.success && data.qrisString) {
        setQrisData(data.qrisString);
        setPaymentId(data.paymentId);
        setCountdown(300);
        setShowPaymentModal(true);
        setShowPremiumModal(false);

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
      } else if (data.redirectUrl) {
        // Fallback: redirect ke halaman Midtrans
        window.open(data.redirectUrl, '_blank');
        alert('Pembayaran akan diproses di halaman Midtrans.');
        setShowPremiumModal(false);
      } else {
        alert('Error: ' + (data.error || 'QRIS tidak ditemukan'));
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const tutupPaymentModal = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowPaymentModal(false);
    setQrisData(null);
    setPaymentId(null);
    setCountdown(300);
  };

  const formatCountdown = (seconds: number) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ===== WARNA DINAMIS =====
  const textColor = theme === 'dark' ? 'text-[#e6edf3]' : 'text-black';
  const mutedText = theme === 'dark' ? 'text-[#e6edf3]/60' : 'text-gray-600';
  const borderColor = theme === 'dark' ? 'border-[#30363d]' : 'border-black/20';
  const inputBg = theme === 'dark' ? 'bg-[#0d1117]' : 'bg-black/5';

  const isUserVip = profileData?.vip_expiry ? new Date(profileData.vip_expiry) > new Date() : false;

  // ===== PROFILE BUTTON =====
  const ProfileButton = () => {
    if (user && isUserVip) {
      return (
        <div className="relative">
          <button onClick={() => setShowProfilePopup(!showProfilePopup)} className="flex items-center gap-2 focus:outline-none">
            <img
              src={user.user_metadata?.avatar_url || '/default-avatar.png'}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-[#30363d] hover:border-[#0366d6] transition-colors object-cover"
            />
          </button>
          {showProfilePopup && (
            <div ref={popupRef} className={`absolute right-0 mt-2 w-72 rounded-xl shadow-2xl border p-4 z-50 ${theme === 'dark' ? 'bg-[#161b22] border-[#30363d] text-[#e6edf3]' : 'bg-white border-gray-200 text-black'}`}>
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-[#0366d6] object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className={`border-t ${theme === 'dark' ? 'border-[#30363d]' : 'border-gray-200'} pt-3`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Status VIP</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUserVip ? 'bg-[#0366d6] text-white' : 'bg-gray-500 text-white'}`}>
                    {isUserVip ? '⭐ AKTIF' : 'FREE'}
                  </span>
                </div>
                {isUserVip && profileData?.vip_expiry && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">Berlaku sampai</span>
                    <span className="text-xs font-medium">{new Date(profileData.vip_expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className={`w-full mt-3 py-2 rounded-lg text-sm font-medium transition ${theme === 'dark' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'}`}>Logout</button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // ===== RENDER =====
  return (
    <div className="h-screen overflow-hidden flex flex-col transition-all duration-500" style={{ backgroundColor: getBgColor() }}>
      <style jsx global>{`
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes slideUp { 0% { opacity: 0; transform: translateY(20px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>

      {/* ===== HEADER ===== */}
      <header className="flex-shrink-0 flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="Chronos Logo" width={32} height={32} className="h-8 w-8" priority onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className={`text-xl font-bold tracking-[0.3em] ${textColor}`}>CHRONOS</div>
        </div>
        <div className="flex items-center gap-3">
          {user && isUserVip && isFocusMode && <ProfileButton />}
          <button
            onClick={handleVipToggle}
            className={`rounded-full transition-all hover:scale-105 border px-4 py-1.5 text-xs font-bold tracking-wider ${
              theme === 'dark'
                ? 'bg-[#0366d6] text-white border-[#0366d6] hover:bg-[#0355b0]'
                : 'bg-black text-white border-black hover:bg-gray-800'
            }`}
          >
            {isFocusMode && isUserVip ? 'FREE' : 'VIP'}
          </button>
          <button
            onClick={() => setShowHowToModal(true)}
            className={`rounded-full transition-all hover:scale-105 border p-2 ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-[#e6edf3] border-[#30363d]'
                : 'bg-black/10 hover:bg-black/20 text-black border-black/30'
            }`}
            aria-label="Petunjuk Pemakaian"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </button>
          <button
            onClick={toggleTheme}
            className={`rounded-full transition-all hover:scale-105 border p-2 ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-[#e6edf3] border-[#30363d]'
                : 'bg-black/10 hover:bg-black/20 text-black border-black/30'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {!isFocusMode && (
            <div className="hidden lg:block lg:col-span-3 space-y-3 lg:mt-12">
              <div className="text-center">
                <p className={`text-[10px] font-bold tracking-wider uppercase ${textColor}`}>🎵 Putar Musik</p>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#30363d] mt-1 bg-black relative">
                  <div id="youtube-player-container" className="w-full h-full">
                    <div id="youtube-player" className="w-full h-full"></div>
                  </div>
                  {isMuted && (
                    <button
                      onClick={handleUnmute}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/60 transition-colors"
                    >
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
                <a href="https://www.youtube.com/watch?v=OUnk5RpRKzA" target="_blank" rel="noopener" className={`text-[9px] flex items-center gap-1 justify-center mt-1 transition-colors ${mutedText} hover:text-[#ff0000]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Buka di YouTube
                </a>
              </div>
              <div className={`text-center text-[10px] ${mutedText} border-t border-[#30363d] pt-2`}>
                <p className="font-bold">✨ Fokus Lebih Produktif</p>
                <p>Timer Pomodoro premium.</p>
                <p className="text-[9px]">Gratis dengan iklan · Privasi terjaga</p>
              </div>
            </div>
          )}

          {/* ===== CARD TIMER ===== */}
          <div className={`${isFocusMode ? 'lg:col-span-12' : 'lg:col-span-6'} flex flex-col items-center lg:-mt-8`}>
            {!isFocusMode && (
              <div className="text-center mb-3">
                <h1 className={`text-xl md:text-2xl font-bold ${textColor}`}>Fokus dengan <span className="text-[#0366d6] text-2xl md:text-3xl font-extrabold">Chronos</span></h1>
                <p className={`text-[11px] ${mutedText}`}>Pomodoro Timer · Statistik · Bebas Iklan (VIP)</p>
              </div>
            )}
            <div className="w-full max-w-md mx-auto p-6 rounded-3xl shadow-2xl transition-all duration-500" style={getCardStyle()}>
              <div className="flex justify-between mb-4 text-[10px] md:text-xs tracking-[0.2em] font-bold">
                {['POMODORO', 'ISTIRAHAT SINGKAT', 'ISTIRAHAT PANJANG'].map((label, idx) => {
                  const mode = idx === 0 ? 'pomodoro' : idx === 1 ? 'short' : 'long';
                  const isActive = currentMode === mode;
                  return (
                    <button key={mode} onClick={() => changeMode(idx === 0 ? 25 : idx === 1 ? 5 : 15, mode)} className={`px-3 py-1 md:px-4 md:py-1.5 rounded-lg transition-all text-[10px] md:text-xs font-bold outline-none ${isActive ? (theme === 'dark' ? 'bg-[#0366d6] text-white' : 'bg-black text-white') : (theme === 'dark' ? 'text-[#e6edf3]/60 hover:bg-[#e6edf3]/10' : 'text-black/60 hover:bg-black/10')}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="text-center mb-1">
                <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-[#0366d6]' : 'text-[#1a1a1a]'}`}>{getStatusText()}</span>
              </div>
              <div className="text-center my-2">
                <div className={`text-7xl sm:text-8xl font-bold tracking-tighter transition-all duration-300 ${textColor} ${isBeat ? 'scale-105' : 'scale-100'}`}>
                  {formatTime()}
                </div>
              </div>
              <div className="flex justify-center mt-4">
                {timerState === 'idle' ? (
                  <button onClick={handleTimer} className={`font-bold px-8 py-3 rounded-full text-sm tracking-wide transition-all shadow-md border ${theme === 'dark' ? 'bg-[#0366d6] text-white border-[#0366d6] hover:bg-[#0355b0]' : 'bg-black text-white border-black hover:bg-gray-800'} active:scale-[0.98]`}>
                    MULAI
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTimerState(prev => prev === 'running' ? 'paused' : 'running')} className={`font-bold px-6 py-3 rounded-full text-sm tracking-wide transition-all shadow-md border ${theme === 'dark' ? 'bg-[#0366d6] text-white border-[#0366d6] hover:bg-[#0355b0]' : 'bg-black text-white border-black hover:bg-gray-800'} active:scale-[0.98]`}>
                      {timerState === 'running' ? 'PAUSE' : 'LANJUT'}
                    </button>
                    <button onClick={() => { resetTimer(currentMode); setTimerState('idle'); }} className={`p-3 rounded-full transition-all shadow-md border ${theme === 'dark' ? 'bg-[#0366d6] text-white border-[#0366d6] hover:bg-[#0355b0]' : 'bg-black text-white border-black hover:bg-gray-800'} active:scale-[0.98]`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    </button>
                  </div>
                )}
              </div>
              {isFocusMode && (
                <div className={`mt-4 pt-3 border-t ${borderColor}`}>
                  <input type="text" placeholder="Apa yang sedang kamu kerjakan?" value={currentTask} onChange={(e) => setCurrentTask(e.target.value)} className={`w-full ${inputBg} border-b-2 focus:border-[#0366d6] outline-none transition-all px-2 py-2 text-sm ${theme === 'dark' ? 'border-[#30363d] text-[#e6edf3] placeholder-[#e6edf3]/50' : 'border-black/20 text-black placeholder-black/50'}`} />
                  <p className={`text-[9px] mt-1 ${mutedText}`}>✅ Data akan tersimpan saat sesi selesai.</p>
                </div>
              )}
            </div>
            {!isFocusMode && (
              <div className="w-full text-center mt-4">
                <div className={`flex flex-wrap justify-center gap-3 text-[10px] ${mutedText}`}>
                  <span>⭐ 4.9/5 (200+)</span>
                  <span>⏱️ 10.000+ sesi</span>
                  <span>🔒 Privasi terjaga</span>
                </div>
                <p className={`text-[10px] mt-1 ${mutedText}`}>💳 <span className="font-bold text-[#0366d6]">Rp 10.000</span>/bulan – Bayar sekali, fokus selamanya.</p>
              </div>
            )}
          </div>

          {!isFocusMode && (
            <div className="hidden lg:block lg:col-span-3 space-y-3 lg:mt-12">
              <div className="text-center">
                <p className={`text-[10px] font-bold tracking-wider uppercase ${textColor}`}>☕ Putar Musik</p>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#30363d] mt-1 bg-black">
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/hnGt0Jb2H2g?autoplay=0&mute=1&controls=1&modestbranding=1&rel=0" title="Rainy Day Cafe" frameBorder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
                <a href="https://www.youtube.com/watch?v=hnGt0Jb2H2g" target="_blank" rel="noopener" className={`text-[9px] flex items-center gap-1 justify-center mt-1 transition-colors ${mutedText} hover:text-[#ff0000]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Buka di YouTube
                </a>
              </div>
              <div className={`text-center text-[11px] ${mutedText} border-t border-[#30363d] pt-2 italic`}>
                <p className="font-light">"Fokus bukan tentang menghindari gangguan,</p>
                <p className="font-light">tapi tentang memilih apa yang penting."</p>
                <p className="text-[9px] font-bold mt-1 text-[#0366d6]">— Chronos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className={`flex-shrink-0 w-full text-center text-[10px] py-2 ${mutedText}`}>
        <span>©2026 Chronos</span>
        <span className="mx-2">-</span>
        <Link href="https://jbtech.biz.id" target="_blank" className="hover:underline text-[#0366d6]">jbtech.biz.id</Link>
        <span className="ml-2">All rights reserved.</span>
      </footer>

      {/* ===== MODAL VIP ===== */}
      {showPremiumModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPremiumModal(false);
              setTimerState('idle');
              setCurrentTask('');
              resetTimer(currentMode);
            }
          }}
        >
          <div
            className={`w-full max-w-md mx-4 p-8 rounded-2xl shadow-2xl animate-slide-up ${theme === 'dark' ? 'bg-[#161b22] border border-[#30363d]' : 'bg-white border border-gray-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#e6edf3]' : 'text-black'}`}>Paket VIP</div>
              <div className={`text-sm mt-1 ${mutedText}`}>Akses semua mode timer tanpa batas</div>
            </div>
            <ul className={`space-y-3 text-sm ${theme === 'dark' ? 'text-[#e6edf3]/80' : 'text-black/80'}`}>
              <li className="flex items-center gap-3"><span className="text-[#0366d6]">✓</span> Tanpa Iklan</li>
              <li className="flex items-center gap-3"><span className="text-[#0366d6]">✓</span> Alarm Premium</li>
              <li className="flex items-center gap-3"><span className="text-[#0366d6]">✓</span> Statistik Harian & Mingguan</li>
              <li className="flex items-center gap-3"><span className="text-[#0366d6]">✓</span> Input Tugas Aktif & Simpan Data</li>
            </ul>
            <div className="mt-6 p-4 rounded-xl border border-[#0366d6]/30 bg-[#0366d6]/5 text-center">
              <div className={`text-3xl font-bold text-[#e6edf3]`}>Rp 10.000</div>
              <div className={`text-xs mt-0.5 ${mutedText}`}>/ bulan · berlangganan hingga dibatalkan</div>
            </div>
            <button
              onClick={handleBayarVip}
              disabled={paymentLoading}
              className={`w-full mt-6 py-3 rounded-full font-bold text-sm tracking-wide transition-all ${
                paymentLoading
                  ? 'bg-gray-500 text-white cursor-not-allowed'
                  : 'bg-[#0366d6] text-white border border-[#0366d6] hover:bg-[#0355b0] active:scale-[0.98]'
              }`}
            >
              {paymentLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </span>
              ) : (
                '💳 Bayar & Aktifkan VIP (Rp 10.000)'
              )}
            </button>
            <button
              onClick={() => {
                setShowPremiumModal(false);
                setTimerState('idle');
                setCurrentTask('');
                resetTimer(currentMode);
              }}
              className={`w-full mt-3 py-2 rounded-full text-xs tracking-wide transition-all border ${theme === 'dark' ? 'text-[#e6edf3]/60 border-[#30363d] hover:text-white hover:border-white/30' : 'text-black/60 border-black/20 hover:text-black hover:border-black/50'}`}
            >
              Lewati & lanjutkan (dengan iklan)
            </button>
            <button
              onClick={() => {
                setShowPremiumModal(false);
                setTimerState('idle');
                setCurrentTask('');
                resetTimer(currentMode);
              }}
              className="absolute top-4 right-4 text-2xl text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL LOGIN ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { if (!isLoggingIn) setShowLoginModal(false); }}>
          <div className={`w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl animate-slide-up ${theme === 'dark' ? 'bg-[#161b22] border border-[#30363d]' : 'bg-white border border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#e6edf3]' : 'text-black'}`}>Login</div>
              <div className={`text-sm mt-1 ${mutedText}`}>Masuk dengan akun Google</div>
            </div>
            <button
              onClick={handleLoginWithGoogle}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-bold text-sm tracking-wide transition-all bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 active:scale-[0.98] disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Login dengan Google
                </>
              )}
            </button>
            <button
              onClick={() => { if (!isLoggingIn) setShowLoginModal(false); }}
              className={`w-full mt-3 py-2 rounded-full text-xs tracking-wide transition-all border ${theme === 'dark' ? 'text-[#e6edf3]/60 border-[#30363d] hover:text-white hover:border-white/30' : 'text-black/60 border-black/20 hover:text-black hover:border-black/50'}`}
            >
              Tutup
            </button>
            <button
              onClick={() => { if (!isLoggingIn) setShowLoginModal(false); }}
              className="absolute top-4 right-4 text-2xl text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL QRIS ===== */}
      {showPaymentModal && qrisData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={tutupPaymentModal}>
          <div className={`w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl relative ${theme === 'dark' ? 'bg-[#161b22] border border-[#30363d]' : 'bg-white border border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
            <button onClick={tutupPaymentModal} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center text-3xl mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-[#e6edf3]' : 'text-black'}`}>Bayar VIP</h3>
              <p className={`text-sm ${mutedText}`}>Scan QRIS untuk membayar Rp 10.000</p>
            </div>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <div id="qris-container" className="w-48 h-48 flex items-center justify-center">
                  <canvas id="qrisCanvas" width="180" height="180"></canvas>
                </div>
              </div>
            </div>
            <div className="text-center mb-3">
              <span className={`text-sm font-bold ${countdown < 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                ⏳ Sisa waktu: {formatCountdown(countdown)}
              </span>
            </div>
            <p className={`text-center text-xs ${mutedText}`}>ID: <span className="font-mono">{paymentId}</span></p>
            <button onClick={tutupPaymentModal} className={`w-full mt-4 py-2.5 rounded-lg font-bold text-sm transition ${theme === 'dark' ? 'bg-[#30363d] hover:bg-[#484f58] text-[#e6edf3]' : 'bg-gray-200 hover:bg-gray-300 text-black'}`}>Tutup</button>
            <p className={`text-center text-[10px] mt-2 ${mutedText}`}>Pembayaran akan otomatis terverifikasi. Refresh halaman jika perlu.</p>
          </div>
        </div>
      )}

      {/* ===== MODAL HOW TO USE ===== */}
      {showHowToModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowHowToModal(false)}
        >
          <div
            className={`w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#161b22] border border-[#30363d] text-[#e6edf3]' : 'bg-white border border-gray-200 text-black'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">📖 Cara Pakai Chronos</h2>
              <button
                onClick={() => setShowHowToModal(false)}
                className="w-8 h-8 rounded-full hover:bg-black/10 flex items-center justify-center text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[#0366d6]/20 text-[#0366d6] flex items-center justify-center flex-shrink-0 text-lg font-bold">1</div>
                <div>
                  <p className="font-bold">Pilih Mode Timer</p>
                  <p className={`text-xs ${mutedText}`}>Fokus (25 menit) · Istirahat Singkat (5 menit) · Istirahat Panjang (15 menit)</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[#0366d6]/20 text-[#0366d6] flex items-center justify-center flex-shrink-0 text-lg font-bold">2</div>
                <div>
                  <p className="font-bold">Mulai Timer</p>
                  <p className={`text-xs ${mutedText}`}>Tekan <span className="font-bold">MULAI</span> untuk mulai fokus. Timer akan berdetak mundur.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[#0366d6]/20 text-[#0366d6] flex items-center justify-center flex-shrink-0 text-lg font-bold">3</div>
                <div>
                  <p className="font-bold">Mode VIP (Tanpa Iklan)</p>
                  <p className={`text-xs ${mutedText}`}>Aktifkan VIP untuk menghilangkan iklan, akses alarm premium, dan simpan data sesi.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[#0366d6]/20 text-[#0366d6] flex items-center justify-center flex-shrink-0 text-lg font-bold">4</div>
                <div>
                  <p className="font-bold">Login & Statistik</p>
                  <p className={`text-xs ${mutedText}`}>Setelah bayar VIP, login dengan Google untuk melihat laporan lengkap sesi Anda.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-[#0366d6]/20 text-[#0366d6] flex items-center justify-center flex-shrink-0 text-lg font-bold">5</div>
                <div>
                  <p className="font-bold">Putar Musik</p>
                  <p className={`text-xs ${mutedText}`}>Nikmati musik latar dari YouTube untuk menemani fokus Anda. Klik ikon suara untuk mengaktifkan audio.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowToModal(false)}
              className="w-full mt-6 py-2.5 rounded-full bg-[#0366d6] text-white font-bold text-sm hover:bg-[#0355b0] transition"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ===== QRCode.js ===== */}
      {showPaymentModal && qrisData && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(() => {
                const canvas = document.getElementById('qrisCanvas');
                if (canvas && window.QRCode) {
                  new QRCode(canvas, {
                    text: ${JSON.stringify(qrisData)},
                    width: 180,
                    height: 180,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H,
                  });
                }
              }, 200);
            `,
          }}
        />
      )}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" />
    </div>
  );
}