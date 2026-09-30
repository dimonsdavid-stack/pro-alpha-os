import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {hash,secret,cookieOptions} from '@/lib/security';
import {ensureMembershipProvisioned} from '@/lib/commerce';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const {sameOrigin}=await import('@/lib/security');if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const token=(await cookies()).get('pa_checkout')?.value;if(!token || !process.env.DATABASE_URL)return NextResponse.json({state:'UNKNOWN'},{status:401});
 try{const a=(await db().query('SELECT * FROM payment_attempts WHERE access_hash=$1 ORDER BY created_at DESC LIMIT 1',[hash(token)])).rows[0];
 if(!a)return NextResponse.json({state:'UNKNOWN'},{status:401});
 if(a.status!=='PAID')return NextResponse.json({state:a.status==='FAILED'?'FAILED':'VERIFYING'});
 const {membership}=await ensureMembershipProvisioned(a.id);const session=secret();await db().query('INSERT INTO sessions(id,customer_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'7 days\')',[randomUUID(),membership.customer_id,hash(session)]);
 const result=NextResponse.json({state:'ACTIVE',osReference:membership.os_reference,activatedAt:membership.activated_at});result.cookies.set('pa_session',session,cookieOptions());return result;
 }catch{return NextResponse.json({state:'PROVISIONING'});}
}
