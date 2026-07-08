'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSuccess() {
  const router = useRouter();
  useEffect(() => {
    // Refresh status VIP dari Supabase
    localStorage.setItem('chronos_vip_status', JSON.stringify({
      isVipMode: true,
      isFocusMode: true,
    }));
    setTimeout(() => router.push('/'), 3000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#e6edf3]">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Pembayaran Berhasil!</h1>
        <p className="text-[#e6edf3]/60">VIP aktif. Redirecting ke timer...</p>
      </div>
    </div>
  );
}