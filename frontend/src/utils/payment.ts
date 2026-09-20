import { PaymentMethod, Payment } from '../types';

export type ReceivedPaymentMethod = Payment['method'];

/**
 * Normalizes UI payment method to backend API representation.
 */
export const toBackendPaymentMethod = (
  method: PaymentMethod | string
): 'cash' | 'upi' | 'card' | 'bank_transfer' => {
  const m = (method || '').toLowerCase().trim();
  if (m === 'bank transfer' || m === 'bank_transfer') return 'bank_transfer';
  if (m === 'upi') return 'upi';
  if (m === 'card') return 'card';
  return 'cash';
};

/**
 * Normalizes backend API payment method to frontend UI representation for payments.
 */
export const toFrontendPaymentMethod = (backendMethod?: string): ReceivedPaymentMethod => {
  if (!backendMethod) return 'Cash';
  const m = backendMethod.toLowerCase().trim();
  if (m === 'upi') return 'UPI';
  if (m === 'card') return 'Card';
  if (m === 'bank_transfer' || m === 'bank transfer') return 'Bank Transfer';
  return 'Cash';
};
