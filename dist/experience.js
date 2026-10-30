export const DOMAINS = {
 general: {name:'Explore a skill',icon:'◎',title:'Your next chapter starts here.',subtitle:'Bring something you want to learn. We’ll shape the practice space around it.',action:'Open guided comparison',reference:'Expert demonstration',learner:'Your practice',categories:['Sequence','Clarity','Technique','Other'],focus:['Observe the expert’s intention','Choose one detail to practice','Review your next attempt'],empty:'Add a recording to shape your workspace',limit:'Choose a skill to see relevant practice tools. Music supports note comparison; English speech supports experimental sound-level feedback.'},
 music: {name:'Music & rhythm',icon:'♫',title:'Find your rhythm. Refine your sound.',subtitle:'Compare notes and timing, then return to the moments that matter.',action:'Compare performances',reference:'Expert performance',learner:'Your performance',categories:['Pitch','Timing','Articulation','Technique'],focus:['Listen to the reference phrase','Isolate a note or transition','Repeat at a comfortable tempo'],empty:'Add MIDI, audio, or a performance video',limit:'Direct MIDI supports measured notes and timing. Audio estimates need review. Tone and physical technique are not automatically scored.'},
 language: {name:'Language & pronunciation',icon:'Aa',title:'Make every phrase your own.',subtitle:'Listen closely, compare your delivery, and practice one phrase at a time.',action:'Compare recordings',reference:'Reference speaker',learner:'Your speaking attempt',categories:['Pronunciation','Pacing','Pauses','Intonation'],focus:['Listen to the target phrase','Notice pauses and emphasis','Repeat and review your delivery'],empty:'Add a spoken phrase or conversation clip',limit:'Select matching English excerpts for experimental sound-level comparison, timestamped feedback and expert replay. Possible differences require listening review; no automatic pronunciation grade is produced.'},
 craft: {name:'Craft & practical skills',icon:'◇',title:'Learn the details behind the craft.',subtitle:'Follow the expert’s steps, inspect a movement, and build your own understanding.',action:'Open step-by-step review',reference:'Expert process',learner:'Your process',categories:['Step order','Object orientation','Hand movement','Technique'],focus:['Break the demonstration into steps','Slow down a difficult movement','Check each step against the reference'],empty:'Add a close-up video of the process',limit:'Step order, contact, pressure and object orientation are reviewed by a person. Video tools and optional hand landmarks do not prove that a technique is wrong.'},
 movement: {name:'Movement & performance',icon:'↗',title:'Practice with intention.',subtitle:'Review each movement at your pace, with the expert’s example beside you.',action:'Review movement',reference:'Reference movement',learner:'Your movement',categories:['Sequence','Coordination','Timing','Position'],focus:['Choose a short movement sequence','Compare at a slower playback speed','Record a focused retry'],empty:'Add a video showing the movement clearly',limit:'Movement observations require human review. This app does not assess physical safety, diagnose injuries, or measure force.'},
 presentation: {name:'Speaking & presentation',icon:'◖))',title:'Build confidence in your delivery.',subtitle:'Compare pacing, structure and presence while developing your own voice.',action:'Compare delivery',reference:'Reference presentation',learner:'Your presentation',categories:['Pacing','Structure','Clarity','Presence'],focus:['Define the point you want to communicate','Review pace and pauses','Record the same passage again'],empty:'Add an audio or video presentation',limit:'Duration and sound/pause measurements are descriptive. Content quality, confidence, body language and delivery need human review.'}
};
export const defaultProfile = () => ({displayName:'',domain:'general',level:'beginner',goal:'',language:'English',feedback:'both'});
export function normalizeProfile(value={}) {
 const clean=(x,max)=>typeof x==='string'?x.trim().slice(0,max):'';
 return {displayName:clean(value.displayName,60),domain:DOMAINS[value.domain]?value.domain:'general',level:['beginner','intermediate','advanced'].includes(value.level)?value.level:'beginner',goal:clean(value.goal,240),language:clean(value.language,60)||'English',feedback:['text','audio','both'].includes(value.feedback)?value.feedback:'both'};
}
export function mediaKind(file) {
 const ext=(file.name||'').split('.').pop().toLowerCase();
 if(['mid','midi'].includes(ext))return 'midi';
 if(ext==='json')return 'events';
 if((file.type||'').startsWith('audio/'))return 'audio';
 if((file.type||'').startsWith('video/')||['mp4','mov','webm','m4v'].includes(ext))return 'video';
 if((file.type||'').startsWith('audio/')||['wav','mp3','m4a','aac','ogg','flac'].includes(ext))return 'audio';
 throw Error('Choose a supported audio/video recording, MIDI, or note-event JSON file.');
}
export function resolveWorkspace(profile,media=[],override=null) {
 const p=normalizeProfile(profile),hasNotes=media.some(x=>['midi','events'].includes(x?.mediaType));
 const domain=DOMAINS[override]?override:hasNotes?'music':p.domain;
 const cfg=DOMAINS[domain],video=media.some(x=>x?.mediaType==='video'),audio=media.some(x=>['audio','video'].includes(x?.mediaType));
 return {...cfg,domain,hasVideo:video,hasAudio:audio,showSteps:['craft','movement','general'].includes(domain),showPhrase:domain==='language',showOutline:domain==='presentation',showMusic:domain==='music',showHands:video&&['craft','movement','music','general'].includes(domain),reason:override?'Workspace chosen for this practice':hasNotes?'Note-event file detected → music workspace':`Based on your ${cfg.name.toLowerCase()} profile`,mediaSummary:media.length?`${media.map(x=>x.mediaType==='events'?'note events':x.mediaType).join(' + ')} · original recordings`:'Add an expert reference and your attempt'};
}
export function audioEnvelope(samples,sampleRate) {
 const bins=160,peaks=[];let clipping=0,energy=0;
 for(let i=0;i<bins;i++){let max=0;const start=Math.floor(i*samples.length/bins),end=Math.floor((i+1)*samples.length/bins);for(let k=start;k<end;k++)max=Math.max(max,Math.abs(samples[k]));peaks.push(max);}
 for(const s of samples){energy+=s*s;if(Math.abs(s)>.995)clipping++;}
 const hop=Math.max(1,Math.round(sampleRate*.02));let quiet=0,frames=0,pauseRun=0,pauses=0;
 for(let at=0;at<samples.length;at+=hop){let sum=0;const end=Math.min(samples.length,at+hop);for(let i=at;i<end;i++)sum+=samples[i]*samples[i];const rms=Math.sqrt(sum/(end-at));frames++;if(rms<.012){quiet++;pauseRun++;}else{if(pauseRun>=10)pauses++;pauseRun=0;}}
 return {waveform:peaks,quietPercent:Math.round(quiet/Math.max(1,frames)*100),pauses,rms:Math.sqrt(energy/Math.max(1,samples.length)),clippingPercent:100*clipping/Math.max(1,samples.length),method:'amplitude-envelope-1.0'};
}
export function manualAssessment(workspace,reference,learner) {
 const measurements=[{label:'Reference duration',value:`${reference.duration.toFixed(1)} s`},{label:'Your duration',value:`${learner.duration.toFixed(1)} s`}];
 if(['language','presentation'].includes(workspace.domain))for(const [label,m] of [['Reference',reference],['Your attempt',learner]])if(m.signal){measurements.push({label:`${label}: quiet audio`,value:`${m.signal.quietPercent}%`},{label:`${label}: pauses ≥200 ms`,value:String(m.signal.pauses)});}
 return {version:'mimora-guided-2.0',domain:workspace.domain,findings:[],score:null,dimensions:{},alignment:[],measurements,referenceCount:0,learnerCount:0,limitations:[workspace.limit,'Observations are supplied by a person and are not automatically verified.',...(['language','presentation'].includes(workspace.domain)?['Quiet intervals are measured from amplitude, not speech recognition. Background noise and recording levels affect these measurements.']:[])],rubric:{}};
}
export function guidedReport(result,title,profile,context={}) {
 const lines=['MIMORA — PRACTICE REPORT',title,`Created: ${new Date().toISOString()}`,`Skill: ${DOMAINS[result.domain]?.name||'General'}`,`Level: ${profile.level}`,`Goal: ${profile.goal||'Not specified'}`,`Method: ${result.version}`,'','No automatic proficiency score is assigned.',...((result.measurements||[]).map(x=>`${x.label}: ${x.value}`))];
 if(context.phrase)lines.push('',`Target phrase: ${context.phrase}`);if(context.outline)lines.push('',`Practice outline: ${context.outline}`);if(context.steps?.length)lines.push('','Learner-defined steps:',...context.steps.map(x=>`${x.done?'[x]':'[ ]'} ${x.text}`));
 lines.push('','OBSERVATIONS');for(const f of result.findings)lines.push(`${f.category} [${f.status}; ${f.review}]`,`Reference: ${f.reference?.[0]?.toFixed(2)??'—'} s; learner: ${f.learner?.[0]?.toFixed(2)??'—'} s`,f.observation,`Practice: ${f.action}`,`Evidence: ${f.evidence}`,'');
 if(!result.findings.length)lines.push('No observations have been added. This does not imply a correct performance.');lines.push('','LIMITATIONS',...result.limitations);return lines.join('\n');
}
