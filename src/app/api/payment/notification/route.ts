import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

const isProduction = process.env.NODE_ENV === 'production';

// ============================================================
//  KONFIGURASI MIDTRANS (Core API untuk verifikasi)
// ============================================================
const coreApi = new midtransClient.CoreApi({
  isProduction: isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

// ============================================================
//  ENDPOINT: POST /api/payment/notification
// ============================================================
export async function POST(request: Request) {
  try {
    // 1. Ambil body notifikasi
    const body = await request.json();
    console.log('📥 Notification received:', body);

    // 2. Verifikasi notifikasi menggunakan CoreApi
    let isValid = false;
    try {
      // Gunakan method notification dari CoreApi
      // @ts-ignore - method mungkin tidak terdeteksi di type
      const statusResponse = await coreApi.transaction.notification(body);
      if (statusResponse && statusResponse.status_code) {
        isValid = true;
        console.log('✅ Notification verified via CoreApi');
      }
    } catch (verifyError) {
      console.warn('⚠️ CoreApi verification failed, trying manual check:', verifyError);
      
      // Fallback: cek signature manual (cara lama)
      const signatureKey = process.env.MIDTRANS_SERVER_KEY!;
      const orderId = body.order_id;
      const statusCode = body.status_code;
      const grossAmount = body.gross_amount;
      const serverKey = signatureKey;
      
      // Hash manual: SHA512(order_id + status_code + gross_amount + server_key)
      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');
      
      if (hash === body.signature_key) {
        isValid = true;
        console.log('✅ Notification verified via manual signature');
      } else {
        console.warn('❌ Signature mismatch');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // 3. Proses data transaksi
    const { order_id, transaction_status, gross_amount } = body;

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      // order_id format: VIP-{userId}-{timestamp}
      const parts = order_id.split('-');
      const userId = parts.length >= 2 ? parts[1] : null;

      if (!userId) {
        console.warn('⚠️ User ID tidak ditemukan di order_id:', order_id);
        return NextResponse.json({ status: 'OK', message: 'User ID not found' });
      }

      // Hitung durasi VIP: 1 bulan per 10.000
      const amount = parseInt(gross_amount) || 10000;
      const months = Math.floor(amount / 10000) || 1;
      
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);
      const expiryDateStr = newExpiry.toISOString().split('T')[0];

      // Update ke Supabase
      const { supabase } = await import('@/lib/supabaseClient');
      const { error } = await supabase
        .from('profiles')
        .update({ vip_expiry: expiryDateStr })
        .eq('id', userId);

      if (error) {
        console.error('❌ Gagal update VIP di Supabase:', error);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      console.log(`✅ VIP activated for user ${userId} until ${expiryDateStr}`);
    }

    // 4. Response sukses (Midtrans expects 200 OK)
    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}