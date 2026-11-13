export const stages = ['Submitted', 'In review', 'Quoted', 'Confirmed', 'Dispatched', 'Delivered', 'Declined'];
export const transitions = {
  Submitted: ['In review', 'Quoted', 'Declined'],
  'In review': ['Quoted', 'Declined'],
  Quoted: ['Confirmed', 'Declined'],
  Confirmed: ['Dispatched'],
  Dispatched: ['Delivered'],
  Delivered: [],
  Declined: []
};

export const money = (number, decimals = 0) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: decimals, minimumFractionDigits: decimals
}).format(number || 0);

export const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
export const pinValid = (pin) => /^[1-9]\d{5}$/.test(pin);
export const quantityValid = (n) => Number.isInteger(n) && n >= 1 && n <= 100000;

export function estimate(pin, items, service = 'Standard') {
  if (!pinValid(pin) || !items.length || items.some(item => !quantityValid(Number(item.quantity)))) return null;
  const units = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const near = ['11', '12', '13', '14', '15', '16', '17', '24', '25'].includes(pin.slice(0, 2));
  const priority = service === 'Priority';
  const madeToOrder = items.some(item => item.customShade) || units > 1000;
  const min = (near ? 3 : 5) + (madeToOrder ? 4 : 0) - (priority ? 1 : 0);
  const max = min + (near ? 2 : 3);
  const freight = (priority ? 430 : 220) + Math.ceil(units / 50) * (near ? 45 : 70);
  return { min, max, freight, units };
}

export function pricing({ quantity, unitCost, freight, handling, markup, mode, gst }) {
  const base = round(quantity * unitCost);
  const cost = round(base + freight + handling);
  const revenue = round(mode === 'margin' ? cost / (1 - markup / 100) : cost * (1 + markup / 100));
  const profit = round(revenue - cost);
  const tax = round(revenue * gst / 100);
  return { base, cost, revenue, profit, tax, total: round(revenue + tax), margin: revenue ? profit / revenue * 100 : 0,
    perUnit: quantity ? round(revenue / quantity) : 0 };
}

export function resaleProfit(quote, resale) {
  return round(resale.revenue - quote.subtotal - quote.freight - resale.expenses);
}
