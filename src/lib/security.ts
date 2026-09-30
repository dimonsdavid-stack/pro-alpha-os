import {createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {db} from './db';
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const secret=()=>randomBytes(32).toString('hex');
export async function currentCustomer(){const jar=await cookies();const token=jar.get('pa_session')?.value;if(!token || !process.env.DATABASE_URL)return null;const r=await db().query('SELECT c.id,c.email FROM sessions s JOIN customers c ON c.id=s.customer_id WHERE token_hash=$1 AND expires_at>now()',[hash(token)]);return r.rows[0]||null;}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin && origin===new URL(req.url).origin;}
export function cookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:86400*7};}
export async function rateLimit(bucket:string,limit=10){const result=await db().query(`INSERT INTO rate_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+interval '10 minutes' ELSE rate_limits.expires_at END RETURNING hits`,[hash(bucket)]);return result.rows[0].hits<=limit;}
