"use strict";

function configuration(){
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const anonKey=String(process.env.SUPABASE_ANON_KEY||"");
  const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"");
  return{url,anonKey,serviceKey,configured:Boolean(url&&anonKey&&serviceKey)};
}

async function supabaseRequest(path,{key,method="POST",body}={}){
  const {url}=configuration();
  const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,authorization:`Bearer ${key}`,"content-type":"application/json",prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await response.json().catch(()=>null);
  if(!response.ok){const error=new Error("shared_topic_store_failed");error.status=response.status;error.payload=payload;throw error}
  return payload;
}

async function memberLogin(credentials){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_portal",{key:anonKey,body:{p_action:"verify",p_payload:credentials}})}
async function memberTopics(token,month){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_topics",{key:anonKey,body:{p_action:"list",p_payload:{token,month}}})}
async function memberProgress(token,action,payload){const {anonKey}=configuration();return supabaseRequest("rpc/conversation_member_topic_progress",{key:anonKey,body:{p_action:action,p_payload:{token,...payload}}})}

function publishableTopic(topic){
  const copy=value=>JSON.parse(JSON.stringify(value??null));
  if(topic.topicVersion==="topic-v4")return{id:String(topic.id||""),topicVersion:"topic-v4",date:String(topic.date||""),title:copy(topic.title),category:copy(topic.category),page1:copy(topic.page1),page2:copy(topic.page2)};
  return{id:String(topic.id||""),date:String(topic.date||""),title:copy(topic.title),category:copy(topic.category),style:String(topic.style||""),generationEngine:String(topic.generationEngine||""),session1:{story:copy(topic.session1?.story),easyTalk:copy(topic.session1?.easyTalk||[]),realTalk:copy(topic.session1?.realTalk||[]),expressions:copy(topic.session1?.expressions||[]),quickVote:copy(topic.session1?.quickVote)},session2:{reset:copy(topic.session2?.reset),activity:copy(topic.session2?.activity),groupResult:copy(topic.session2?.groupResult),thinkHarder:copy(topic.session2?.thinkHarder),finalQuestion:copy(topic.session2?.finalQuestion)}};
}

async function publishTopic(topic){
  const {serviceKey}=configuration(),published=publishableTopic(topic),publishedAt=new Date().toISOString();
  await supabaseRequest("talkflow_published_topics?on_conflict=date",{key:serviceKey,method:"POST",body:{date:published.date,topic:published,published_at:publishedAt}});
  return{publishedAt};
}

module.exports={configuration,memberLogin,memberTopics,memberProgress,publishableTopic,publishTopic};
