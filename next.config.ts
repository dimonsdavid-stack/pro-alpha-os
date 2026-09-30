import type {NextConfig} from 'next';
const config:NextConfig={poweredByHeader:false,async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]},{source:'/(desk|account|activation|api)/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'}]}];},async redirects(){return [{source:'/qualify',destination:'/checkout',permanent:true}];}};
export default config;
