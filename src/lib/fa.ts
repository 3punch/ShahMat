/** ابزارهای نمایش فارسی */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function sideName(side: 'gold' | 'azure'): string {
  return side === 'gold' ? 'سپاه طلایی' : 'سپاه لاجوردی';
}
