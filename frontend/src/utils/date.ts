/**
 * Canonical date and time formatting utilities.
 */

export const getTodayIsoString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const toIsoDateString = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  try {
    return new Date(dateInput).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

export const formatTimeShort = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  try {
    return new Date(dateInput).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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
