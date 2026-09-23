"use strict";
const {json,rateLimit,readJson,requireSession,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");

module.exports=async function handler(request,response){
  if(request.method!=="PUT"){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"PUT"});return}
  if(!requireSession(request,response)||!verifySameOrigin(request,response)||!rateLimit(request,response,"publish-topic",20,60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"shared_topic_store_not_configured",message:"공유 토픽 저장소 설정이 필요합니다."}});return}
  const body=await readJson(request,response,160000);if(!body)return;const topic=body.topic;
  const complete=topic?.topicVersion==="topic-v4"?Boolean(topic.page1&&topic.page2):Boolean(topic?.session1&&topic?.session2);
  if(!topic||topic.quality?.status!=="approved"||!/^\d{4}-\d{2}-\d{2}$/.test(topic.date||"")||!complete){json(response,400,{error:{type:"invalid_topic",message:"승인된 완성 토픽만 공개할 수 있습니다."}});return}
  try{json(response,200,await Topics.publishTopic(topic))}catch{json(response,502,{error:{type:"shared_topic_store_failed",message:"공유 토픽 저장에 실패했습니다."}})}
};
