import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db} from '@/lib/db';
import {secret,hash,sameOrigin,rateLimit} from '@/lib/security';
import {sendEmail} from '@/lib/email';
import {commercial} from '@/lib/config';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});if(!process.env.DATABASE_URL || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)return NextResponse.json({error:'Email sign-in is temporarily unavailable.'},{status:503});const data=z.object({email:z.email().max(254)}).safeParse(await req.json().catch(()=>null));if(!data.success)return NextResponse.json({error:'Enter a valid email address.'},{status:400});if(!await rateLimit(`login:${req.headers.get('x-forwarded-for')||'unknown'}`,5))return NextResponse.json({error:'Please wait before requesting another link.'},{status:429});const customer=(await db().query('SELECT id FROM customers WHERE email=$1',[data.data.email.toLowerCase()])).rows[0];if(customer){const token=secret();await db().query('INSERT INTO login_tokens(id,customer_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'15 minutes\')',[randomUUID(),customer.id,hash(token)]);try{await sendEmail(data.data.email,'Your Pro Alpha Desk sign-in link',`${process.env.NEXT_PUBLIC_APP_URL||commercial.canonical}/account/verify#${token}\nThis link expires in 15 minutes and works once.`);}catch{console.error('sign_in_delivery_failed');}}
return NextResponse.json({message:'If a membership exists for this email, a sign-in link has been sent.'});}
