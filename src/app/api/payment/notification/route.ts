// src/app/api/payment/notification/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔥 Fungsi verifikasi signature
function verifySignature(payload: any, signature: string, publicKey: string): boolean {
  try {
    // Ambil data yang ditandatangani
    const hashed = crypto.createHash('sha512').update(JSON.stringify(payload)).digest('hex');
    const verifier = crypto.createVerify('RSA-SHA512');
    verifier.update(hashed);
    return verifier.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-midtrans-signature') || '';

    // 🔥 Verifikasi signature
    const publicKey = process.env.MIDTRANS_PUBLIC_KEY!;
    if (!verifySignature(body, signature, publicKey)) {
      console.warn('❌ Invalid signature from Midtrans');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { order_id, transaction_status, gross_amount } = body;

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const userId = order_id.split('-')[1];
      if (userId) {
        const months = Math.floor(gross_amount / 10000) || 1;
        const newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + months);
        const expiryDateStr = newExpiry.toISOString().split('T')[0];

        const { error } = await supabase
          .from('profiles')
          .update({ vip_expiry: expiryDateStr })
          .eq('id', userId);

        if (error) {
          console.error('❌ Gagal update VIP:', error);
        } else {
          console.log(`✅ VIP activated for user ${userId} until ${expiryDateStr}`);
        }
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}