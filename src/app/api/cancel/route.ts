import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {currentCustomer,sameOrigin} from '@/lib/security';
import {db,transaction} from '@/lib/db';
import {stripe} from '@/lib/commerce';
import {commercial} from '@/lib/config';
import {recordEvent} from '@/lib/analytics';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const c=await currentCustomer();if(!c)return new Response(null,{status:401});const b=await req.json().catch(()=>null);if(b?.confirm!==true)return NextResponse.json({error:'Confirm cancellation'},{status:400});const m=(await db().query('SELECT * FROM memberships WHERE customer_id=$1',[c.id])).rows[0];if(!m)return new Response(null,{status:404});try{if(!m.cancel_at_period_end){const s=stripe();if(m.subscription_id){await s.subscriptions.update(m.subscription_id,{cancel_at_period_end:true},{idempotencyKey:`cancel:${m.id}`});}else if(m.schedule_id){await s.subscriptionSchedules.cancel(m.schedule_id,{}, {idempotencyKey:`cancel:${m.id}`});}
 await transaction(async client=>{await client.query("UPDATE memberships SET cancel_at_period_end=true,renewal_status='CANCELLED' WHERE id=$1",[m.id]);const d=(await client.query('SELECT id FROM desks WHERE membership_id=$1',[m.id])).rows[0];await client.query('INSERT INTO audit_events(id,desk_id,actor,kind,source,rule_version) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),d.id,'customer','RENEWAL_CANCELLED','Authenticated customer confirmation',commercial.version]);});await recordEvent(`cancel:${m.id}`,'cancel',c.id);}
 return NextResponse.json({message:'Renewal cancelled. Your OS remains available through the paid membership period.'});}catch{return NextResponse.json({error:'Cancellation could not be completed. Please retry; your request is safe to repeat.'},{status:502});}}
