"use strict";
const {json,rateLimit,readJson,requireSession,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_ITEMS=62;

// Server backup of the admin's working topics. The admin app still edits topics in localStorage;
// it pushes changed dates here after each save and restores missing ones after login.
module.exports=async function handler(request,response){
  if(!["GET","PUT"].includes(request.method)){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"GET, PUT"});return}
  if(!requireSession(request,response))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"shared_topic_store_not_configured",message:"공유 토픽 저장소 설정이 필요합니다."}});return}
  if(request.method==="GET"){
    if(!rateLimit(request,response,"admin-topic-backups-read",30,60*1000))return;
    try{json(response,200,{topics:await Topics.listAdminTopicBackups()})}catch(error){Topics.recordFailure("admin-topic-backups-read",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"서버 백업을 불러오지 못했습니다."}})}
    return;
  }
  if(!verifySameOrigin(request,response)||!rateLimit(request,response,"admin-topic-backups-write",60,60*1000))return;
  const body=await readJson(request,response,4000000);if(!body)return;
  const upserts=Array.isArray(body.upserts)?body.upserts:[],deletes=Array.isArray(body.deletes)?body.deletes:[];
  if(upserts.length+deletes.length===0||upserts.length+deletes.length>MAX_ITEMS){json(response,400,{error:{type:"invalid_request",message:"백업할 토픽 목록을 확인해 주세요."}});return}
  const validUpserts=upserts.every(item=>item&&DATE.test(String(item.date||""))&&item.topic&&typeof item.topic==="object"&&!Array.isArray(item.topic)&&item.topic.date===item.date);
  const validDeletes=deletes.every(date=>DATE.test(String(date||"")));
  if(!validUpserts||!validDeletes){json(response,400,{error:{type:"invalid_request",message:"백업할 토픽 형식을 확인해 주세요."}});return}
  try{
    await Topics.saveAdminTopicBackups(upserts.map(item=>({date:item.date,topic:item.topic})));
    await Topics.deleteAdminTopicBackups(deletes);
    json(response,200,{saved:upserts.length,deleted:deletes.length});
  }catch(error){Topics.recordFailure("admin-topic-backups-write",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"서버 백업에 실패했습니다."}})}
};
