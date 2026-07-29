import { CheckoutForm } from '@/components/forms/checkout-form';

export default function CheckoutPage() {
  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Thanh toán</p>
        <h1 className="text-4xl font-bold text-white">Hoàn tất đặt vé</h1>
      </div>

      <div className="mt-10 max-w-3xl">
        <CheckoutForm subtotal={170000} bookingFee={15000} />
      </div>
    </main>
  );
}