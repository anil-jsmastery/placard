/**
 * One page view per load of a live page: posts `{ s: siteId, r: referrer }` to `/api/view` (Step 11).
 * Rendered only by the published page, never by the editor or the dashboard thumbnails. No cookies, nothing stored.
 */
export function ViewBeacon({ siteId }: { siteId: string }) {
  // The site ID is a UUID from our database; JSON.stringify keeps it a plain string literal
  const script = `(function(){try{var b=JSON.stringify({s:${JSON.stringify(siteId)},r:document.referrer||""});if(navigator.sendBeacon){navigator.sendBeacon("/api/view",new Blob([b],{type:"application/json"}))}else{fetch("/api/view",{method:"POST",body:b,keepalive:true,headers:{"content-type":"application/json"}})}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
