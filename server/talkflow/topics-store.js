"use strict";
const TopicV4=require("../../talkflow/topic-v4-generation");

function configuration(){
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const anonKey=String(process.env.SUPABASE_ANON_KEY||"");
  const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"");
  return{url,anonKey,serviceKey,memberConfigured:Boolean(url&&anonKey),configured:Boolean(url&&anonKey&&serviceKey)};
}

const retryableStatus=status=>[502,503,504].includes(status);
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const requestTimeout=milliseconds=>Number.isInteger(milliseconds)&&milliseconds>0?milliseconds:5000;
const requestTimeoutError=()=>Object.assign(new Error("shared_topic_store_timeout"),{code:"upstream_timeout",status:504});
const retryableError=error=>!error?.status||retryableStatus(error.status)||error.code==="upstream_timeout";
function recordFailure(route,error){
  const status=Number.isInteger(error?.status)?error.status:null;
  const code=error?.code==="upstream_timeout"?"upstream_timeout":status===null?"upstream_connection_failed":"upstream_request_failed";
  console.error(JSON.stringify({event:"talkflow_upstream_failure",route,status,code}));
}
async function supabaseRequest(path,{key,method="POST",body,prefer="return=representation",retries=0,timeoutMs}={},fetchImpl=fetch){
  const {url}=configuration(),request={method,headers:{apikey:key,authorization:`Bearer ${key}`,"content-type":"application/json",prefer},body:body===undefined?undefined:JSON.stringify(body)},timeout=requestTimeout(timeoutMs);
  for(let attempt=0;;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetchImpl(`${url}/rest/v1/${path}`,{...request,signal:controller.signal}),payload=await response.json().catch(()=>null);
      if(response.ok)return payload;
      const error=new Error("shared_topic_store_failed");error.status=response.status;error.payload=payload;
      throw error;
    }catch(error){
      const failure=controller.signal.aborted?requestTimeoutError():error;
      if(attempt>=retries||!retryableError(failure))throw failure;
    }finally{
      clearTimeout(timer);
    }
    await wait(250*(attempt+1));
  }
}

async function memberLogin(credentials){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_portal",{key:anonKey,body:{p_action:"verify",p_payload:credentials},retries:1})}
async function memberHandoff(code){const {anonKey}=configuration(),result=await supabaseRequest("rpc/conversation_topic_sso",{key:anonKey,body:{p_action:"exchange",p_payload:{handoff:code}}});return{token:result?.session||"",expiresAt:result?.expiresAt||null}}
async function memberTopics(token,month){const {anonKey}=configuration(),result=await supabaseRequest("rpc/conversation_member_topics",{key:anonKey,body:{p_action:"list",p_payload:{token,month}},retries:1});return Array.isArray(result?.topics)?{...result,topics:result.topics.map(TopicV4.migrateLegacyRmTopic)}:result}
async function memberProgress(token,action,payload){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_topic_progress",{key:anonKey,body:{p_action:action,p_payload:{token,...payload}},retries:1})}
async function memberTopicView(token,date){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_topic_view",{key:anonKey,body:{p_payload:{token,date}},retries:1})}
async function managerTopicViews(month){const {serviceKey}=configuration();return supabaseRequest("rpc/conversation_talkflow_view_summary",{key:serviceKey,body:{p_month:month}})}

function publishableTopic(topic){
  const copy=value=>JSON.parse(JSON.stringify(value??null));
  if(topic.topicVersion==="topic-v4.3")return{id:String(topic.id||""),date:String(topic.date||""),topicVersion:"topic-v4.3",title:copy(topic.title),category:copy(topic.category),generationEngine:String(topic.generationEngine||""),page1:copy(topic.page1),page2:copy(topic.page2)};
  return{id:String(topic.id||""),date:String(topic.date||""),title:copy(topic.title),category:copy(topic.category),style:String(topic.style||""),generationEngine:String(topic.generationEngine||""),session1:{story:copy(topic.session1?.story),easyTalk:copy(topic.session1?.easyTalk||[]),realTalk:copy(topic.session1?.realTalk||[]),expressions:copy(topic.session1?.expressions||[]),quickVote:copy(topic.session1?.quickVote)},session2:{reset:copy(topic.session2?.reset),activity:copy(topic.session2?.activity),groupResult:copy(topic.session2?.groupResult),thinkHarder:copy(topic.session2?.thinkHarder),finalQuestion:copy(topic.session2?.finalQuestion)}};
}

async function publishTopic(topic){
  const {serviceKey}=configuration(),published=publishableTopic(topic),publishedAt=new Date().toISOString();
  await supabaseRequest("talkflow_published_topics?on_conflict=date",{key:serviceKey,method:"POST",prefer:"resolution=merge-duplicates,return=representation",body:{date:published.date,topic:published,published_at:publishedAt}});
  return{publishedAt};
}

async function deletePublishedTopic(date){
  const {serviceKey}=configuration();
  await supabaseRequest(`talkflow_published_topics?date=eq.${encodeURIComponent(date)}`,{key:serviceKey,method:"DELETE"});
}

// Removes only pre-v4.3 rows, so repeating the reset from another browser never deletes current topics.
async function deleteLegacyPublishedTopics(){
  const {serviceKey}=configuration(),filter=encodeURIComponent("(topic->>topicVersion.is.null,topic->>topicVersion.neq.topic-v4.3)");
  await supabaseRequest(`talkflow_published_topics?or=${filter}`,{key:serviceKey,method:"DELETE"});
}

async function boardTopic(date){
  const {serviceKey}=configuration();
  const rows=await supabaseRequest(`talkflow_published_topics?date=eq.${encodeURIComponent(date)}&select=date%2Ctopic%2Cpublished_at`,{key:serviceKey,method:"GET"});
  const row=Array.isArray(rows)?rows[0]:null;
  const topic=row?.topic;
  if(!topic||topic.topicVersion!=="topic-v4.3"||topic.date!==date)return null;
  return JSON.parse(JSON.stringify(topic));
}

module.exports={configuration,memberLogin,memberHandoff,memberTopics,memberProgress,memberTopicView,managerTopicViews,publishableTopic,publishTopic,deletePublishedTopic,deleteLegacyPublishedTopics,boardTopic,recordFailure,__test:{supabaseRequest,recordFailure}};
