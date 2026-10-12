// Media bytes remain in memory and are sent only to the explicitly selected runner.
var MULTIMODAL_MIME={image:['image/png','image/jpeg','image/webp'],video:['video/mp4','video/webm'],audio:['audio/wav','audio/x-wav','audio/mpeg','audio/mp3','audio/ogg','audio/flac']};
function mediaMime(file){var mime=file.type||({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',flac:'audio/flac'})[file.name.split('.').pop().toLowerCase()]||'';return ({'audio/x-wav':'audio/wav','audio/mp3':'audio/mpeg','image/jpg':'image/jpeg'})[mime]||mime;}
async function mediaDigest(buffer){var hash=await crypto.subtle.digest('SHA-256',buffer);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
function mediaBase64(buffer){var bytes=new Uint8Array(buffer),chunks=[];for(var i=0;i<bytes.length;i+=8192)chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+8192)));return btoa(chunks.join(''));}
function mediaRemote(runner,model){if(typeof isOllamaCloud==='function'&&isOllamaCloud(model))return true;try{return !['localhost','127.0.0.1','[::1]'].includes(new URL(runner==='custom'?state.customBase:RUNNERS[runner].base).hostname)}catch(_){return true}}
var FIXED_MEDIA={image:{path:'benchmarks/media/image.png',mime:'image/png',prompt:'Décris précisément ce qui est visible dans cette image.',expected:'',representation:'native'},video:{path:'benchmarks/media/video.mp4',mime:'video/mp4',prompt:'Décris dans l’ordre les actions visibles dans cette vidéo.',expected:'',representation:'frames'},audio:{path:'benchmarks/media/audio.wav',mime:'audio/wav',prompt:'Transcris uniquement les paroles de cet audio, sans commentaire.',expected:'',representation:'native'}};
function fixedMediaMode(){return document.getElementById('mediaSource')?.value==='fixed'}
async function fixedMediaCase(modality,signal,inputOnly){
 var base=FIXED_MEDIA[modality];if(!base)throw Error('Catégorie média inconnue.');
 var response=await fetchWithTimeout('benchmarks/media/cases.json',{cache:'no-store',signal},10000),config={};
 if(response.ok){var text=await response.text();if(text.length>60000)throw Error('Configuration média trop volumineuse.');try{config=JSON.parse(text)}catch(_){throw Error('benchmarks/media/cases.json : JSON invalide.')}if(config.version!=='1.0.0'||!config.cases||typeof config.cases!=='object')throw Error('Configuration média : version 1.0.0 et cases requises.');}
 else if(response.status!==404)throw Error('Lecture de cases.json impossible (HTTP '+response.status+').');
 var c=config.cases?.[modality]??{},prompt=inputOnly?'':c.prompt??base.prompt,expected=c.expected??base.expected,representation=c.representation??base.representation;
 if(typeof prompt!=='string'||(!inputOnly&&!prompt.trim())||prompt.length>12000||typeof expected!=='string'||expected.length>4000||!['native','frames'].includes(representation)||(modality!=='video'&&representation!=='native'))throw Error('Configuration '+modality+' invalide : vérifier consigne, référence et traitement.');
 return {...base,prompt:prompt.trim(),expected:expected.trim(),representation};
}
var mediaPresetRequest=0;
async function updateMediaPreset(){
 if(!document.getElementById('mediaKind'))return;
 var generation=++mediaPresetRequest,fixed=fixedMediaMode(),modality=document.getElementById('mediaKind').value;
 document.getElementById('mediaFile').disabled=fixed;document.getElementById('mediaPrompt').readOnly=fixed;document.getElementById('mediaExpected').readOnly=fixed;document.getElementById('mediaRepresentation').disabled=fixed;
 var info=document.getElementById('mediaPresetPath');if(!fixed){if(info)info.textContent='Fichier et consigne personnalisés.';return}
 if(info)info.textContent=FIXED_MEDIA[modality]?.path||'';
 try{var c=await fixedMediaCase(modality);if(generation!==mediaPresetRequest||!fixedMediaMode())return;document.getElementById('mediaPrompt').value=c.prompt;document.getElementById('mediaExpected').value=c.expected;document.getElementById('mediaRepresentation').value=c.representation;}
 catch(e){if(generation===mediaPresetRequest&&info)info.textContent=e.message;}
}
async function loadFixedMedia(c,signal){
 var response=await fetchWithTimeout(c.path,{cache:'no-store',signal},15000);
 if(!response.ok)throw Error('Fichier de référence absent ou inaccessible : '+c.path+' (HTTP '+response.status+'). Déposez votre fichier dans ce dossier.');
 var length=Number(response.headers?.get('Content-Length'));if(Number.isFinite(length)&&length>20*1024*1024)throw Error('Fichier de référence : 20 Mio maximum.');
 var blob=await response.blob();if(!blob.size||blob.size>20*1024*1024)throw Error('Fichier de référence : taille de 1 octet à 20 Mio.');
 return new File([blob],c.path.split('/').pop(),{type:c.mime});
}
function unsupportedMedia(message){var error=new Error(message);error.code='MEDIA_UNSUPPORTED';return error;}
function declaredMediaRefusal(text,expected){
 var value=EvaluationContract.normalizedAnswer(text);if(expected&&value===EvaluationContract.normalizedAnswer(expected))return false;
 return /^(?:désolé[,.! ]*|sorry[,.! ]*)?(?:je (?:ne peux pas|n’ai pas la capacité de|n'ai pas la capacité de) (?:voir|lire|écouter|entendre|analyser|interpréter|traiter|accéder à)|i (?:cannot|can't|am unable to) (?:see|view|hear|listen to|access|process|analy[sz]e))[^\n]{0,100}(?:image|vidéo|video|audio|média|media|son|sound|file)/i.test(value)||/^(?:ce modèle|this model)[^\n]{0,60}(?:ne (?:prend|supporte) pas|does not support|doesn't support)[^\n]{0,60}(?:image|vidéo|video|audio|média|media)/i.test(value);
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('DOMContentLoaded',updateMediaPreset);
async function sampleVideo(file,signal){
 var url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
 function wait(event,action){return new Promise((resolve,reject)=>{var timer=setTimeout(()=>finish(new Error('Décodage vidéo trop long.')),15000);function finish(error){clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',bad);signal?.removeEventListener('abort',bad);error?reject(error):resolve()}function ok(){finish()}function bad(){finish(new Error(signal?.aborted?'Test annulé.':'Vidéo non décodable.'))}video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',bad,{once:true});if(signal?.aborted)bad();else action()})}
 try{await wait('loadeddata',()=>{video.src=url});var duration=video.duration;if(!Number.isFinite(duration)||duration<=0||duration>120)throw Error('Vidéo : durée maximale 120 secondes.');if(!video.videoWidth||!video.videoHeight)throw Error('Vidéo sans image.');var canvas=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));var context=canvas.getContext('2d');if(!context)throw Error('Décodage vidéo non disponible.');var frames=[],times=[];
 for(var i=0;i<8;i++){var time=duration*(i+.5)/8;await wait('seeked',()=>{video.currentTime=time});context.drawImage(video,0,0,canvas.width,canvas.height);frames.push(canvas.toDataURL('image/jpeg',.85).split(',')[1]);times.push(Number(time.toFixed(6)))}return {frames,times};
 }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
}
function multimodalRequest(runner,model,prompt,media,temperature,maxTokens,keys){
 if(media.frames&&prompt)prompt+='\nLes '+media.frames.length+' images sont présentées dans l’ordre chronologique, aux secondes '+media.descriptor.frameTimes.join(', ')+'. La piste audio n’est pas transmise.';
 var mime=media.descriptor.mimeType,modality=media.descriptor.modality,headers={'Content-Type':'application/json'},base=runner==='custom'?state.customBase:RUNNERS[runner]?.base;if(!base)throw Error('URL du runner manquante.');base=base.replace(/\/$/,'');
 var images=media.frames||[media.base64],parts=prompt?[{type:'text',text:prompt}]:[];
 if(runner==='gemini'){
  if(!keys.gemini)throw Error('Clé API Gemini manquante.');headers['x-goog-api-key']=keys.gemini;
  var nativeParts=[...(prompt?[{text:prompt}]:[]),...(media.frames?media.frames.map(data=>({inlineData:{mimeType:'image/jpeg',data}})):[{inlineData:{mimeType:mime,data:media.base64}}])];return {url:base+'/v1beta/models/'+encodeURIComponent(model.replace(/^models\//,''))+':generateContent',headers,body:{contents:[{role:'user',parts:nativeParts}],generationConfig:{temperature,maxOutputTokens:maxTokens}},format:'gemini'};
 }
 if(modality==='video'&&!media.frames)throw unsupportedMedia('La vidéo native est disponible avec Gemini. Pour ce runner, choisir les images échantillonnées (sans audio).');
 if(runner==='ollama'){
  if(modality==='audio')throw unsupportedMedia('Cet adaptateur Ollama accepte les images et les images de vidéo, pas l’audio natif. Choisir un runner compatible audio.');
  return {url:base+'/api/chat',headers,body:{model,messages:[{role:'user',content:prompt,images}],stream:false,options:buildOllamaOptions(temperature,maxTokens,getRequestedContextTokens()),keep_alive:'10m'},format:'ollama'};
 }
 if(runner==='claude'){
  if(modality==='audio')throw unsupportedMedia('Cet adaptateur Claude ne prend pas l’audio natif en charge.');if(!keys.claude)throw Error('Clé API Claude manquante.');headers['x-api-key']=keys.claude;headers['anthropic-version']='2023-06-01';
  return {url:base+'/v1/messages',headers,body:{model,max_tokens:maxTokens,temperature,messages:[{role:'user',content:[...(prompt?[{type:'text',text:prompt}]:[]),...images.map(data=>({type:'image',source:{type:'base64',media_type:media.frames?'image/jpeg':mime,data}}))]}]},format:'claude'};
 }
 if(!['lmstudio','llamacpp','mlx','custom','openai','mistral'].includes(runner))throw unsupportedMedia('Runner multimodal non pris en charge.');
 if(['openai','mistral'].includes(runner)){if(!keys[runner])throw Error('Clé API manquante.');headers.Authorization='Bearer '+keys[runner]}
 if(modality==='audio'){
  if(runner==='mistral')throw unsupportedMedia('Cet adaptateur Mistral ne prend pas l’audio natif en charge.');var format=['audio/wav','audio/x-wav'].includes(mime)?'wav':['audio/mpeg','audio/mp3'].includes(mime)?'mp3':null;if(!format)throw Error('L’API chat audio compatible attend WAV ou MP3.');parts.push({type:'input_audio',input_audio:{data:media.base64,format}});
 }else images.forEach(data=>parts.push({type:'image_url',image_url:{url:'data:'+(media.frames?'image/jpeg':mime)+';base64,'+data}}));
 return {url:base+(base.endsWith('/v1')?'':'/v1')+'/chat/completions',headers,body:{model,messages:[{role:'user',content:parts}],temperature,max_tokens:maxTokens,stream:false},format:'compatible'};
}
function multimodalResponse(data,format){
 if(data.error)throw Error(typeof data.error==='string'?data.error:data.error.message||'Le runner a refusé le média.');
 var text,output,input,reason;if(format==='ollama'){text=data.message?.content;output=data.eval_count;input=data.prompt_eval_count;reason=data.done_reason}
 else if(format==='gemini'){text=data.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('');output=data.usageMetadata?.candidatesTokenCount;input=data.usageMetadata?.promptTokenCount;reason=data.candidates?.[0]?.finishReason}
 else if(format==='claude'){text=data.content?.filter(p=>p.type==='text').map(p=>p.text).join('');output=data.usage?.output_tokens;input=data.usage?.input_tokens;reason=data.stop_reason}
 else{text=data.choices?.[0]?.message?.content;output=data.usage?.completion_tokens;input=data.usage?.prompt_tokens;reason=data.choices?.[0]?.finish_reason}
 if(typeof text!=='string'||!text.trim())throw Error('Aucune réponse textuelle exploitable reçue.');return {text,output:Number.isSafeInteger(output)&&output>=0?output:null,input:Number.isSafeInteger(input)&&input>=0?input:null,reason:typeof reason==='string'?reason:null};
}
async function prepareMultimodal(file,modality,representation,signal){
 var mime=mediaMime(file);if(!MULTIMODAL_MIME[modality]?.includes(mime))throw Error('Type de fichier incompatible avec la catégorie choisie.');if(!file.size||file.size>20*1024*1024)throw Error('Média : taille de 1 octet à 20 Mio.');
 if(modality!=='video')representation='native';var bytes=await file.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>20*1024*1024)throw Error('Média trop volumineux.');var descriptor={modality,representation,inputDigest:await mediaDigest(bytes),mimeType:mime,byteLength:bytes.byteLength,processingVersion:representation==='frames'?'video-8frames-1024-jpeg85-v1':'native-bytes-v1',audioIncluded:modality==='audio'||modality==='video'&&representation==='native'};
 var media={descriptor,base64:mediaBase64(bytes)};if(representation==='frames'){var sampled=await sampleVideo(file,signal);media.frames=sampled.frames;descriptor.frameTimes=sampled.times;media.frameDigests=await Promise.all(sampled.frames.map(f=>promptFingerprint(f)));}return media;
}
async function runMultimodalBenchmark(){
 if(state.isRunning||state.batchActive||state.analysisRunning||state.controlledCampaignActive||state.configuring)return;var file=document.getElementById('mediaFile').files?.[0],modality=document.getElementById('mediaKind').value,representation=document.getElementById('mediaRepresentation').value,prompt=document.getElementById('mediaPrompt').value.trim(),expected=document.getElementById('mediaExpected').value.trim(),model=getSelectedModel(),runner=state.runner,repetitions=getRepetitions();
 if((!fixedMediaMode()&&(!file||!prompt))||!model||model==='unknown-model'){showToast('Choisir un modèle, un média et une consigne.','error');return}if(prompt.length>12000||expected.length>4000){showToast('Consigne : 12 000 caractères ; référence : 4 000.','error');return}if(!Number.isInteger(repetitions)||repetitions<1||repetitions>20){showToast('Choisir de 1 à 20 répétitions.','error');return}
 if(mediaRemote(runner,model)&&!document.getElementById('mediaConsent').checked){showToast('Confirmez l’envoi du média au runner distant choisi.','error');return}
 if(state.unsavedSession&&(await saveSessionToHistory(state.unsavedSession))===false)return;
 state.unsavedSession=null;state.isRunning=true;lockCampaignControls(true);document.getElementById('mediaControls').disabled=true;document.getElementById('mediaStop').disabled=false;var controller=new AbortController();currentAbortController=controller;var mediaStatus=document.getElementById('mediaStatus');if(mediaStatus)mediaStatus.textContent='Préparation du média…';var results=[],sessionId=crypto.randomUUID(),savedAt=new Date().toISOString();
 var stoppedReason='';try{if(fixedMediaMode()){var preset=await fixedMediaCase(modality,controller.signal);file=await loadFixedMedia(preset,controller.signal);prompt=preset.prompt;expected=preset.expected;representation=preset.representation;}await refreshModelMetadata();state.runnerVersion=null;if(runner==='ollama'){try{var versionReply=await fetchWithTimeout(RUNNERS.ollama.base+'/api/version',{},5000);if(versionReply.ok){var versionData=await versionReply.json();state.runnerVersion=typeof versionData.version==='string'?versionData.version:null}if(isOllamaCloud(model)&&state.modelMetadata)delete state.modelMetadata.digest;if(!isOllamaCloud(model)){var tagsReply=await fetchWithTimeout(RUNNERS.ollama.base+'/api/tags',{},5000);if(tagsReply.ok){var tag=(await tagsReply.json()).models?.find(m=>[m.name,m.model].some(name=>typeof name==='string'&&name.replace(/:latest$/,'')===model.replace(/:latest$/,'')));if(tag&&state.modelMetadata&&typeof tag.digest==='string')state.modelMetadata.digest=tag.digest}}}catch(_){}}if(mediaRemote(runner,model)&&!document.getElementById('mediaConsent').checked)throw Error('Confirmez l’envoi du média au moteur d’inférence distant.');var media=await prepareMultimodal(file,modality,representation,controller.signal),temperature=0,maxTokens=getMaxTokens();if(!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>32768)throw Error('Budget de sortie invalide.');
  var promptDigest=await promptFingerprint(prompt),datasetDigest=await promptFingerprint(EvaluationContract.canonical({protocolVersion:'1.0.0',category:modality,promptDigest,referenceDigest:expected?await promptFingerprint(EvaluationContract.normalizedAnswer(expected)):null,media:media.descriptor,frameDigests:media.frameDigests??[]}));
  var task='media-'+datasetDigest.slice(0,16);
  switchTab('results');resetCampaignResults();
  for(var rep=1;rep<=repetitions;rep++){
   if(controller.signal.aborted)break;if(mediaStatus)mediaStatus.textContent='Test '+rep+' / '+repetitions+' en cours…';var result=await executePreparedMediaTest({model,runner,prompt,expected,media,task,datasetDigest,promptDigest,temperature,maxTokens},rep,controller.signal);var error=result.error,mediaOutcome=result.mediaOutcome;
   results.push(result);state.results.unshift(result);renderResultCard(result);if((await saveSessionToHistory({id:sessionId,savedAt,model,runner,results,env:JSON.parse(JSON.stringify(state.env)),repetitions,warmupRuns:0}))===false){state.unsavedSession={id:sessionId,savedAt,model,runner,results,env:JSON.parse(JSON.stringify(state.env)),repetitions,warmupRuns:0};throw Error('Sauvegarde SQLite interrompue. Les résultats restent disponibles pour réessayer.')}document.getElementById('exportBtn').disabled=false;if(error)throw Error(error);if(mediaOutcome==='reference-mismatch'||mediaOutcome==='truncated'){stoppedReason=mediaOutcome==='reference-mismatch'?'Benchmark arrêté : réponse différente de la référence (score 0/100).':'Benchmark arrêté : réponse tronquée.';break;}
  }
  if(stoppedReason)showToast(stoppedReason,'error');else showToast('Test multimodal terminé. Les médias ne sont pas inclus dans l’export communautaire.','success');
 }catch(e){stoppedReason=e.message;showToast(e.message,'error')}finally{if(mediaStatus)mediaStatus.textContent=controller.signal.aborted?'Test interrompu.':stoppedReason||results.length+' résultat(s) conservé(s).';currentAbortController=null;state.isRunning=false;lockCampaignControls(false);document.getElementById('mediaControls').disabled=false;document.getElementById('mediaStop').disabled=true;if(document.getElementById('mediaSource'))updateMediaPreset();renderStatistics()}
}
function stopMultimodalBenchmark(){currentAbortController?.abort()}

async function executePreparedMediaTest(config,rep,externalSignal){
 var {model,runner,prompt,expected,media,task,datasetDigest,promptDigest,temperature,maxTokens,protocolVersion}=config;
 var controller={signal:externalSignal},modality=media.descriptor.modality;
 var startedAt=new Date().toISOString(),start=performance.now(),answer=null,error=null,mediaOutcome='completed';var requestController=new AbortController(),cancelRequest=()=>requestController.abort();if(controller.signal.aborted)cancelRequest();else controller.signal.addEventListener('abort',cancelRequest,{once:true});var requestTimer=setTimeout(cancelRequest,180000);
   try{var request=multimodalRequest(runner,model,prompt,media,temperature,maxTokens,state.apiKeys||{});var response=await fetchWithTimeout(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body),signal:requestController.signal},180000);if(!response.ok)throw Error('Le runner a refusé le test multimodal (HTTP '+response.status+'). Vérifier le modèle et son support du média.');answer=multimodalResponse(await response.json(),request.format);if(declaredMediaRefusal(answer.text,expected))throw unsupportedMedia('Le modèle déclare ne pas pouvoir interpréter ce média.')}catch(e){mediaOutcome=e.code==='MEDIA_UNSUPPORTED'?(answer?'model-refusal':'adapter-unsupported'):'failed';error=controller.signal.aborted?'Test interrompu.':requestController.signal.aborted?'Temps maximal du test atteint (3 minutes).':e.message}finally{clearTimeout(requestTimer);controller.signal.removeEventListener('abort',cancelRequest)}
   var elapsed=performance.now()-start,finishedAt=new Date().toISOString(),completion=answer?classifyCompletion(answer.reason,answer.output,maxTokens,answer.output===null?'estimated':'declared'):{state:'unknown',reason:null,limitReached:false};
   var assessment=expected?EvaluationContract.assessment({category:modality,protocolId:'media-exact-answer',protocolVersion:'1.0.0',taskId:task,datasetDigest,evaluatorId:'unicode-exact-answer',evaluatorVersion:'1.0.0',status:!error&&!completion.limitReached?'assessed':'incomplete',criteria:[{id:'reference-answer',passed:!!answer&&EvaluationContract.normalizedAnswer(answer.text)===EvaluationContract.normalizedAnswer(expected)}]}):undefined;
   if(completion.limitReached&&!error)mediaOutcome='truncated';else if(assessment?.status==='assessed'&&assessment.score.value===0)mediaOutcome='reference-mismatch';
   var result={mediaOutcome,id:crypto.randomUUID(),kind:'multimodal',multimodal:media.descriptor,evaluation:assessment,model,modelMetadata:state.modelMetadata,runner:RUNNERS[runner].name,runnerVersion:state.runnerVersion||null,provenance:captureTestProvenance(model),executionOutcome:error?controller.signal.aborted?'interrupted':'failed':'completed',timestamp:finishedAt,startedAt,finishedAt,phase:'measurement',rep,promptType:modality,promptTypeName:({image:'Image',video:'Vidéo',audio:'Audio'})[modality],promptEmoji:'🎞️',promptText:prompt,response:answer?.text||'',error,completion,protocol:{version:protocolVersion||'multimodal-1.0.0',promptDigest,warmupRuns:0,loadState:'unknown',cacheState:'unknown'},metrics:{totalTokens:answer?.output??null,tokenCountKind:answer?.output==null?'estimated':'declared',tokenCountSource:'provider:multimodal-output-usage',totalTime:Math.round(elapsed),tokensPerSec:null,generationTokensPerSec:null,generationTimeMs:null,ttft:null,temperature,maxTokens,contextMode:'auto',contextRequestedTokens:null,contextObservedTokens:null,inputTokens:answer?.input??null},env:JSON.parse(JSON.stringify(state.env))};

 return result;
}

function selectedMediaTypes(){return ['image','video','audio'].filter(id=>document.getElementById('media-'+id)?.checked===true).map(id=>({id:'media-'+id,kind:'multimodal',modality:id,name:({image:'Image',video:'Vidéo',audio:'Audio'})[id],emoji:({image:'🖼️',video:'🎞️',audio:'🎙️'})[id],prompt:''}));}
function mediaCampaignPreflight(){
 if(!selectedMediaTypes().length)return true;
 if(typeof controlledEnabled==='function'&&controlledEnabled()){showToast('Désactivez la comparaison de contextes pour inclure les médias.','error');return false;}
 if(mediaRemote(state.runner,getSelectedModel())&&!document.getElementById('mediaConsent')?.checked){showToast('Confirmez l’envoi des médias au runner distant choisi.','error');return false;}
 return true;
}
async function executeCampaignMediaTest(model,type,rep,signal){
 if(mediaRemote(state.runner,model)&&!document.getElementById('mediaConsent')?.checked)throw Error('Envoi distant des médias non autorisé.');
 if(!type.mediaPrepared){
  var c=await fixedMediaCase(type.modality,signal,true),file=await loadFixedMedia(c,signal),media=await prepareMultimodal(file,type.modality,c.representation,signal),promptDigest=await promptFingerprint(''),maxTokens=getMaxTokens();
  if(!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>32768)throw Error('Budget de sortie invalide.');
  var datasetDigest=await promptFingerprint(EvaluationContract.canonical({protocolVersion:'media-input-only-1.0.0',category:type.modality,promptDigest,referenceDigest:c.expected?await promptFingerprint(EvaluationContract.normalizedAnswer(c.expected)):null,media:media.descriptor,frameDigests:media.frameDigests??[]}));
  type.mediaPrepared={model,runner:state.runner,prompt:'',expected:c.expected,media,task:'media-'+datasetDigest.slice(0,16),datasetDigest,promptDigest,temperature:0,maxTokens,protocolVersion:'media-input-only-1.0.0'};
 }
 var status=document.getElementById('mediaStatus');if(status)status.textContent=type.name+' · '+rep+' / '+getRepetitions();
 return executePreparedMediaTest(type.mediaPrepared,rep,signal);
}
function mediaMustStop(result){return result.kind==='multimodal'&&(!!result.error||result.completion?.limitReached||result.mediaOutcome==='reference-mismatch');}
function mediaStopMessage(result){return result.error||(result.completion?.limitReached?'Réponse média tronquée.':'Réponse média différente de la référence (0/100).');}
