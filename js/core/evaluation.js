// Scores are declared deterministic criterion checks, not an aesthetic judgment.
async function enrichEvaluation(result){
 if(result.phase==='warmup')return undefined;
 var q=result.quality,category=result.promptType,criteria,status,evaluator,version,task;
 if(q&&q.status!=='not-assessed'){
  criteria=q.criteria.map(c=>({id:c.id,passed:!!c.passed}));status=['pass','fail'].includes(q.status)?'assessed':'incomplete';evaluator=q.evaluatorId;version=q.evaluatorVersion;task=q.taskId;
 }else if(result.kind==='agentic'&&result.agentic?.scenario&&result.agentic?.evaluation?.criteria){
  category='agentic';var outcome=result.agentic.evaluation;
  criteria=outcome.criteria.map(c=>({id:c.id,passed:c.passed===true}));if(typeof outcome.goalCompleted==='boolean')criteria.push({id:'functional-goal',passed:outcome.goalCompleted});
  status=result.executionOutcome==='completed'&&outcome.criteria.every(c=>typeof c.passed==='boolean')&&typeof outcome.goalCompleted==='boolean'?'assessed':'incomplete';evaluator='llmb-agentic-criteria';version=result.agentic.scenario.version;task=result.agentic.scenario.id;
 }else return undefined;
 if(!EvaluationContract.CATEGORIES.includes(category)||!result.protocol?.promptDigest||!evaluator||!version||!task)return undefined;
 var datasetDigest=await promptFingerprint(EvaluationContract.canonical({promptDigest:result.protocol.promptDigest,evaluator,version,task}));if(!datasetDigest)return undefined;
 var evaluation=EvaluationContract.assessment({category,protocolId:evaluator,protocolVersion:version,taskId:task,datasetDigest,evaluatorId:evaluator,evaluatorVersion:version,criteria,status});
 if(typeof qualityTasksFor==='function'&&['conversation','creative','factual','code','logic','math'].includes(category)){
  var cases=qualityTasksFor(category),tasks=[];for(var entry of cases){var sample=entry.qualityTask,digest=await promptFingerprint(EvaluationContract.canonical({promptDigest:await promptFingerprint(entry.prompt),evaluator:'llmb-'+sample.family,version:LLMB_QUALITY_VERSION,task:sample.id}));tasks.push({id:sample.id,datasetDigest:digest});}
  tasks.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(tasks.some(t=>t.id===task&&t.datasetDigest===datasetDigest))evaluation.suite={id:'llmb-standard-'+category,version:'1.0.0',datasetDigest:await promptFingerprint(EvaluationContract.canonical(tasks)),aggregation:'mean-equal-tasks',tasks};
 }
 return evaluation;
}
