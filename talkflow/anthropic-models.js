(function(root){
  "use strict";
  const DEFAULT_MODEL="claude-sonnet-4-6";
  const RETIRED_MODELS=Object.freeze(["claude-sonnet-4-20250514"]);
  const safeText=value=>typeof value==="string"?value.trim():"";
  function normalizeModel(value){
    const id=safeText(value?.id),displayName=safeText(value?.display_name)||id;
    if(!id)return null;
    return{id,displayName,createdAt:safeText(value?.created_at||value?.released_at),maxInputTokens:Number(value?.max_input_tokens)||null,maxTokens:Number(value?.max_tokens)||null};
  }
  function parseModels(payload){
    if(!payload||!Array.isArray(payload.data))throw new Error("Models API 응답 형식이 올바르지 않습니다.");
    return payload.data.map(normalizeModel).filter(Boolean);
  }
  function isRetired(id){return RETIRED_MODELS.includes(safeText(id))}
  function timestamp(model){const value=Date.parse(model.createdAt||"");return Number.isFinite(value)?value:0}
  function isSonnet(model){return /sonnet/i.test(`${model.id} ${model.displayName}`)}
  function chooseModel(models,savedModel=""){
    const available=models.filter(model=>!isRetired(model.id));
    if(savedModel&&!isRetired(savedModel)&&available.some(model=>model.id===savedModel))return{modelId:savedModel,fallback:false};
    if(available.some(model=>model.id===DEFAULT_MODEL))return{modelId:DEFAULT_MODEL,fallback:Boolean(savedModel&&savedModel!==DEFAULT_MODEL)};
    const sonnet=available.filter(isSonnet).sort((a,b)=>timestamp(b)-timestamp(a)||b.id.localeCompare(a.id))[0];
    if(sonnet)return{modelId:sonnet.id,fallback:Boolean(savedModel&&savedModel!==sonnet.id)};
    const first=[...available].sort((a,b)=>timestamp(b)-timestamp(a)||b.id.localeCompare(a.id))[0];
    return{modelId:first?.id||"",fallback:Boolean(savedModel&&savedModel!==first?.id)};
  }
  function publicError(error,stage="plan",modelId=""){
    const payload=error?.payload?.error||error?.error||{},type=safeText(payload.type||error?.type)||"unknown_error",message=safeText(payload.message||error?.message)||"알 수 없는 오류",status=Number(error?.httpStatus||error?.status)||null,requestId=safeText(error?.payload?.request_id||error?.requestId);
    const unavailable=status===404&&type==="not_found_error"&&/model/i.test(message);
    return{stage,httpStatus:status,type,message:unavailable?"선택한 AI 모델이 더 이상 제공되지 않습니다.":message,modelId,requestId,lastAttemptAt:new Date().toISOString(),modelUnavailable:unavailable};
  }
  root.TalkFlowAnthropicModels=Object.freeze({DEFAULT_MODEL,RETIRED_MODELS,parseModels,chooseModel,isRetired,publicError});
})(typeof window==="undefined"?globalThis:window);
