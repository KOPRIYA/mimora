import {cloudConfig} from './config.js';
import {normalizeProfile} from './experience.js';
let client;
export function validCloudConfig(config=cloudConfig) {
 try {const url=new URL(config.supabaseUrl);const key=config.supabasePublishableKey||'';if(url.protocol!=='https:'||!key||key.startsWith('sb_secret_'))return false;if(key.startsWith('sb_publishable_'))return true;const payload=JSON.parse(atob(key.split('.')[1]));return payload.role==='anon';} catch{return false;}
}
export const cloudEnabled=validCloudConfig();
export async function connectCloud(){
 if(!cloudEnabled)return null;
 if(!client){const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');client=createClient(cloudConfig.supabaseUrl,cloudConfig.supabasePublishableKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,storageKey:'mimora-auth-v2'}});}
 return client;
}
async function identity(){const c=await connectCloud();if(!c)throw Error('Cloud sign-in has not been connected yet.');const {data,error}=await c.auth.getUser();if(error||!data.user)throw Error('Please sign in again.');return {c,id:data.user.id};}
const checked=({data,error})=>{if(error)throw Error(error.message);return data;};
export async function sendSignIn(email){const c=await connectCloud();if(!c)throw Error('Cloud sign-in has not been connected yet.');checked(await c.auth.signInWithOtp({email,options:{emailRedirectTo:new URL('./',location.href).href}}));}
export async function signOut(){const c=await connectCloud();if(c)checked(await c.auth.signOut());}
export async function loadProfile(){const {c,id}=await identity();const row=checked(await c.from('mimora_profiles').select('profile').eq('user_id',id).maybeSingle());return row?normalizeProfile(row.profile):null;}
export async function saveProfile(profile){const {c,id}=await identity();checked(await c.from('mimora_profiles').upsert({user_id:id,profile:normalizeProfile(profile),updated_at:new Date().toISOString()}));}
export async function loadSessions(){const {c,id}=await identity();return (checked(await c.from('mimora_sessions').select('id,payload,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30))||[]).map(x=>({...x.payload,id:x.id,date:x.created_at}));}
export async function saveSession(session){const {c,id}=await identity();checked(await c.from('mimora_sessions').insert({id:session.id,user_id:id,payload:session}));}
export async function deleteSession(id){const {c,id:userId}=await identity();checked(await c.from('mimora_sessions').delete().eq('user_id',userId).eq('id',id));}
export async function clearSessions(){const {c,id}=await identity();checked(await c.from('mimora_sessions').delete().eq('user_id',id));}
