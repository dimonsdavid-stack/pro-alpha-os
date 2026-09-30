'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="narrow"><h1>This screen could not load.</h1><p>Your records remain unchanged. Retry safely.</p><button className="button primary" onClick={reset}>RETRY</button></div>}
