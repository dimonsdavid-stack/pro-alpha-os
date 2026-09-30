import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {currentCustomer,sameOrigin} from '@/lib/security';
import {db} from '@/lib/db';
import {recordEvent} from '@/lib/analytics';
import {commercial} from '@/lib/config';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const c=await currentCustomer();if(!c)return new Response(null,{status:401});let r=(await db().query('SELECT * FROM referrals WHERE customer_id=$1 LIMIT 1',[c.id])).rows[0];if(!r)r=(await db().query('INSERT INTO referrals(id,customer_id,code) VALUES($1,$2,$3) RETURNING *',[randomUUID(),c.id,randomUUID().slice(0,8)])).rows[0];await recordEvent(`referral:${r.id}`,'referral_created',c.id);return NextResponse.json({url:`${commercial.canonical}/?ref=${r.code}`});}
