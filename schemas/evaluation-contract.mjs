// Independent evaluation contract v1. No service connection, user ID or device ID.
export const EVALUATION_VERSION='1.0.0';
export const CATEGORIES=['conversation','creative','factual','code','logic','math','agentic','image','video','audio'];
export function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
export function normalizedAnswer(text){return String(text??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-FR');}
export function assessment({category,protocolId,protocolVersion,taskId,datasetDigest,evaluatorId,evaluatorVersion,criteria,status='assessed'}){
 const assessed=status==='assessed'&&criteria.length>0;
 return {contractVersion:EVALUATION_VERSION,category,protocol:{id:protocolId,version:protocolVersion},task:{id:taskId,datasetDigest},evaluator:{id:evaluatorId,version:evaluatorVersion,method:'deterministic'},status:assessed?'assessed':status==='assessed'?'not-assessed':status,score:assessed?{value:100*criteria.filter(c=>c.passed).length/criteria.length,min:0,max:100,direction:'higher-is-better'}:null,criteria:assessed?criteria.map(c=>({id:c.id,passed:!!c.passed})):[]};
}
export function validateAssessment(evaluation){
 if(!evaluation||evaluation.contractVersion!==EVALUATION_VERSION||!CATEGORIES.includes(evaluation.category))throw Error('Contrat d’évaluation inconnu.');
 if(evaluation.suite){const tasks=evaluation.suite.tasks;if(!Array.isArray(tasks)||!tasks.length||new Set(tasks.map(t=>t.id)).size!==tasks.length||!tasks.some(t=>t.id===evaluation.task.id&&t.datasetDigest===evaluation.task.datasetDigest))throw Error('Épreuve absente de la batterie déclarée.');}
 if(evaluation.status!=='assessed'){if(evaluation.score!==null||evaluation.criteria.length)throw Error('Une évaluation incomplète ne porte pas de score.');return true;}
 const s=evaluation.score;if(!s||!Number.isFinite(s.value)||s.min!==0||s.max!==100||s.direction!=='higher-is-better'||s.value<0||s.value>100)throw Error('Score d’évaluation invalide.');
 if(!evaluation.criteria.length||new Set(evaluation.criteria.map(c=>c.id)).size!==evaluation.criteria.length)throw Error('Critères absents ou répétés.');
 if(evaluation.evaluator.method==='deterministic'&&Math.abs(s.value-100*evaluation.criteria.filter(c=>c.passed).length/evaluation.criteria.length)>1e-8)throw Error('Score incohérent avec les critères.');
 return true;
}
function cleanReadings(value){
 if(Array.isArray(value))return value.map(cleanReadings);
 if(!value||typeof value!=='object')return value;
 const isReading='unit' in value&&'status' in value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>!['observedAt','capturedAt','collectedAt','hostname','serialNumber'].includes(key)&&!(isReading&&['source','method','nodeId'].includes(key))).map(([k,v])=>[k,cleanReadings(v)]));
}
export function measurementContent(test,machines,execution){
 const nodes=(machines||[]).filter(m=>(test.participatingNodeIds||[]).includes(m.id)).map(m=>({platform:m.platform,memory:cleanReadings(m.memory),cpus:(m.cpus||[]).map(({id,...cpu})=>cleanReadings(cpu)).sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0),gpus:(m.gpus||[]).map(({id,...gpu})=>cleanReadings(gpu)).sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0)})).sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0);
 const model={...test.model,format:test.model.format??null};delete model.naming;
 const protocol={...test.protocol};delete protocol.campaignId;delete protocol.contextOrder;
 const agentic=test.agentic?{scenario:test.agentic.scenario,budget:test.agentic.budget,evaluation:test.agentic.evaluation,tools:test.agentic.tools?.map(t=>({id:t.id,kind:t.kind,name:t.name,version:t.version}))}:undefined;
 return canonical({hashVersion:'measurement-v1',kind:test.kind,status:test.status,startedAt:new Date(test.startedAt).toISOString(),finishedAt:new Date(test.finishedAt).toISOString(),completion:test.completion,verdict:test.verdict,quality:test.quality?{evaluatorId:test.quality.evaluatorId,evaluatorVersion:test.quality.evaluatorVersion,status:test.quality.status,criteria:test.quality.criteria?.map(c=>({id:c.id,passed:c.passed})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}:undefined,model,parameters:test.parameters,protocol,metrics:cleanReadings(test.metrics),evaluation:test.evaluation?{...test.evaluation,criteria:[...test.evaluation.criteria].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),...(test.evaluation.suite?{suite:{...test.evaluation.suite,tasks:[...test.evaluation.suite.tasks].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}}:{})}:undefined,multimodal:test.multimodal,agentic,hardware:nodes,runner:execution.runner});
}
export function measurementIdentity(test,machines,execution){
 const value=JSON.parse(measurementContent(test,machines,execution));value.hashVersion='event-v1';delete value.metrics;delete value.status;delete value.finishedAt;delete value.completion;delete value.verdict;delete value.quality;
 if(value.evaluation){delete value.evaluation.score;delete value.evaluation.status;delete value.evaluation.criteria;}
 if(value.agentic)delete value.agentic.evaluation;
 return canonical(value);
}
export function comparisonKey(test,execution){
 const e=test.evaluation;if(!e)return null;validateAssessment(e);
 const p=test.parameters||{};
 return canonical({category:e.category,contractVersion:e.contractVersion,protocol:e.protocol,task:e.suite?null:e.task,suite:e.suite?{...e.suite,tasks:[...e.suite.tasks].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}:null,evaluator:e.evaluator,criteria:e.suite?null:e.criteria.map(c=>c.id).sort(),cachePolicy:test.protocol?.cachePolicy??null,temperature:p.temperature,maxOutputTokens:p.maxOutputTokens,contextTokens:p.contextTokens,requestedContextTokens:p.requestedContextTokens,contextMode:p.contextMode,thinking:{enabled:p.thinking?.enabled??null,budgetTokens:p.thinking?.budgetTokens??null},seed:p.seed??null,topP:p.topP??null,topK:p.topK??null,concurrency:p.concurrency,runner:execution.runner,agentic:test.agentic?{budget:test.agentic.budget,workspacePolicy:test.agentic.workspacePolicy,orchestrator:test.agentic.orchestrator,tools:(test.agentic.tools||[]).map(t=>({id:t.id,name:t.name,version:t.version,capabilities:t.capabilities})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}:null,multimodal:test.multimodal?{modality:test.multimodal.modality,representation:test.multimodal.representation,processingVersion:test.multimodal.processingVersion,frameTimes:e.suite?null:test.multimodal.frameTimes??[],audioIncluded:test.multimodal.audioIncluded}:null});
}
export function rankingEligibility(test){
 if(!test.evaluation||test.evaluation.status!=='assessed')return 'not-assessed';
 if(test.protocol?.phase!=='measurement')return 'not-measurement';
 if(test.status!=='success'&&!(test.kind==='agentic'&&test.verdict?.execution==='completed'))return 'incomplete-or-failed';
 if(test.completion?.limitReached||test.parameters?.concurrency!==1)return 'incomplete-or-concurrent';
 if(!Number.isFinite(test.parameters?.temperature)||(!Number.isSafeInteger(test.parameters?.maxOutputTokens)||test.parameters.maxOutputTokens<1))return 'unknown-conditions';
 validateAssessment(test.evaluation);return null;
}
