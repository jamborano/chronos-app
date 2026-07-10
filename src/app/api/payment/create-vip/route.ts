import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

// ============================================================
//  🔥 KONFIGURASI MIDTRANS
// ============================================================
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 🔥 Logging untuk debug (tanpa ekspos full key)
console.log(`🔧 Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`🔑 Server Key: ${serverKey.substring(0, 10)}... (${serverKey.length} chars)`);
console.log(`🔑 Client Key: ${clientKey.substring(0, 10)}... (${clientKey.length} chars)`);
console.log(`🌐 App URL: ${appUrl}`);

// ============================================================
//  INIT MIDTRANS CLIENT
// ============================================================
const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey,
});

// ============================================================
//  ENDPOINT: POST /api/payment/create-vip
// ============================================================
export async function POST(request: Request) {
  try {
    // 1. Parse & validasi body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Format request tidak valid (harus JSON)' },
        { status: 400 }
      );
    }

    const { userId, email, name, amount = 10000 } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID dan email wajib diisi' },
        { status: 400 }
      );
    }

    // 2. Buat order ID unik
    const orderId = `VIP-${userId}-${Date.now()}`;

    // 3. Parameter transaksi
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: name || 'Pengguna',
        email: email,
        phone: body.phone || '081234567890',
      },
      item_details: [
        {
          id: 'vip-subscription-1month',
          price: amount,
          quantity: 1,
          name: 'VIP Subscription 1 Bulan',
          brand: 'Chronos',
          category: 'Subscription',
        },
      ],
      // 🔥 Biarkan Midtrans memilih payment channel yang sudah aktif
      // Hapus payment_methods agar fleksibel
    };

    // 4. Kirim ke Midtrans
    console.log(`📤 Creating transaction for order: ${orderId}`);
    const transaction: any = await snap.createTransaction(parameter);
    console.log(`✅ Transaction created: ${transaction.transaction_id}`);

    // 5. Ambil QRIS / GoPay dari response
    let qrisString = '';
    let redirectUrl = transaction.redirect_url || '';

    // 🔥 Cara paling aman: ambil dari actions array
    if (transaction.actions && Array.isArray(transaction.actions)) {
      // Coba cari 'generate-qr-code' (untuk QRIS)
      let qrisAction = transaction.actions.find(
        (a: any) => a.name === 'generate-qr-code'
      );
      if (qrisAction) {
        qrisString = qrisAction.url;
      }
      
      // Jika tidak ada, cari 'qr-code'
      if (!qrisString) {
        const qrAction = transaction.actions.find(
          (a: any) => a.name === 'qr-code'
        );
        if (qrAction) {
          qrisString = qrAction.url;
        }
      }
    }

    // 🔥 Fallback: cek properti qr_code langsung
    if (!qrisString && transaction.qr_code) {
      qrisString = transaction.qr_code;
    }

    // 6. Jika QRIS tidak ditemukan, beri info & fallback ke redirect_url
    if (!qrisString) {
      console.warn('⚠️ QRIS tidak ditemukan, fallback ke redirect URL');
      return NextResponse.json({
        success: true,
        qrisString: null,
        redirectUrl: redirectUrl,
        paymentId: orderId,
        transactionId: transaction.transaction_id,
        message: 'QRIS tidak tersedia, silakan klik link pembayaran',
      });
    }

    // 7. Return sukses dengan QRIS
    return NextResponse.json({
      success: true,
      qrisString: qrisString,
      redirectUrl: redirectUrl,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      paymentId: orderId,
      transactionId: transaction.transaction_id,
    });
  } catch (error: any) {
    // 🔥 Error handling detail
    console.error('❌ Midtrans error:', error);

    let errorMessage = 'Gagal membuat pembayaran';
    let statusCode = 500;

    // Tangani error dari Midtrans
    if (error.ApiResponse?.error_messages) {
      errorMessage = error.ApiResponse.error_messages.join(', ');
      statusCode = error.httpStatusCode || 500;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 🔥 Pesan khusus untuk 401
    if (statusCode === 401 || errorMessage.toLowerCase().includes('unauthorized')) {
      errorMessage = '🔑 Server Key Midtrans tidak valid. Pastikan Anda menggunakan key yang benar (Sandbox: awalan SB-, Production: tanpa awalan).';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}