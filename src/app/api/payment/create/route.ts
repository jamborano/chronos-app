import { NextRequest, NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

export async function POST(req: NextRequest) {
  try {
    const { tripId, customerName, phone, qty, provider } = await req.json();

    // Validasi input
    if (!tripId || !customerName || !phone || !qty || !provider) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Konfigurasi Midtrans
    const snap = new midtransClient.Snap({
      isProduction: false, // true untuk production
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    });

    // Harga VIP (Rp 10.000)
    const price = 10000;
    const totalAmount = price * qty;

    // Parameter order
    const parameter = {
      transaction_details: {
        order_id: `CHRONOS-VIP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: customerName,
        phone: phone,
      },
      item_details: [
        {
          id: 'VIP-PACKAGE',
          price: price,
          quantity: qty,
          name: `Paket VIP Chronos (${qty} bulan)`,
        },
      ],
      // Untuk GoPay QRIS
      payment_methods: provider === 'GOPAY' ? ['gopay'] : ['bank_transfer'],
    };

    // Buat transaksi
    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      // Untuk QRIS, kita bisa ambil dari transaction
      qrisString: transaction.gopay?.qr_code || null,
      paymentId: transaction.transaction_id,
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat pembayaran' },
      { status: 500 }
    );
  }
}