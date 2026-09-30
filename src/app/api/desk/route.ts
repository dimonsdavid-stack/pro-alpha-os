import {NextResponse} from 'next/server';
import {currentCustomer} from '@/lib/security';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(){const c=await currentCustomer();if(!c)return NextResponse.json({error:'Sign in to access your Desk'},{status:401});const d=(await db().query('SELECT d.*,m.os_reference,m.status,m.activated_at,m.renews_at,m.renewal_status,m.cancel_at_period_end FROM desks d JOIN memberships m ON m.id=d.membership_id WHERE d.customer_id=$1',[c.id])).rows[0];if(!d)return NextResponse.json({error:'Desk provisioning is pending'},{status:409});const [w,h,e,o]=await Promise.all(['workflows','audit_events','evidence','obligations'].map(table=>db().query(`SELECT * FROM ${table} WHERE desk_id=$1 ORDER BY ${table==='workflows'?'module':'created_at'} ASC`,[d.id])));return NextResponse.json({desk:d,workflows:w.rows,history:h.rows,evidence:e.rows,obligations:o.rows},{headers:{'Cache-Control':'no-store'}});}
