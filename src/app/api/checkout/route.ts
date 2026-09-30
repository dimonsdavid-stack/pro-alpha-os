import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {commercial,commerceReady,productionFinancing} from '@/lib/config';
import {stripe} from '@/lib/commerce';
import {db} from '@/lib/db';
import {hash,secret,sameOrigin,cookieOptions,rateLimit} from '@/lib/security';
import {recordEvent} from '@/lib/analytics';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid request origin'},{status:403});
 if(!commerceReady())return NextResponse.json({error:'Activation is temporarily unavailable. No payment has been taken.'},{status:503});
 const body=await req.json().catch(()=>null);const provider=body?.provider||'card';
 if(body?.terms!==true || !['card',...productionFinancing().map(p=>p.id)].includes(provider))return NextResponse.json({error:'Select an available method and accept the membership terms.'},{status:400});
 if(typeof body?.requestToken!=='string'||! /^[a-f0-9]{64}$/.test(body.requestToken))return NextResponse.json({error:'Invalid checkout attempt. Refresh and retry.'},{status:400});
 const jar=await cookies();const token=jar.get('pa_checkout')?.value||body.requestToken||secret();const s=stripe();
 try{
  if(!await rateLimit(`checkout:${req.headers.get('x-forwarded-for')||'unknown'}`,20))return NextResponse.json({error:'Too many attempts. Please try again later.'},{status:429});
  const c=await db().connect();
  let result:{url:string|null;id:string};
  try{await c.query('SELECT pg_advisory_lock(hashtext($1))',[hash(token)]);
  result=await (async()=>{
   let a=(await c.query("SELECT * FROM payment_attempts WHERE access_hash=$1 AND status IN ('CREATED','PENDING','PAID') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[hash(token)])).rows[0];
   if(a?.status==='PAID')return {url:'/activation',id:a.id};
   if(a?.session_id){const existing=await s.checkout.sessions.retrieve(a.session_id);if(existing.status==='open' && a.provider===provider)return {url:existing.url,id:a.id};if(existing.status==='complete')return {url:'/activation',id:a.id};if(existing.status==='open')await s.checkout.sessions.expire(existing.id);await c.query("UPDATE payment_attempts SET status='EXPIRED' WHERE id=$1",[a.id]);a=null;}
   const amount=provider==='card'?commercial.fullPayCents:commercial.yearOneCents;
   if(!a)a=(await c.query('INSERT INTO payment_attempts(id,access_hash,amount_cents,provider) VALUES($1,$2,$3,$4) RETURNING *',[randomUUID(),hash(token),amount,provider])).rows[0];
   const base=process.env.NEXT_PUBLIC_APP_URL||commercial.canonical;
   const session=await s.checkout.sessions.create({mode:'payment',customer_creation:'always',payment_method_types:[provider as 'card'|'affirm'|'klarna'],line_items:[{price_data:{currency:'usd',unit_amount:amount,product_data:{name:`${commercial.product} — Year One Membership`,description:`Complete OS installation + first operating year. Continuing membership ${commercial.renewalCents/100} USD/year; authorized external fees at actual cost.`}},quantity:1}],payment_intent_data:provider==='card'?{setup_future_usage:'off_session'}:undefined,metadata:{payment_id:a.id,commercial_version:commercial.version},success_url:`${base}/activation`,cancel_url:`${base}/checkout?cancelled=1`,consent_collection:{terms_of_service:'required'},custom_text:{terms_of_service_acceptance:{message:`I agree to the [membership terms](${base}/legal). Continuing membership renews annually at ${commercial.renewalCents/100} USD unless cancelled. External fees require separate authorization.`}}},{idempotencyKey:`checkout:${a.id}`});
   await c.query("UPDATE payment_attempts SET session_id=$2,status='PENDING' WHERE id=$1",[a.id,session.id]);return {url:session.url,id:a.id};
  })();
  }finally{try{await c.query('SELECT pg_advisory_unlock(hashtext($1))',[hash(token)]);}finally{c.release();}}
  const visitor=typeof body.visitor==='string' && /^[a-f0-9-]{36}$/.test(body.visitor)?body.visitor:null;const referral=typeof body.referral==='string' && /^[a-f0-9]{8}$/.test(body.referral)?body.referral:null;await db().query('UPDATE payment_attempts SET visitor=COALESCE(visitor,$2),referral_code=COALESCE(referral_code,$3) WHERE id=$1',[result.id,visitor,referral]);const response=NextResponse.json({url:result.url});response.cookies.set('pa_checkout',token,{...cookieOptions(),maxAge:86400*30});await recordEvent(`checkout:${result.id}`,'checkout_start',undefined,{provider});return response;
 }catch{console.error('checkout_failed');return NextResponse.json({error:'Checkout could not start. Retry safely; no additional payment is requested.'},{status:502});}
}
