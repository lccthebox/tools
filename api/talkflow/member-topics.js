"use strict";
const {json,rateLimit}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

module.exports=async function handler(request,response){
  if(request.method!=="GET"){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"GET"});return}
  if(!rateLimit(request,response,"member-topics",60,60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"member_service_not_configured",message:"멤버 서비스를 준비 중입니다."}});return}
  const token=String(request.headers["x-talkflow-member-session"]||"").slice(0,200),month=String(request.query?.month||"");
  if(!token||!/^\d{4}-\d{2}$/.test(month)){json(response,400,{error:{type:"invalid_request",message:"토픽 조회 정보를 확인해 주세요."}});return}
  try{const result=await Topics.memberTopics(token,month);if(result?.expired){json(response,401,{error:{type:"member_session_expired",message:"멤버 확인 시간이 만료되었습니다."}});return}json(response,200,{topics:Array.isArray(result?.topics)?result.topics:[]})}catch{json(response,502,{error:{type:"member_service_unavailable",message:"토픽을 불러오지 못했습니다."}})}
};
