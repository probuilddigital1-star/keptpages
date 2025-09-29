export const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/[^0-9.-]/g, '')) || 0;
};

export const fmtMoney = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(toNumber(n));