"use strict";
const {json,rateLimit,readJson,requireSession,verifySameOrigin}=require("../../server/talkflow/security");
const Topics=require("../../server/talkflow/topics-store");
const {PUBLIC_START_DATE,isPublicTopicDate}=require("../../server/talkflow/public-window");

module.exports=async function handler(request,response){
  if(!["GET","PUT","DELETE"].includes(request.method)){json(response,405,{error:{type:"method_not_allowed",message:"허용되지 않은 요청입니다."}},{allow:"GET, PUT, DELETE"});return}
  if(request.method==="GET"){
    if(!requireSession(request,response)||!rateLimit(request,response,"manager-topic-views",60,60*1000))return;
    const month=String(request.query?.month||"");
    if(!/^\d{4}-\d{2}$/.test(month)){json(response,400,{error:{type:"invalid_request",message:"조회할 달을 확인해 주세요."}});return}
    if(!Topics.configuration().configured){json(response,503,{error:{type:"shared_topic_store_not_configured",message:"공유 토픽 저장소 설정이 필요합니다."}});return}
    try{
      const result=await Topics.managerTopicViews(month);
      const views=Object.fromEntries(Object.entries(result?.views||{}).filter(([date,count])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isInteger(count)&&count>=0));
      json(response,200,{views});
    }catch(error){Topics.recordFailure("manager-topic-views",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"열람 현황을 불러오지 못했습니다."}})}
    return;
  }
  if(!requireSession(request,response)||!verifySameOrigin(request,response)||!rateLimit(request,response,"publish-topic",20,60*1000))return;
  if(!Topics.configuration().configured){json(response,503,{error:{type:"shared_topic_store_not_configured",message:"공유 토픽 저장소 설정이 필요합니다."}});return}
  const body=await readJson(request,response,160000);if(!body)return;
  if(request.method==="DELETE"){
    if(body.legacy===true){
      if(body.confirm!=="DELETE_LEGACY_PUBLISHED_TOPICS"){json(response,400,{error:{type:"invalid_request",message:"이전 버전 토픽 삭제 확인 정보가 필요합니다."}});return}
      try{await Topics.deleteLegacyPublishedTopics();json(response,200,{deleted:true,legacy:true})}catch(error){Topics.recordFailure("delete-legacy-published-topics",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"이전 버전 공유 토픽 삭제에 실패했습니다."}})}
      return;
    }
    const date=String(body.date||"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){json(response,400,{error:{type:"invalid_request",message:"삭제할 토픽 날짜를 확인해 주세요."}});return}
    try{await Topics.deletePublishedTopic(date);json(response,200,{deleted:true})}catch(error){Topics.recordFailure("delete-published-topic",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"공유 토픽 삭제에 실패했습니다."}})}
    return;
  }
  const topic=body.topic;
  const complete=topic?.topicVersion==="topic-v4.3"?Boolean(topic.page1&&topic.page2):Boolean(topic?.session1&&topic?.session2);
  if(!topic||topic.quality?.status!=="approved"||!/^\d{4}-\d{2}-\d{2}$/.test(topic.date||"")||!complete){json(response,400,{error:{type:"invalid_topic",message:"승인된 완성 토픽만 공개할 수 있습니다."}});return}
  if(!isPublicTopicDate(topic.date)){json(response,400,{error:{type:"publication_not_open",message:`멤버 공개는 ${PUBLIC_START_DATE}부터 가능합니다.`}});return}
  try{json(response,200,await Topics.publishTopic(topic))}catch(error){Topics.recordFailure("publish-topic",error);json(response,502,{error:{type:"shared_topic_store_failed",message:"공유 토픽 저장에 실패했습니다."}})}
};
