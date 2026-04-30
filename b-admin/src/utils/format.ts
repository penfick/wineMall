/**
 * 通用格式化工具
 */
import dayjs from 'dayjs';

export function formatMoney(amount: number | string | null | undefined, withSymbol = true): string {
  if (amount === null || amount === undefined || amount === '') return withSymbol ? '¥0.00' : '0.00';
  const n = Number(amount);
  if (Number.isNaN(n)) return withSymbol ? '¥0.00' : '0.00';
  const formatted = n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withSymbol ? `¥${formatted}` : formatted;
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '0';
  const v = Number(n);
  if (Number.isNaN(v)) return '0';
  return v.toLocaleString('zh-CN');
}

export function formatDate(date?: string | Date | null, fmt = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return '-';
  const d = dayjs(date);
  return d.isValid() ? d.format(fmt) : '-';
}

export function formatPercent(n: number | string, digits = 2): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '0%';
  return `${v.toFixed(digits)}%`;
}
