"use strict";

const PUBLIC_START_DATE="2026-10-01";
const PUBLIC_START_MONTH=PUBLIC_START_DATE.slice(0,7);
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const monthPattern=/^\d{4}-\d{2}$/;

function isPublicTopicDate(value){return datePattern.test(String(value||""))&&String(value)>=PUBLIC_START_DATE}
function isPublicMonth(value){return monthPattern.test(String(value||""))&&String(value)>=PUBLIC_START_MONTH}

module.exports={PUBLIC_START_DATE,PUBLIC_START_MONTH,isPublicTopicDate,isPublicMonth};
