import dayjs from 'dayjs';

export function formatPrice(value: number | string | null | undefined, withSymbol = true): string {
  const n = Number(value || 0);
  const s = n.toFixed(2);
  return withSymbol ? `¥${s}` : s;
}

export function formatDate(value?: string | number | Date | null, fmt = 'YYYY-MM-DD HH:mm'): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(fmt) : '—';
}

export function formatRelativeTime(value?: string | number | Date | null): string {
  if (!value) return '—';
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  const diff = dayjs().diff(d, 'minute');
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff} 分钟前`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} 小时前`;
  if (diff < 60 * 24 * 7) return `${Math.floor(diff / 60 / 24)} 天前`;
  return d.format('YYYY-MM-DD');
}

export function formatPhone(phone?: string): string {
  if (!phone || phone.length !== 11) return phone || '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
