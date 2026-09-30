import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/db';
import {contribution} from '@/lib/economics';
export async function GET(req:Request){const token=process.env.OPERATOR_API_TOKEN,s=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!token||Buffer.byteLength(s)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(s),Buffer.from(token)))return new Response(null,{status:401});const r=await db().query('SELECT e.*,a.provider,a.channel FROM economics e JOIN payment_attempts a ON a.id=e.payment_id ORDER BY a.created_at DESC LIMIT 500');return NextResponse.json(r.rows.map(row=>({...row,...contribution(row)})),{headers:{'Cache-Control':'no-store'}});}
