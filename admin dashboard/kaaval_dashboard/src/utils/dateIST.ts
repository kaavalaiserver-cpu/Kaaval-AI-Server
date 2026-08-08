/**
 * Shared date/time utility that always formats in Indian Standard Time (IST)
 * regardless of the browser/OS timezone of the viewing machine.
 */
const IST = 'Asia/Kolkata';
const LOCALE = 'en-IN';

/** "20 Jul 2026, 07:42:19 am" */
export function formatIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString(LOCALE, {
    timeZone: IST,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

/** "20/7/2026" */
export function formatDateIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString(LOCALE, { timeZone: IST });
}

/** "07:42:19 am" */
export function formatTimeIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString(LOCALE, { timeZone: IST, hour12: false });
}

/** "07:42 am" */
export function formatTimeShortIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString(LOCALE, { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Today's date as YYYY-MM-DD string (in IST) */
export function getTodayIST(): string {
  const d = new Date().toLocaleString('en-US', { timeZone: IST });
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
