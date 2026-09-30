import type {MetadataRoute} from 'next';
import {commercial} from '@/lib/config';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/desk','/account','/activation','/api/']},sitemap:`${commercial.canonical}/sitemap.xml`};}
