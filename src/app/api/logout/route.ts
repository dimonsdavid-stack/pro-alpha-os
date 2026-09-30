import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {hash,sameOrigin} from '@/lib/security';
import {db} from '@/lib/db';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const token=(await cookies()).get('pa_session')?.value;if(token && process.env.DATABASE_URL)await db().query('DELETE FROM sessions WHERE token_hash=$1',[hash(token)]);const r=NextResponse.json({url:'/account'});r.cookies.delete('pa_session');return r;}
