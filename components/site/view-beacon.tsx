// One inline script on a published page (never the editor or thumbnails): it posts the site and the referrer to
// /api/view once. No cookie, nothing stored in the browser.
export function ViewBeacon({ siteId }: { siteId: string }) {
  const js = `(function(){try{var b=JSON.stringify({s:${JSON.stringify(siteId)},r:document.referrer||""});if(navigator.sendBeacon){navigator.sendBeacon("/api/view",new Blob([b],{type:"application/json"}))}else{fetch("/api/view",{method:"POST",body:b,keepalive:true,headers:{"content-type":"application/json"}})}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
