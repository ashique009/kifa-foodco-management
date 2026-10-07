/**
 * Canonical date and time formatting utilities.
 */

export const getTodayIsoString = (): string => {
  return new Date().toISOString().slice(0, 10);
};


export const formatMonthDay = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};
