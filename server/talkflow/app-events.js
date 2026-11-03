"use strict";
// One talkflow_app_events row per API call (outcome, error type, status, duration) for the daily log review.
// Request and response bodies are never stored: member names, codes and topic text stay out of the log.

const LOG_TIMEOUT_MS=1500;

// TALKFLOW_APP_EVENTS=off keeps QA scripts, which mock fetch, free of log writes.
function configuration(){
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,""),serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"");
  return{url,serviceKey,configured:Boolean(url&&serviceKey)&&process.env.TALKFLOW_APP_EVENTS!=="off"};
}

function outcomeFor(status){return status>=500?"failed":status>=400?"rejected":"ok"}

function errorTypeFrom(chunk){
  try{const body=JSON.parse(Buffer.isBuffer(chunk)?chunk.toString("utf8"):String(chunk||""));const type=body?.error?.type;return typeof type==="string"?type.slice(0,80):null}catch{return null}
}

function clientKind(userAgent){
  const value=String(userAgent||"");if(!value)return null;
  const device=/Mobi|Android|iPhone|iPad/i.test(value)?"mobile":"desktop";
  const browser=/KAKAOTALK/i.test(value)?"kakaotalk":/Instagram/i.test(value)?"instagram":/NAVER/i.test(value)?"naver":/Edg\//.test(value)?"edge":/SamsungBrowser/i.test(value)?"samsung":/Chrome\//.test(value)?"chrome":/Safari\//.test(value)?"safari":/Firefox\//.test(value)?"firefox":"other";
  return`${device}/${browser}`;
}

async function recordAppEvent(event,fetchImpl=fetch){
  const {url,serviceKey,configured}=configuration();if(!configured)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),LOG_TIMEOUT_MS);
  try{
    await fetchImpl(`${url}/rest/v1/talkflow_app_events`,{method:"POST",headers:{apikey:serviceKey,authorization:`Bearer ${serviceKey}`,"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(event),signal:controller.signal});
  }catch{
    // Logging is best effort and must never change the response.
  }finally{clearTimeout(timer)}
}

// Wraps a Vercel handler. The row is written just before the response is sent, because the
// function may be frozen as soon as the response ends.
function withAppEvents(kind,handler,fetchImpl){
  return async function loggedHandler(request,response){
    const started=Date.now(),originalEnd=response.end.bind(response);let recorded=false,pending=null;
    response.end=function end(chunk,...rest){
      if(recorded)return originalEnd(chunk,...rest);
      recorded=true;
      const status=Number(response.statusCode)||200;
      const event={kind,method:String(request.method||""),outcome:outcomeFor(status),status_code:status,error_type:status>=400?errorTypeFrom(chunk):null,duration_ms:Date.now()-started,client:clientKind(request.headers?.["user-agent"])};
      pending=recordAppEvent(event,fetchImpl).finally(()=>originalEnd(chunk,...rest));
      return response;
    };
    try{const result=await handler(request,response);if(pending)await pending;return result}
    catch(error){
      if(!recorded){recorded=true;await recordAppEvent({kind,method:String(request.method||""),outcome:"failed",status_code:500,error_type:String(error?.name||"Error").slice(0,80),duration_ms:Date.now()-started,client:clientKind(request.headers?.["user-agent"])},fetchImpl)}
      throw error;
    }
  };
}

module.exports={withAppEvents,recordAppEvent,__test:{outcomeFor,errorTypeFrom,clientKind}};
