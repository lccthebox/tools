"use strict";

const {json,rateLimit}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

const ADMIN_ORIGINS=new Set([
  "https://thebox-conversation-admin.vercel.app",
  "https://thebox-conversation-admin-theboxis.vercel.app"
]);

function allowBoardOrigin(request,response){
  const origin=String(request.headers.origin||"");
  response.setHeader("vary","origin");
  if(!origin)return true;
  if(!ADMIN_ORIGINS.has(origin))return false;
  response.setHeader("access-control-allow-origin",origin);
  return true;
}

module.exports=async function handler(request,response){
  if(!allowBoardOrigin(request,response)){json(response,403,{error:{type:"forbidden",message:"허용되지 않은 출처입니다."}});return}
  if(request.method!=="GET"){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"GET"});return}
  if(!rateLimit(request,response,"board-topic",60,60*1000))return;
  const date=String(request.query?.date||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){json(response,400,{error:{type:"invalid_request",message:"토픽 날짜를 확인해 주세요."}});return}
  if(!Topics.configuration().configured){json(response,503,{error:{type:"topic_store_not_configured",message:"Talkflow 토픽 저장소를 준비 중입니다."}});return}
  try{
    const topic=await Topics.boardTopic(date);
    if(!topic){json(response,404,{error:{type:"topic_not_found",message:"선택한 날짜에 승인된 Talkflow 토픽이 없습니다."}});return}
    json(response,200,{topic});
  }catch(error){Topics.recordFailure("board-topic",error);json(response,502,{error:{type:"topic_store_unavailable",message:"Talkflow 토픽을 불러오지 못했습니다."}})}
};
