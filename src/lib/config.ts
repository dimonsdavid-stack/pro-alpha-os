export const commercial = Object.freeze({
  product: 'Pro Alpha OS', company: 'Pro Alpha Systems', merchant: 'Crestside Consultants LLC',
  canonical: 'https://pro-alpha-os.vercel.app', currency: 'usd', yearOneCents: 499900,
  fullPayCents: 449900, renewalCents: 99900, version: '2026.09.30',
  fees: 'Government, state, registered-agent, expedited-processing and third-party fees are passed through at actual cost. Each cost requires your authorization before it is incurred.',
  refund: 'Request a refund within 14 days of activation before an authorized external submission. Authorized external costs already incurred are non-refundable. Statutory rights remain unaffected.',
  support: process.env.SUPPORT_EMAIL || '',
});
export const savingsCents = commercial.yearOneCents - commercial.fullPayCents;
export const money = (cents:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
export type ProviderState = 'DISABLED'|'SANDBOX'|'PENDING_MERCHANT_APPROVAL'|'PRODUCTION_READY';
export const financing = ['affirm','klarna','paypal','splitit'].map(id=>({id,state:(process.env[`FINANCING_${id.toUpperCase()}_STATE`] || 'DISABLED') as ProviderState}));
export const productionFinancing = () => financing.filter(p=>p.state==='PRODUCTION_READY' && ['affirm','klarna'].includes(p.id));
export const commerceReady = () => !!(process.env.DATABASE_URL && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.COMMERCE_ENABLED==='true');
