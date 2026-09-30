import type {ReactNode} from 'react';
import type {Metadata} from 'next';
import './globals.css';
import {commercial} from '@/lib/config';
import {Header,Footer} from '@/components/chrome';
import Telemetry from '@/components/telemetry';
export const metadata:Metadata={metadataBase:new URL(commercial.canonical),title:{default:'Pro Alpha OS | Your Professional Trading Business OS',template:'%s | Pro Alpha OS'},description:'One Annual OS Membership connects your trading entity, management company, evidence, elections, obligations and continuous operating history.',openGraph:{title:'Pro Alpha OS',description:'The complete operating system for your professional trading business.',url:commercial.canonical,type:'website'},twitter:{card:'summary_large_image'}};
export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body><Header/><main id="main">{children}</main><Footer/><Telemetry/></body></html>}
