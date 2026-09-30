import {NextResponse} from 'next/server';
import {z} from 'zod';
import {eventNames} from '@/lib/analytics';
import {db} from '@/lib/db';
import {sameOrigin,rateLimit} from '@/lib/security';
const names=eventNames.filter(n=>!['payment_success','desk_created','desk_active','renewal_complete','cancel','referral_conversion','financing_approved','financing_declined'].includes(n));
const schema=z.object({id:z.string().uuid(),name:z.string().refine(n=>names.includes(n as typeof names[number])),visitor:z.string().uuid(),dimensions:z.object({route:z.enum(['/','/sample-desk','/checkout','/activation','/desk','/trust','/legal','/account']).optional(),provider:z.enum(['card','affirm','klarna']).optional(),fieldCount:z.number().int().min(0).max(3).optional()}).strict()});
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return new Response(null,{status:400});if(!process.env.DATABASE_URL)return new Response(null,{status:204});if(!await rateLimit(`events:${parsed.data.visitor}`,200))return new Response(null,{status:429});await db().query('INSERT INTO analytics(id,name,visitor,dimensions) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[parsed.data.id,parsed.data.name,parsed.data.visitor,JSON.stringify(parsed.data.dimensions)]);return NextResponse.json({received:true});}
