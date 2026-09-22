"use strict";
const {json,rateLimit,readJson,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

module.exports=async function handler(request,response){
  if(request.method!=="POST"){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"POST"});return}
  if(!verifySameOrigin(request,response)||!rateLimit(request,response,"member-login",8,10*60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"member_service_not_configured",message:"멤버 서비스를 준비 중입니다."}});return}
  const body=await readJson(request,response,4000);if(!body)return;
  const credentials={name:String(body.name||"").trim().slice(0,80),phone:String(body.phone||"").replace(/\D/g,"").slice(0,20),birth:String(body.birth||"").replace(/\D/g,"").slice(0,8)};
  if(!credentials.name||credentials.phone.length<10||credentials.birth.length!==8){json(response,400,{error:{type:"invalid_member_credentials",message:"등록 정보를 다시 확인해 주세요."}});return}
  try{const result=await Topics.memberLogin(credentials);if(!result?.token){json(response,401,{error:{type:"member_not_found",message:result?.error||"등록 정보를 확인해 주세요."}});return}json(response,200,{token:result.token,expiresAt:result.expiresAt||null})}catch{json(response,502,{error:{type:"member_service_unavailable",message:"멤버 확인 서비스를 잠시 사용할 수 없습니다."}})}
};
