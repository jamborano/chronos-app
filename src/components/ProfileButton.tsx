'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function ProfileButton() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [vipExpiry, setVipExpiry] = useState<string | null>(null);

  useEffect(() => {
    // Ambil session saat mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Cek VIP expiry dari database (contoh, kita simpan di metadata user)
        // Atau fetch dari tabel profiles
        const expiry = session.user.user_metadata?.vip_expiry;
        setVipExpiry(expiry || null);
      }
    });

    // Subscribe ke perubahan auth
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const expiry = session.user.user_metadata?.vip_expiry;
        setVipExpiry(expiry || null);
      } else {
        setVipExpiry(null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsOpen(false);
    // Refresh halaman (opsional)
    window.location.reload();
  };

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border bg-[#0366d6] text-white border-[#0366d6] hover:bg-[#0355b0] transition-all"
      >
        Login
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#30363d] hover:border-white transition-all focus:outline-none"
      >
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt="Profile"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#30363d] flex items-center justify-center text-white text-sm font-bold">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-4 z-50">
          <div className="flex items-center gap-3 border-b border-[#30363d] pb-3 mb-3">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Profile"
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#30363d] flex items-center justify-center text-white font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-[#e6edf3]/60 truncate">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#e6edf3]/60">Status</span>
              <span className={vipExpiry ? 'text-green-400' : 'text-yellow-400'}>
                {vipExpiry ? '✅ VIP Aktif' : '⚡ Free'}
              </span>
            </div>
            {vipExpiry && (
              <div className="flex justify-between">
                <span className="text-[#e6edf3]/60">Berlaku hingga</span>
                <span className="text-white">{new Date(vipExpiry).toLocaleDateString('id-ID')}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-semibold transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}