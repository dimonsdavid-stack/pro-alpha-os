import {NextResponse} from 'next/server';
import {commerceReady} from '@/lib/config';
export async function GET(){return NextResponse.json({service:'Pro Alpha OS',status:'ok',commerce:commerceReady()?'configured':'disabled'},{headers:{'Cache-Control':'no-store'}});}
