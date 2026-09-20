/**
 * Canonical currency and number formatting utilities.
 * Preserves en-IN locale conventions without modifying UI presentation.
 */

export const formatINR = (amount?: number | null): string => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

export const formatNumber = (num?: number | null): string => {
  return Number(num || 0).toLocaleString('en-IN');
};
