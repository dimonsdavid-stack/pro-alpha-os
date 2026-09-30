import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {ensureMembershipProvisioned,ensureRenewalSchedule} from '@/lib/commerce';
import {recordEvent} from '@/lib/analytics';
import {sendEmail} from '@/lib/email';
import {commercial} from '@/lib/config';
export async function GET(req:Request){if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return new Response(null,{status:401});if(!process.env.DATABASE_URL)return new Response(null,{status:503});const paid=(await db().query("SELECT id FROM payment_attempts WHERE status='PAID' ORDER BY paid_at DESC LIMIT 50")).rows;let recovered=0;for(const a of paid){try{await ensureMembershipProvisioned(a.id);await ensureRenewalSchedule(a.id);recovered++;}catch{console.error('provisioning_retry_pending',a.id);}}
 const due=(await db().query("SELECT m.*,c.email FROM memberships m JOIN customers c ON c.id=m.customer_id WHERE m.renews_at BETWEEN now() AND now()+interval '30 days' AND NOT m.cancel_at_period_end")).rows;
 for(const m of due){const id=`reminder:${m.id}:${new Date(m.renews_at).getUTCFullYear()}`;if(!(await db().query('SELECT id FROM analytics WHERE id=$1',[id])).rowCount){try{await sendEmail(m.email,'Your Pro Alpha OS renewal',`Your Continuing OS Membership renews at ${commercial.renewalCents/100} USD on ${new Date(m.renews_at).toISOString().slice(0,10)}. Manage billing or cancel online at ${commercial.canonical}/desk.`);await recordEvent(id,'renewal_due',m.customer_id);}catch{console.error('renewal_reminder_pending',m.id);}}}
 await db().query("UPDATE memberships SET status='EXPIRED' WHERE renews_at<now() AND cancel_at_period_end");return NextResponse.json({recovered,renewalsDue:due.length});}
