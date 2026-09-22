"use strict";
const {json,rateLimit,readJson,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

module.exports=async function handler(request,response){
  if(!["GET","POST"].includes(request.method)){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"GET, POST"});return}
  if(!rateLimit(request,response,"member-progress",40,60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"member_service_not_configured",message:"멤버 서비스를 준비 중입니다."}});return}
  const token=String(request.headers["x-talkflow-member-session"]||"").slice(0,200);
  if(!token){json(response,400,{error:{type:"invalid_request",message:"읽음 기록 정보를 확인해 주세요."}});return}
  let action="list",payload={month:String(request.query?.month||"")};
  if(request.method==="POST"){
    if(!verifySameOrigin(request,response))return;
    const body=await readJson(request,response,2000);if(body===null)return;
    action="save";payload={date:String(body.date||""),reflection:String(body.reflection||"").trim()};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)||payload.reflection.length<1||payload.reflection.length>500){json(response,400,{error:{type:"invalid_request",message:"한 줄 기록을 500자 이내로 입력해 주세요."}});return}
  }else if(!/^\d{4}-\d{2}$/.test(payload.month)){json(response,400,{error:{type:"invalid_request",message:"조회할 달을 확인해 주세요."}});return}
  try{
    const result=await Topics.memberProgress(token,action,payload);
    if(result?.expired){json(response,401,{error:{type:"member_session_expired",message:"멤버 확인 시간이 만료되었습니다."}});return}
    if(result?.error){json(response,result.error==="topic_not_found"?404:400,{error:{type:result.error,message:result.error==="topic_not_found"?"공개된 토픽을 찾지 못했습니다.":"한 줄 기록을 확인해 주세요."}});return}
    json(response,200,action==="list"?{progress:Array.isArray(result?.progress)?result.progress:[]}:{progress:result?.progress});
  }catch{json(response,502,{error:{type:"member_service_unavailable",message:"읽음 기록을 처리하지 못했습니다."}})}
};
