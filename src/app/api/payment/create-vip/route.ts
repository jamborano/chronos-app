import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

// ============================================================
//  🔥 KONFIGURASI MIDTRANS
// ============================================================
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log(`🔧 Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
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
    const body = await request.json();
    const { userId, email, name, amount = 29000 } = body; // 🔥 harga default 29.000

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID dan email wajib diisi' },
        { status: 400 }
      );
    }

    const shortUserId = userId.replace(/-/g, '').slice(0, 8);
    const orderId = `VIP-${shortUserId}-${Date.now()}`;

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
    };

    console.log(`📤 Creating transaction: ${orderId}`);
    const transaction: any = await snap.createTransaction(parameter);
    console.log(`✅ Transaction created: ${transaction.transaction_id}`);

    let qrisString = '';
    if (transaction.actions && Array.isArray(transaction.actions)) {
      const qrisAction = transaction.actions.find(
        (a: any) => a.name === 'generate-qr-code'
      );
      if (qrisAction) qrisString = qrisAction.url;
      if (!qrisString) {
        const qrAction = transaction.actions.find((a: any) => a.name === 'qr-code');
        if (qrAction) qrisString = qrAction.url;
      }
    }
    if (!qrisString && transaction.qr_code) {
      qrisString = transaction.qr_code;
    }

    return NextResponse.json({
      success: true,
      qrisString: qrisString || null,
      redirectUrl: transaction.redirect_url || '',
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      paymentId: orderId,
      transactionId: transaction.transaction_id,
    });
  } catch (error: any) {
    console.error('❌ Midtrans error:', error);

    let errorMessage = 'Gagal membuat pembayaran';
    let statusCode = 500;

    if (error.ApiResponse?.error_messages) {
      errorMessage = error.ApiResponse.error_messages.join(', ');
      statusCode = error.httpStatusCode || 500;
    } else if (error.message) {
      errorMessage = error.message;
    }

    if (statusCode === 401 || errorMessage.toLowerCase().includes('unauthorized')) {
      errorMessage = '🔑 Server Key Midtrans tidak valid. Pastikan Anda menggunakan key yang benar.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}