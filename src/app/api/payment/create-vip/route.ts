import { NextResponse } from 'next/server';

// ============================================================
//  KONFIGURASI MIDTRANS (dari .env)
// ============================================================
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const MIDTRANS_IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://api.midtrans.com/v2/charge'
  : 'https://api.sandbox.midtrans.com/v2/charge';

// ============================================================
//  FUNGSI MEMBUAT QRIS VIA MIDTRANS API
// ============================================================
async function createQrisTransaction(orderId: string, grossAmount: number, customerDetails: any) {
  const requestBody = {
    payment_type: 'gopay',
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    customer_details: customerDetails,
    item_details: [
      {
        id: 'vip-subscription',
        price: grossAmount,
        quantity: 1,
        name: 'VIP Subscription 1 Bulan',
      },
    ],
    gopay: {
      enable_callback: true,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/notification`,
    },
    expiry: {
      start_time: new Date().toISOString(),
      duration: 5,
      unit: 'minutes',
    },
  };

  const response = await fetch(MIDTRANS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Midtrans API error:', errorData);
    throw new Error(errorData.message || 'Midtrans request failed');
  }

  return response.json();
}

// ============================================================
//  ENDPOINT: POST /api/payment/create-vip
// ============================================================
export async function POST(request: Request) {
  try {
    // 1. Ambil data dari request body
    const { userId, email, name, amount = 10000 } = await request.json();

    // 2. Validasi
    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    }

    // 3. Buat order ID unik
    const orderId = `VIP-${userId}-${Date.now()}`;

    // 4. Siapkan data customer
    const customerDetails = {
      first_name: name || 'Pengguna',
      email: email,
    };

    // 5. Panggil API Midtrans
    const transaction = await createQrisTransaction(orderId, amount, customerDetails);

    // 6. Ambil QRIS URL dari response
    const actions = transaction.actions || [];
    const qrisAction = actions.find((action: any) => action.name === 'generate-qr-code');
    const qrisString = qrisAction?.url || transaction.qr_code || transaction.gopay?.qr_code || '';

    if (!qrisString) {
      console.error('QRIS tidak ditemukan:', transaction);
      throw new Error('QRIS tidak ditemukan dalam response Midtrans');
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      qrisString: qrisString,
      expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      paymentId: orderId,
      bookingId: orderId,
      transactionId: transaction.transaction_id,
    });
  } catch (error: any) {
    console.error('❌ Midtrans error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat pembayaran' },
      { status: 500 }
    );
  }
}