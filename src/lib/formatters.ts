import type { DayCode } from '../types/hrm';

export const DAY_LABELS: Record<DayCode, string> = {
  Mon: 'Sen',
  Tue: 'Sel',
  Wed: 'Rab',
  Thu: 'Kam',
  Fri: 'Jum',
  Sat: 'Sab',
  Sun: 'Min',
};

export const ALL_DAYS: DayCode[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthBounds(yearMonth: string): { start: string; end: string; label: string } {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const month = Number(mStr) || new Date().getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );
  return { start, end, label };
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

export function formatTimeShort(isoOrEmpty: string): string {
  if (!isoOrEmpty) return '—';
  const d = new Date(isoOrEmpty);
  if (Number.isNaN(d.getTime())) return isoOrEmpty;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0j 0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}j ${mins}m`;
}

export function computeMinutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.min(1440, Math.round((end - start) / 60000));
}

export function isClockInLate(
  clockInDate: Date,
  scheduleStartTime: string,
  toleranceMinutes: number
): boolean {
  const [hStr, mStr] = (scheduleStartTime || '08:00').split(':');
  const target = new Date(clockInDate);
  target.setHours(Number(hStr) || 8, (Number(mStr) || 0) + (toleranceMinutes || 0), 59, 999);
  return clockInDate.getTime() > target.getTime();
}

export function getDayCode(date: Date = new Date()): DayCode {
  const map: DayCode[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[date.getDay()];
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function truncate(str: string, max: number): string {
  return (str || '').trim().slice(0, max);
}

export interface CsvExportOptions {
  delimiter?: ';' | ',';
  metadataRows?: [string, string | number][];
  summaryRow?: (string | number)[];
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  options: CsvExportOptions = {}
) {
  const delimiter = options.delimiter ?? ';';

  const escapeCell = (cell: string | number) => {
    if (typeof cell === 'number') {
      return Number.isFinite(cell) ? String(cell) : '0';
    }
    let val = String(cell ?? '');
    // Guard against spreadsheet formula injection on string cells
    if (/^[=+\-@\t\r]/.test(val)) {
      val = `'${val}`;
    }
    if (
      val.includes(delimiter) ||
      val.includes(',') ||
      val.includes('"') ||
      val.includes('\n') ||
      val.includes('\r')
    ) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines: string[] = [];

  if (options.metadataRows && options.metadataRows.length > 0) {
    for (const [key, value] of options.metadataRows) {
      lines.push([escapeCell(key), escapeCell(value)].join(delimiter));
    }
    lines.push('');
  }

  lines.push(headers.map(escapeCell).join(delimiter));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(delimiter));
  }

  if (options.summaryRow && options.summaryRow.length > 0) {
    lines.push(options.summaryRow.map(escapeCell).join(delimiter));
  }

  const csv = lines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

