import {supabase} from '@/lib/supabase';

const FALLBACK_ICE:RTCIceServer[]=[
  {urls:'stun:stun.cloudflare.com:3478'},
  {urls:'stun:stun.l.google.com:19302'}
];

export async function getCallIceServers():Promise<RTCIceServer[]>{
  try{
    const client=supabase();
    if(!client)return FALLBACK_ICE;
    const {data}=await client.auth.getSession();
    const token=data.session?.access_token;
    if(!token)return FALLBACK_ICE;
    const response=await fetch('/api/calls/ice-servers',{
      method:'GET',
      headers:{Authorization:'Bearer '+token},
      cache:'no-store'
    });
    if(!response.ok)return FALLBACK_ICE;
    const payload=await response.json();
    return Array.isArray(payload.iceServers)&&payload.iceServers.length
      ? [...FALLBACK_ICE,...payload.iceServers]
      : FALLBACK_ICE;
  }catch{return FALLBACK_ICE;}
}
