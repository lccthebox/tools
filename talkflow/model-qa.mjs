import "./anthropic-models.js";

const Models=globalThis.TalkFlowAnthropicModels;
const checks=[];
function check(name,condition){checks.push(name);if(!condition)throw new Error(name)}

const parsed=Models.parseModels({data:[
  {id:"claude-opus-4-6",display_name:"Claude Opus 4.6",created_at:"2026-02-05T00:00:00Z"},
  {id:"claude-sonnet-4-6",display_name:"Claude Sonnet 4.6",created_at:"2026-02-17T00:00:00Z",max_input_tokens:200000,max_tokens:64000}
]});
check("Models API fields are normalized",parsed[1].displayName==="Claude Sonnet 4.6"&&parsed[1].maxInputTokens===200000&&parsed[1].maxTokens===64000);
check("saved available model is preserved",Models.chooseModel(parsed,"claude-opus-4-6").modelId==="claude-opus-4-6");
check("retired saved model is invalidated",Models.chooseModel(parsed,"claude-sonnet-4-20250514").modelId==="claude-sonnet-4-6");
check("recommended default is preferred",Models.chooseModel(parsed).modelId==="claude-sonnet-4-6");
check("latest Sonnet fallback is selected",Models.chooseModel([{id:"claude-sonnet-old",displayName:"Sonnet",createdAt:"2025-01-01"},{id:"claude-sonnet-new",displayName:"Sonnet",createdAt:"2026-01-01"}]).modelId==="claude-sonnet-new");
check("first recent text model is final fallback",Models.chooseModel([{id:"claude-haiku",displayName:"Haiku",createdAt:"2026-01-01"}]).modelId==="claude-haiku");
check("empty model list blocks selection",Models.chooseModel([]).modelId==="");
check("retired denylist contains reported model",Models.isRetired("claude-sonnet-4-20250514"));
const error=Models.publicError({httpStatus:404,type:"not_found_error",message:"model: claude-sonnet-4-20250514",requestId:"req"},"plan","claude-sonnet-4-20250514");
check("not_found_error is safely classified",error.modelUnavailable&&error.message==="선택한 AI 모델이 더 이상 제공되지 않습니다."&&error.httpStatus===404);
let invalid=false;try{Models.parseModels({data:null})}catch{invalid=true}check("invalid Models API response fails closed",invalid);
console.log(`model-qa: PASS (${checks.length} checks)`);
