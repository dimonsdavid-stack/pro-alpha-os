import Stripe from 'stripe';
import {randomUUID} from 'node:crypto';
import {db,transaction} from './db';
import {commercial} from './config';
import {modules} from './workflows';
import {recordEvent} from './analytics';
export function stripe(){if(!process.env.STRIPE_SECRET_KEY)throw new Error('Payments unavailable');return new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:2,timeout:15000});}
export async function ensureMembershipProvisioned(paymentId:string,runTransaction:typeof transaction=transaction){
 return runTransaction(async c=>{
  const a=(await c.query('SELECT * FROM payment_attempts WHERE id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(!a || a.status!=='PAID' || !a.customer_id)throw new Error('Verified paid record required');
  await c.query('SELECT id FROM customers WHERE id=$1 FOR UPDATE',[a.customer_id]);
  let m=(await c.query('SELECT * FROM memberships WHERE customer_id=$1',[a.customer_id])).rows[0];
  if(!m){const id=randomUUID();m=(await c.query(`INSERT INTO memberships(id,customer_id,payment_id,os_reference,status,renews_at,renewal_cents) VALUES($1,$2,$3,$4,'ACTIVE',$5,$6) RETURNING *`,[id,a.customer_id,a.id,`PA-${id.slice(0,8).toUpperCase()}`,new Date(new Date(a.paid_at).setUTCFullYear(new Date(a.paid_at).getUTCFullYear()+1)),commercial.renewalCents])).rows[0];}
  const desk=(await c.query('INSERT INTO desks(id,membership_id,customer_id) VALUES($1,$2,$3) ON CONFLICT(customer_id) DO UPDATE SET customer_id=EXCLUDED.customer_id RETURNING *',[randomUUID(),m.id,a.customer_id])).rows[0];
  for(const definition of modules){const result=await c.query('INSERT INTO workflows(id,desk_id,module,state,source,rule_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(desk_id,module) DO NOTHING RETURNING id',[randomUUID(),desk.id,definition.id,definition.initial,definition.source,`${commercial.version}/${definition.rule}`]);if(result.rowCount)await c.query('INSERT INTO audit_events(id,desk_id,actor,kind,new_state,source,rule_version) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),desk.id,'system','WORKFLOW_CREATED',definition.initial,'Verified payment',commercial.version]);}
  await c.query("INSERT INTO obligations(id,desk_id,title,due_at,status,source,rule_version) VALUES($1,$2,'Continuing OS Membership renewal',$3,'SCHEDULED','Membership activation',$4) ON CONFLICT(desk_id,title) DO NOTHING",[randomUUID(),desk.id,m.renews_at,commercial.version]);
  await c.query(`INSERT INTO analytics(id,name,customer_id) VALUES($1,'desk_created',$2),($3,'desk_active',$2) ON CONFLICT(id) DO NOTHING`,[`desk:${desk.id}`,a.customer_id,`active:${desk.id}`]);
  return {membership:m,desk};
 });
}
export async function reconcilePaidSession(session:Stripe.Checkout.Session){
 if(session.payment_status!=='paid')return null;
 const paymentId=session.metadata?.payment_id;
 if(!paymentId || !session.customer_details?.email)throw new Error('Payment correlation missing');
 await transaction(async c=>{
  const a=(await c.query('SELECT * FROM payment_attempts WHERE id=$1 FOR UPDATE',[paymentId])).rows[0];
  if(!a || a.session_id!==session.id || a.amount_cents!==session.amount_total || session.currency!==commercial.currency || session.mode!=='payment' || session.livemode!==process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'))throw new Error('Payment mismatch');
  const customer=(await c.query('INSERT INTO customers(id,email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id',[randomUUID(),session.customer_details!.email!.toLowerCase()])).rows[0];
  const stripeCustomer=typeof session.customer==='string'?session.customer:session.customer?.id;
  await c.query("UPDATE payment_attempts SET status='PAID',customer_id=$2,stripe_customer=$3,paid_at=COALESCE(paid_at,now()) WHERE id=$1",[paymentId,customer.id,stripeCustomer]);
  await c.query('INSERT INTO economics(id,payment_id,gross_cents,discount_cents) VALUES($1,$2,$3,$4) ON CONFLICT(payment_id) DO NOTHING',[randomUUID(),paymentId,commercial.yearOneCents,commercial.yearOneCents-a.amount_cents]);
 });
 const result=await ensureMembershipProvisioned(paymentId);
 await recordEvent(`payment:${session.id}`,'payment_success',result.membership.customer_id,{provider:(await db().query('SELECT provider FROM payment_attempts WHERE id=$1',[paymentId])).rows[0].provider});
 const attempt=(await db().query('SELECT visitor,referral_code FROM payment_attempts WHERE id=$1',[paymentId])).rows[0];await db().query('UPDATE analytics SET visitor=$2 WHERE id=$1',[`payment:${session.id}`,attempt.visitor]);if(attempt.referral_code){const referral=(await db().query('UPDATE referrals SET converted_payment_id=$2 WHERE code=$1 AND converted_payment_id IS NULL AND customer_id<>$3 RETURNING id',[attempt.referral_code,paymentId,result.membership.customer_id])).rows[0];if(referral)await recordEvent(`conversion:${referral.id}`,'referral_conversion',result.membership.customer_id);}
 return result;
}
export async function ensureRenewalSchedule(paymentId:string){
 const a=(await db().query('SELECT a.*,m.id AS membership_id,m.renews_at,m.schedule_id,m.cancel_at_period_end,m.payment_id FROM payment_attempts a JOIN memberships m ON m.payment_id=a.id WHERE a.id=$1',[paymentId])).rows[0];
 if(!a || a.schedule_id || a.cancel_at_period_end)return;
 if(a.provider!=='card'){await db().query("UPDATE memberships SET renewal_status='PAYMENT_METHOD_REQUIRED' WHERE id=$1",[a.membership_id]);return;}
 const s=stripe();const session=await s.checkout.sessions.retrieve(a.session_id,{expand:['payment_intent']});
 const pi=session.payment_intent as Stripe.PaymentIntent;const pm=typeof pi.payment_method==='string'?pi.payment_method:pi.payment_method?.id;
 if(!a.stripe_customer || !pm)throw new Error('Renewal payment method unavailable');
 await s.customers.update(a.stripe_customer,{invoice_settings:{default_payment_method:pm}});
 const schedule=await s.subscriptionSchedules.create({customer:a.stripe_customer,start_date:Math.floor(new Date(a.renews_at).getTime()/1000),end_behavior:'release',default_settings:{default_payment_method:pm},phases:[{items:[{price_data:{currency:'usd',product:process.env.STRIPE_RENEWAL_PRODUCT_ID||await renewalProduct(s),unit_amount:commercial.renewalCents,recurring:{interval:'year'}},quantity:1}],duration:{interval:'year',interval_count:1}}],metadata:{membership_id:a.membership_id}},{idempotencyKey:`renewal:${a.membership_id}`});
 await db().query("UPDATE memberships SET schedule_id=$2,renewal_status='SCHEDULED' WHERE id=$1",[a.membership_id,schedule.id]);
}
async function renewalProduct(s:Stripe){return (await s.products.create({name:`${commercial.product} — Continuing OS Membership`},{idempotencyKey:'pa-renewal-product-v1'})).id;}
