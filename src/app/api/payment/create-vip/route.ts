import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

// ============================================================
//  🔥 KONFIGURASI MIDTRANS YANG BENAR
// ============================================================
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY!;
const clientKey = process.env.MIDTRANS_CLIENT_KEY!;

// 🔥 Validasi key
if (!serverKey || !clientKey) {
  console.error('❌ MIDTRANS_SERVER_KEY atau MIDTRANS_CLIENT_KEY tidak ditemukan!');
}
if (isProduction && !serverKey.startsWith('Mid-server-')) {
  console.warn('⚠️ Mode Production tapi Server Key tidak diawali "Mid-server-". Periksa kembali.');
}
if (!isProduction && !serverKey.startsWith('SB-Mid-server-')) {
  console.warn('⚠️ Mode Sandbox tapi Server Key tidak diawali "SB-Mid-server-". Periksa kembali.');
}

console.log(`🔧 Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`🔑 Server Key: ${serverKey.substring(0, 15)}... (${serverKey.length} chars)`);
console.log(`🔑 Client Key: ${clientKey.substring(0, 15)}... (${clientKey.length} chars)`);

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
    const { userId, email, name, amount = 10000 } = await request.json();

    // 🔥 Validasi input
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID dan email wajib diisi' },
        { status: 400 }
      );
    }

    const orderId = `VIP-${userId}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: name || 'Pengguna',
        email: email,
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
      // 🔥 Gunakan 'qris' sebagai payment_method (bukan 'gopay')
      payment_methods: ['qris'],
      qris: {
        enable_callback: true,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/notification`,
      },
    };

    // 🔥 Buat transaksi ke Midtrans
    const transaction: any = await snap.createTransaction(parameter);

    // 🔥 Ambil QRIS dari response
    let qrisString = '';
    if (transaction.actions && Array.isArray(transaction.actions)) {
      const qrisAction = transaction.actions.find(
        (action: any) => action.name === 'generate-qr-code'
      );
      if (qrisAction) {
        qrisString = qrisAction.url;
      }
    }

    if (!qrisString && transaction.qr_code) {
      qrisString = transaction.qr_code;
    }

    if (!qrisString) {
      console.error('❌ QRIS tidak ditemukan. Transaction:', JSON.stringify(transaction, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'QRIS tidak ditemukan. Coba metode pembayaran lain.',
          transactionId: transaction.transaction_id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrisString,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      paymentId: orderId,
      bookingId: orderId,
      transactionId: transaction.transaction_id,
    });
  } catch (error: any) {
    console.error('❌ Midtrans error:', error);

    // 🔥 Error handling lebih detail
    let errorMessage = 'Gagal membuat pembayaran. Periksa Server Key.';
    let statusCode = 500;

    if (error.response?.data?.error_messages) {
      errorMessage = error.response.data.error_messages.join(', ');
      statusCode = error.response.status || 500;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 🔥 Jika error 401, beri pesan jelas
    if (statusCode === 401 || errorMessage.includes('unauthorized')) {
      errorMessage = '🔑 Server Key Midtrans tidak valid. Pastikan Anda menggunakan key yang benar (Sandbox: awalan SB-, Production: tanpa awalan).';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}