import crypto from 'node:crypto';

const SIGNED_FIELDS = [
  'order_amount',
  'merchant',
  'currency',
  'operation',
  'order_description',
  'order_invoice_number',
  'customer_id',
  'payment_method',
  'success_url',
  'error_url',
  'cancel_url',
] as const;

type SepayCheckoutFields = {
  order_amount: string;
  merchant: string;
  currency: 'VND';
  operation: 'PURCHASE' | 'VERIFY';
  order_description: string;
  order_invoice_number: string;
  customer_id?: string;
  payment_method?:
    | 'CARD'
    | 'BANK_TRANSFER'
    | 'NAPAS_BANK_TRANSFER';
  success_url?: string;
  error_url?: string;
  cancel_url?: string;
};

export function createPaymentDescription(
  bookingCode: string,
): string {
  const prefix =
    process.env.SEPAY_PAYMENT_PREFIX ??
    'MOVIE';

  return `${prefix} ${bookingCode}`;
}

export function getSepayConfig() {
  const env =
    process.env.SEPAY_ENV ??
    'sandbox';

  const merchantId =
    process.env.SEPAY_MERCHANT_ID;

  const secretKey =
    process.env.SEPAY_SECRET_KEY;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL;

  if (!merchantId || !secretKey) {
    throw new Error(
      'MISSING_SEPAY_CREDENTIALS',
    );
  }

  if (!appUrl) {
    throw new Error(
      'MISSING_APP_URL',
    );
  }

  const checkoutUrl =
    env === 'production'
      ? 'https://pay.sepay.vn/v1/checkout/init'
      : 'https://pay-sandbox.sepay.vn/v1/checkout/init';

  return {
    env,
    merchantId,
    secretKey,
    appUrl: appUrl.replace(
      /\/+$/,
      '',
    ),
    checkoutUrl,
  };
}

export function createSepaySignature(
  fields: SepayCheckoutFields,
  secretKey: string,
): string {
  const signedParts: string[] = [];

  for (const field of SIGNED_FIELDS) {
    const value = fields[field];

    if (
      value === undefined ||
      value === null
    ) {
      continue;
    }

    signedParts.push(
      `${field}=${value}`,
    );
  }

  const signedString =
    signedParts.join(',');

  return crypto
    .createHmac(
      'sha256',
      secretKey,
    )
    .update(signedString)
    .digest('base64');
}

export function createSepayCheckoutFields(
  options: {
    amount: number;
    bookingCode: string;
    customerId: string;
    successUrl: string;
    errorUrl: string;
    cancelUrl: string;
  },
) {
  const config =
    getSepayConfig();

  const fields: SepayCheckoutFields = {
    order_amount: String(
      options.amount,
    ),

    merchant:
      config.merchantId,

    currency: 'VND',

    operation: 'PURCHASE',

    order_description:
      createPaymentDescription(
        options.bookingCode,
      ),

    // Mỗi booking một invoice riêng
    order_invoice_number:
      options.bookingCode,

    customer_id:
      options.customerId,

    // Sandbox thanh toán bằng bank transfer/QR
    payment_method:
      'BANK_TRANSFER',

    success_url:
      options.successUrl,

    error_url:
      options.errorUrl,

    cancel_url:
      options.cancelUrl,
  };

  const signature =
    createSepaySignature(
      fields,
      config.secretKey,
    );

  return {
    fields,
    signature,
    checkoutUrl:
      config.checkoutUrl,
  };
}