import {NextResponse} from 'next/server';
import {currentCustomer,sameOrigin} from '@/lib/security';
import {db} from '@/lib/db';
import {stripe} from '@/lib/commerce';
import {commercial} from '@/lib/config';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const c=await currentCustomer();if(!c)return new Response(null,{status:401});const a=(await db().query('SELECT a.stripe_customer FROM payment_attempts a JOIN memberships m ON m.payment_id=a.id WHERE m.customer_id=$1',[c.id])).rows[0];if(!a?.stripe_customer)return NextResponse.json({error:'Billing record unavailable'},{status:409});try{const portal=await stripe().billingPortal.sessions.create({customer:a.stripe_customer,return_url:`${process.env.NEXT_PUBLIC_APP_URL||commercial.canonical}/desk`});return NextResponse.json({url:portal.url});}catch{return NextResponse.json({error:'Billing portal is temporarily unavailable.'},{status:503});}}
