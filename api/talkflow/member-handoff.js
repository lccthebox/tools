"use strict";
const {json,rateLimit,readJson,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

module.exports=async function handler(request,response){
  if(request.method!=="POST"){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"POST"});return}
  if(!verifySameOrigin(request,response)||!rateLimit(request,response,"member-handoff",12,10*60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"member_service_not_configured",message:"멤버 서비스를 준비 중입니다."}});return}
  const body=await readJson(request,response,1000);if(!body)return;const code=String(body.code||"").trim();
  if(!/^[A-Za-z0-9_-]{32,160}$/.test(code)){json(response,400,{error:{type:"invalid_handoff",message:"유효하지 않은 연결 요청입니다."}});return}
  try{const result=await Topics.memberHandoff(code);if(!result?.token){json(response,401,{error:{type:"handoff_rejected",message:"연결 요청이 만료되었거나 이미 사용되었습니다."}});return}json(response,200,{token:result.token,expiresAt:result.expiresAt||null})}catch{json(response,502,{error:{type:"member_service_unavailable",message:"멤버 확인 서비스를 잠시 사용할 수 없습니다."}})}
};
