import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripe,reconcilePaidSession,ensureRenewalSchedule} from '@/lib/commerce';
import {db,transaction} from '@/lib/db';
import {recordEvent} from '@/lib/analytics';
export async function POST(req:Request){
 if(!process.env.STRIPE_WEBHOOK_SECRET || !process.env.DATABASE_URL)return NextResponse.json({error:'Webhook unavailable'},{status:503});
 let event:Stripe.Event;try{const raw=await req.text();event=stripe().webhooks.constructEvent(raw,req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid signature'},{status:400});}
 try{
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.metadata?.payment_id){await reconcilePaidSession(session);if(session.payment_status==='paid')await ensureRenewalSchedule(session.metadata.payment_id);}
  }
  if(event.type==='checkout.session.async_payment_failed'){const session=event.data.object as Stripe.Checkout.Session;if(session.metadata?.payment_id){await db().query("UPDATE payment_attempts SET status='FAILED' WHERE id=$1 AND status<>'PAID'",[session.metadata.payment_id]);await recordEvent(`failed:${event.id}`,'payment_failure');}}
  if(event.type==='invoice.paid' || event.type==='invoice.payment_failed'){
   const invoice=event.data.object as Stripe.Invoice;const parent=invoice.parent?.subscription_details;const sub=typeof parent?.subscription==='string'?parent.subscription:parent?.subscription?.id;
   if(sub){await transaction(async c=>{const claimed=await c.query('INSERT INTO webhook_events(id,type) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING id',[event.id,event.type]);if(!claimed.rowCount)return;const membership=(await c.query('SELECT * FROM memberships WHERE subscription_id=$1 FOR UPDATE',[sub])).rows[0];if(!membership)return;const ok=event.type==='invoice.paid';const periodEnd=Math.max(...invoice.lines.data.map(line=>line.period.end));if(ok&&(invoice.currency!=='usd'||invoice.amount_paid!==membership.renewal_cents||!Number.isFinite(periodEnd)))throw new Error('Unexpected renewal');await c.query('UPDATE memberships SET renewal_status=$2,status=$3,renews_at=CASE WHEN $4 THEN GREATEST(renews_at,to_timestamp($5)) ELSE renews_at END WHERE id=$1',[membership.id,ok?'COMPLETE':'PAYMENT_FAILED',ok?'ACTIVE':'PAST_DUE',ok,Number.isFinite(periodEnd)?periodEnd:0]);});await recordEvent(`renewal:${invoice.id}:${event.type}`,event.type==='invoice.paid'?'renewal_complete':'payment_failure');}
  }
  if(event.type==='subscription_schedule.updated'){const schedule=event.data.object as Stripe.SubscriptionSchedule;const sub=typeof schedule.subscription==='string'?schedule.subscription:schedule.subscription?.id;if(sub)await db().query('UPDATE memberships SET subscription_id=$2 WHERE schedule_id=$1',[schedule.id,sub]);}
  if(event.type==='customer.subscription.deleted'){const sub=event.data.object as Stripe.Subscription;await db().query("UPDATE memberships SET status='EXPIRED',renewal_status='CANCELLED' WHERE subscription_id=$1",[sub.id]);}
  await db().query('INSERT INTO webhook_events(id,type) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[event.id,event.type]);return NextResponse.json({received:true});
 }catch{console.error('webhook_processing_failed',event.id,event.type);return NextResponse.json({error:'Processing will retry'},{status:500});}
}
