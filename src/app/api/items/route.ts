import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {currentCustomer,sameOrigin} from '@/lib/security';
import {transaction} from '@/lib/db';
import {commercial} from '@/lib/config';
import {recordEvent} from '@/lib/analytics';
const schema=z.discriminatedUnion('module',[
 z.object({module:z.literal('architecture'),requestKey:z.string().uuid(),value:z.object({state:z.string().regex(/^[A-Z]{2}$/),existingEntity:z.enum(['yes','no','unsure'])})}),
 z.object({module:z.literal('475'),requestKey:z.string().uuid(),value:z.object({election:z.enum(['filed','not_filed','unsure'])})}),
 z.object({module:z.literal('tts'),requestKey:z.string().uuid(),value:z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),minutes:z.number().int().min(1).max(1440),activity:z.string().min(3).max(300)})}),
]);
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const c=await currentCustomer();if(!c)return NextResponse.json({error:'Session expired. Sign in and submit again.'},{status:401});const body=schema.safeParse(await req.json().catch(()=>null));if(!body.success)return NextResponse.json({error:'Check the requested facts.'},{status:400});
 try{const result=await transaction(async client=>{
 const d=(await client.query('SELECT id FROM desks WHERE customer_id=$1',[c.id])).rows[0];if(!d)throw new Error('Desk unavailable');const w=(await client.query('SELECT * FROM workflows WHERE desk_id=$1 AND module=$2 FOR UPDATE',[d.id,body.data.module])).rows[0];
 const insert=await client.query('INSERT INTO customer_items(id,desk_id,module,request_key,value) VALUES($1,$2,$3,$4,$5) ON CONFLICT(desk_id,request_key) DO NOTHING RETURNING id',[randomUUID(),d.id,body.data.module,body.data.requestKey,JSON.stringify(body.data.value)]);if(!insert.rowCount)return {duplicate:true};
 const next=body.data.module==='475' && body.data.value.election==='unsure'?'SPECIALIST_INPUT_REQUIRED':'ELIGIBILITY_CHECK';
 if(!['FACTS_REQUIRED','CUSTOMER_ACTION_REQUIRED','SPECIALIST_INPUT_REQUIRED','ELIGIBILITY_CHECK'].includes(w.state))throw new Error('Workflow requires a different action');
 await client.query('UPDATE workflows SET state=$3,version=version+1 WHERE desk_id=$1 AND module=$2',[d.id,body.data.module,next]);
 await client.query('INSERT INTO evidence(id,desk_id,module,label,reference,source) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),d.id,body.data.module,'Customer-provided facts',`item:${insert.rows[0].id}`,'Authenticated customer submission']);
 await client.query('INSERT INTO audit_events(id,desk_id,actor,kind,previous_state,new_state,source,rule_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),d.id,'customer','FACTS_RECEIVED',w.state,next,`item:${insert.rows[0].id}`,commercial.version]);return {duplicate:false,state:next};
 });await recordEvent(`item:${body.data.requestKey}`,'customer_item_received',c.id);await recordEvent(`first:${c.id}`,'first_post_purchase_action',c.id);await recordEvent(`implementation:${c.id}`,'implementation_started',c.id);return NextResponse.json(result);
 }catch{return NextResponse.json({error:'Submission was not completed. You can safely retry.'},{status:409});}
}
