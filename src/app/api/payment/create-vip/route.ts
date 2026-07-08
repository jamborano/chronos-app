import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

const isProduction = process.env.NODE_ENV === 'production';

const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export async function POST(request: Request) {
  try {
    const { userId, email, name, amount = 10000 } = await request.json();

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
      payment_methods: ['gopay'],
      gopay: {
        enable_callback: true,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/notification`,
      },
    };

    // 🔥 Cast ke any untuk menghindari error TypeScript di properti actions
    const transaction: any = await snap.createTransaction(parameter);

    // Ambil QRIS dari actions atau qr_code
    let qrisString = '';
    if (transaction.actions && Array.isArray(transaction.actions)) {
      const qrisAction = transaction.actions.find(
        (action: any) => action.name === 'generate-qr-code'
      );
      if (qrisAction) {
        qrisString = qrisAction.url;
      }
    }

    // Fallback ke qr_code langsung
    if (!qrisString && transaction.qr_code) {
      qrisString = transaction.qr_code;
    }

    // Jika masih tidak ada, coba dari actions dengan name 'qr-code'
    if (!qrisString && transaction.actions) {
      const qrAction = transaction.actions.find((a: any) => a.name === 'qr-code');
      if (qrAction) {
        qrisString = qrAction.url;
      }
    }

    if (!qrisString) {
      console.error('❌ QRIS tidak ditemukan. Transaction:', JSON.stringify(transaction, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: 'QRIS tidak ditemukan, coba metode pembayaran lain',
          transactionId: transaction.transaction_id 
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
    return NextResponse.json(
      { error: error.message || 'Gagal membuat pembayaran' },
      { status: 500 }
    );
  }
}