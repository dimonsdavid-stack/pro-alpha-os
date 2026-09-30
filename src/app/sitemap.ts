import type {MetadataRoute} from 'next';
import {commercial} from '@/lib/config';
export default function sitemap():MetadataRoute.Sitemap{return ['','sample-desk','checkout','trust','legal'].map(route=>({url:`${commercial.canonical}/${route}`,lastModified:'2026-09-30',changeFrequency:'monthly',priority:route?0.7:1}));}
