import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Home,Trust,Legal} from '@/components/public-pages';
import Desk from '@/components/desk';
import {Checkout,Activation,Account} from '@/components/commerce-ui';
import {commercial,commerceReady,productionFinancing} from '@/lib/config';
export async function generateMetadata({params}:{params:Promise<{path?:string[]}>}):Promise<Metadata>{const route=(await params).path?.join('/')||'';const privateRoute=['desk','account','account/verify','activation'].includes(route);return {title:route?route==='sample-desk'?'Sample Desk':route.charAt(0).toUpperCase()+route.slice(1):'Your Professional Trading Business OS',alternates:privateRoute?undefined:{canonical:`${commercial.canonical}/${route}`},robots:privateRoute?{index:false,follow:false}:undefined};}
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const route=(await params).path?.join('/')||'';switch(route){case '':return <Home/>;case 'sample-desk':return <Desk sample/>;case 'trust':return <Trust/>;case 'legal':return <Legal/>;case 'checkout':return <Checkout enabled={commerceReady()} providers={productionFinancing().map(p=>p.id)}/>;case 'activation':return <Activation/>;case 'desk':return <Desk/>;case 'account':return <Account/>;case 'account/verify':return <Account verify/>;default:notFound();}}
