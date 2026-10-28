/* Deterministic measurements. No generated observation may bypass this module. */
export const VERSION = 'bh-events-1.0.0';
export const noteName = n => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][Math.round(n)%12] + (Math.floor(n/12)-1);
export function validateEvents(events) {
 if (!Array.isArray(events) || !events.length || events.length>1000) throw Error('Use a phrase containing 1–1,000 note events.');
 return events.map(e=>{if(!Number.isFinite(e.start)||e.start<0||!Number.isFinite(e.end)||e.end<=e.start||e.end>600||!Number.isInteger(e.pitch)||e.pitch<0||e.pitch>127)throw Error('Invalid note event: start/end must be seconds (0–600), with MIDI pitch 0–127.');return {...e,confidence:Number.isFinite(e.confidence)?Math.max(0,Math.min(1,e.confidence)):1};}).sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
export function parseMidi(buffer) {
 const v=new DataView(buffer);let p=0; const need=n=>{if(p+n>v.byteLength)throw Error('Truncated MIDI file.');};
 const u8=()=>{need(1);return v.getUint8(p++);};const u16=()=>{need(2);const x=v.getUint16(p);p+=2;return x;};const u32=()=>{need(4);const x=v.getUint32(p);p+=4;return x;};const str=n=>Array.from({length:n},()=>String.fromCharCode(u8())).join('');
 const vlq=()=>{let x=0;for(let i=0;i<4;i++){const b=u8();x=(x<<7)|(b&127);if(!(b&128))return x;}throw Error('Invalid MIDI variable-length integer.');};
 if(str(4)!=='MThd')throw Error('Not a Standard MIDI file.');const h=u32();if(h<6)throw Error('Invalid MIDI header.');const format=u16(), tracks=u16(), division=u16();if(format>1||division&0x8000||!division)throw Error('Only synchronous MIDI formats 0/1 with beat-based time are supported.');need(h-6);p+=h-6;
 const tempos=[{tick:0,us:500000}],raw=[];
 for(let tr=0;tr<tracks;tr++){if(str(4)!=='MTrk')throw Error('Invalid MIDI track.');const len=u32(),end=p+len;need(len);let tick=0,running=0;const active=new Map();
 while(p<end){tick+=vlq();let b=u8();if(b<128){if(!running)throw Error('Invalid running status.');p--;b=running;}else if(b<240)running=b;
 if(b===255){const type=u8(),n=vlq();need(n);if(type===81&&n===3){const us=(u8()<<16)|(u8()<<8)|u8();if(!us)throw Error('Invalid MIDI tempo.');tempos.push({tick,us});}else p+=n;}
 else if(b===240||b===247){const n=vlq();need(n);p+=n;running=0;}
 else {const kind=b>>4,ch=b&15;if(kind<8||kind>14)throw Error('Unsupported MIDI event.');const a=u8(),c=(kind===12||kind===13)?0:u8();if(a>127||c>127)throw Error('Invalid MIDI data.');const key=`${ch}:${a}`;
 if(kind===9&&c>0&&ch!==9){const q=active.get(key)||[];q.push({tick,pitch:a,velocity:c,channel:ch});active.set(key,q);}else if((kind===8||(kind===9&&c===0))&&active.has(key)){const e=active.get(key).shift();if(e&&tick>e.tick)raw.push({...e,endTick:tick});if(!active.get(key).length)active.delete(key);}}
 if(p>end)throw Error('MIDI event exceeds track boundary.');}
 }
 tempos.sort((a,b)=>a.tick-b.tick);const seconds=t=>{let last=0,us=500000,s=0;for(const e of tempos){if(e.tick>t)break;s+=(e.tick-last)*us/division/1e6;last=e.tick;us=e.us;}return s+(t-last)*us/division/1e6;};
 return validateEvents(raw.map(e=>({pitch:e.pitch,start:seconds(e.tick),end:seconds(e.endTick),confidence:1})));
}
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:1;};
export function compare(reference,attempt,rubric={}) {
 const a=validateEvents(reference),b=validateEvents(attempt),tolerance=Number(rubric.timingTolerance??0.12),allowSlower=rubric.allowSlower!==false;
 const exact=rubric.precise===true,status=exact?'confirmed':'possible';
 // Coarse duration normalization is for matching only. Timing uses original onsets below.
 const da=Math.max(.1,a.at(-1).start-a[0].start),db=Math.max(.1,b.at(-1).start-b[0].start),n=a.length,m=b.length;
 const dp=Array.from({length:n+1},()=>new Float64Array(m+1));const route=Array.from({length:n+1},()=>new Uint8Array(m+1));
 for(let i=1;i<=n;i++){dp[i][0]=i*.85;route[i][0]=1;}for(let j=1;j<=m;j++){dp[0][j]=j*.85;route[0][j]=2;}
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const pitch=a[i-1].pitch===b[j-1].pitch?0:.95;const position=Math.min(.55,Math.abs((a[i-1].start-a[0].start)/da-(b[j-1].start-b[0].start)/db)*.6);const opts=[dp[i-1][j-1]+pitch+position,dp[i-1][j]+.85,dp[i][j-1]+.85];const k=opts.indexOf(Math.min(...opts));dp[i][j]=opts[k];route[i][j]=k;}
 let i=n,j=m;const path=[];while(i||j){const k=route[i][j];if(k===0){path.push({a:--i,b:--j});}else if(k===1)path.push({a:--i,b:null});else path.push({a:null,b:--j});}path.reverse();
 const pairs=path.filter(x=>x.a!==null&&x.b!==null);const ratios=[];for(let k=1;k<pairs.length;k++){const p=pairs[k-1],q=pairs[k],x=a[q.a].start-a[p.a].start,y=b[q.b].start-b[p.b].start;if(x>.08&&y>.08)ratios.push(y/x);}const tempoScale=allowSlower?Math.max(.25,Math.min(4,median(ratios))):1;
 const findings=[];const add=(category,p,observation,action,delta=null)=>{const re=p.a===null?null:a[p.a],le=p.b===null?null:b[p.b];findings.push({id:`f${findings.length+1}`,category,status,reference:re?[re.start,re.end]:null,learner:le?[le.start,le.end]:null,observation,action,delta,evidence:exact?'Direct MIDI note events':'Estimated audio note events',method:VERSION,scoringEligible:exact,review:'pending'});};
 let wrong=0,timing=0;for(const p of path){if(p.a===null){wrong++;add('Extra note',p,`An additional ${noteName(b[p.b].pitch)} event appears in the learner recording.`,`Replay this moment and check whether the extra note is intended.`);}else if(p.b===null){wrong++;add('Missing note',p,`No corresponding learner event was matched to the expert’s ${noteName(a[p.a].pitch)}.`,`Replay the reference note, then practice the surrounding two-note transition slowly.`);}else if(a[p.a].pitch!==b[p.b].pitch){wrong++;add('Pitch',p,`The reference has ${noteName(a[p.a].pitch)}; the learner event is ${noteName(b[p.b].pitch)}.`,`Listen to the two notes separately, then repeat this short phrase. Finger placement cannot be inferred from audio.`);}}
 for(let k=1;k<pairs.length;k++){const p=pairs[k-1],q=pairs[k];const refGap=a[q.a].start-a[p.a].start;if(refGap<.06||q.a!==p.a+1||q.b!==p.b+1)continue;const gap=b[q.b].start-b[p.b].start,delta=gap-refGap*tempoScale;if(Math.abs(delta)>tolerance){timing++;add('Timing',q,`The interval before this event is ${Math.round(Math.abs(delta)*1000)} ms ${delta>0?'longer':'shorter'} than the reference${allowSlower?' after allowing for overall tempo':''}.`,`Loop this transition. Count evenly and repeat at a comfortable pace before increasing speed.`,delta);}}
 const notes=Math.max(0,100*(1-wrong/Math.max(n,m))),rhythm=Math.max(0,100*(1-timing/Math.max(1,pairs.length-1)));
 const assessRhythm=pairs.length>=3;const score=exact?Math.round(assessRhythm?(notes*.35+rhythm*.30)/.65:notes):null;
 return {version:VERSION,findings,alignment:pairs.map(p=>({reference:a[p.a].start,learner:b[p.b].start})),score,dimensions:{notes:exact?Math.round(notes):null,rhythm:exact&&assessRhythm?Math.round(rhythm):null,tone:null,technique:null},tempoScale,referenceCount:n,learnerCount:m,limitations:[...(!exact?['Audio pitch estimates are unvalidated. Review possible findings; no automatic score is assigned.']:[]),'Tone, physical cause and technique are not automatically assessed.','Alignment is experimental; review matched excerpts before relying on a finding.'],rubric:{timingTolerance:tolerance,allowSlower}};
}
export function demoEvents(kind='difference') {
 const ref=[60,62,64,65,67,65,64,60].map((pitch,i)=>({pitch,start:.4+i*.6,end:.85+i*.6,confidence:1}));const attempt=ref.map(e=>({...e,start:.5+(e.start-.4)*1.15,end:.5+(e.end-.4)*1.15}));if(kind==='difference'){attempt[3].pitch=66;attempt[5].start+=.24;attempt[5].end+=.24;}return {reference:ref,learner:attempt};
}
export function analyzeSamples(samples,sampleRate) {
 // Autocorrelation, clean monophonic phrases only. Never assert finger position.
 const hop=Math.round(sampleRate*.025),size=2048,events=[];let active=null,voiced=0,total=0,clipped=0,energy=0;
 for(const x of samples){if(Math.abs(x)>.995)clipped++;energy+=x*x;}
 for(let start=0;start+size<samples.length;start+=hop){let rms=0;for(let k=0;k<size;k++)rms+=samples[start+k]**2;rms=Math.sqrt(rms/size);total++;let pitch=null,quality=0;
 if(rms>.012){let best=0,lagBest=0;const min=Math.floor(sampleRate/1100),max=Math.min(Math.floor(sampleRate/70),size/2);const correlations=[];
 for(let lag=min;lag<=max;lag++){let c=0,e1=0,e2=0;for(let k=0;k<size-max;k+=2){const x=samples[start+k],y=samples[start+k+lag];c+=x*y;e1+=x*x;e2+=y*y;}correlations[lag]=c/Math.sqrt(e1*e2||1);}
 for(let lag=min+1;lag<max;lag++)if(correlations[lag]>correlations[lag-1]&&correlations[lag]>=correlations[lag+1]&&correlations[lag]>.86){best=correlations[lag];lagBest=lag;break;}
 if(lagBest){quality=best;pitch=Math.round(69+12*Math.log2(sampleRate/lagBest/440));voiced++;}}
 const time=start/sampleRate;if(pitch!==null&&active&&active.pitch===pitch){active.end=time+hop/sampleRate;active.confidence=Math.min(active.confidence,quality);}else{if(active&&active.end-active.start>.10)events.push(active);active=pitch===null?null:{pitch,start:time,end:time+hop/sampleRate,confidence:quality};}}
 if(active&&active.end-active.start>.10)events.push(active);
 const warnings=[];if(clipped/samples.length>.005)warnings.push('Audio clipping detected. Record again at a lower level.');if(Math.sqrt(energy/samples.length)<.008)warnings.push('Recording is too quiet.');if(voiced/Math.max(total,1)<.15)warnings.push('Insufficient stable pitch. Use a clean single-note phrase or MIDI.');
 return {events,coverage:voiced/Math.max(total,1),warnings,method:'autocorrelation-1.0',duration:samples.length/sampleRate};
}
export function reportText(result,title='Practice session') {
 const f=result.findings.filter(x=>x.review!=='dismissed');return `MIMORA — DETAILED PRACTICE REPORT\n${title}\nCreated: ${new Date().toISOString()}\nMethod: ${result.version}\n\n${result.score===null?'Score withheld: estimated or insufficient evidence.':`Assessed score: ${result.score}/100 (notes and eligible rhythm only).`}\nNote events: expert ${result.referenceCount}, learner ${result.learnerCount}\nTiming tolerance: ${result.rubric?.timingTolerance??'n/a'} seconds\nAllow overall tempo variation: ${result.rubric?.allowSlower??'n/a'}\n\n${f.length?f.map((x,i)=>`${i+1}. ${x.category} [${x.status}; review: ${x.review}]\nReference: ${x.reference?.map(n=>n.toFixed(2)).join('–')??'not matched'} s\nLearner: ${x.learner?.map(n=>n.toFixed(2)).join('–')??'not matched'} s\nObservation: ${x.observation}\nEvidence: ${x.evidence}; ${x.method}\nPractice: ${x.action}\n`).join('\n'):'No significant differences detected in assessed dimensions. This is not a claim of complete correctness.'}\n\nNOT ASSESSED / LIMITATIONS\n${result.limitations.join('\n')}\n\nRejected findings retained for audit:\n${result.findings.filter(x=>x.review==='dismissed').map(x=>`${x.id}: ${x.observation}`).join('\n')||'None'}\n`;
}
