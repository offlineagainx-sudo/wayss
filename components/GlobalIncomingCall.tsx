'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {getCallIceServers} from '@/lib/call-ice';
import {Phone,Video,VideoOff,SwitchCamera,Mic,MicOff,X} from 'lucide-react';

type Signal={id:string;conversation_id:string;call_id:string;sender_id:string;recipient_id:string;signal_type:'offer'|'answer'|'ice'|'reject'|'end';mode:'audio'|'video';payload:any};
type Person={id:string;username:string;display_name:string|null;avatar_url:string|null};
const db=supabase();
export default function GlobalIncomingCall(){
 const pathname=usePathname(),[incoming,setIncoming]=useState<Signal|null>(null),[localFacing,setLocalFacing]=useState<'user'|'environment'>('user'),[elapsed,setElapsed]=useState(0),[person,setPerson]=useState<Person|null>(null),[status,setStatus]=useState<'idle'|'incoming'|'connecting'|'active'>('idle'),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[error,setError]=useState('');
 const connectedAt=useRef<number|null>(null),pc=useRef<RTCPeerConnection|null>(null),local=useRef<MediaStream|null>(null),remote=useRef<MediaStream|null>(null),queued=useRef<RTCIceCandidateInit[]>([]),target=useRef<string|null>(null),callId=useRef<string|null>(null),conversation=useRef<string|null>(null),mode=useRef<'audio'|'video'>('audio'),offer=useRef<RTCSessionDescriptionInit|null>(null),earlyIce=useRef<Map<string,RTCIceCandidateInit[]>>(new Map()),localVideo=useRef<HTMLVideoElement>(null),remoteVideo=useRef<HTMLVideoElement>(null),remoteAudio=useRef<HTMLAudioElement>(null);
 async function signal(to:string,type:Signal['signal_type'],payload:any=null){if(!conversation.current||!callId.current)return;const {error}=await db.from('call_signals').insert({conversation_id:conversation.current,call_id:callId.current,sender_id:(await db.auth.getUser()).data.user?.id,recipient_id:to,signal_type:type,mode:mode.current,payload});if(error)throw error;}
 function cleanup(){pc.current?.close();pc.current=null;connectedAt.current=null;setElapsed(0);local.current?.getTracks().forEach(t=>t.stop());local.current=null;remote.current=null;queued.current=[];target.current=null;callId.current=null;conversation.current=null;offer.current=null;setIncoming(null);setPerson(null);setStatus('idle');setMuted(false);setCameraOff(false);}
 async function accept(){if(!incoming||!target.current||!callId.current)return;try{setError('');setStatus('connecting');const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode.current==='video'?{facingMode:{ideal:'user'}}:false});local.current=stream;setLocalFacing('user');if(localVideo.current){localVideo.current.srcObject=stream;void localVideo.current.play().catch(()=>{});}const dynamicIce=await getCallIceServers();const connection=new RTCPeerConnection({iceServers:dynamicIce.length?dynamicIce:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:4});pc.current=connection;stream.getTracks().forEach(t=>connection.addTrack(t,stream));connection.ontrack=e=>{remote.current=e.streams[0]||new MediaStream([e.track]);if(remoteVideo.current)remoteVideo.current.srcObject=remote.current;if(remoteAudio.current){remoteAudio.current.srcObject=remote.current;void remoteAudio.current.play().catch(()=>{});}if(remoteVideo.current)void remoteVideo.current.play().catch(()=>{});};connection.onicecandidate=e=>{if(e.candidate&&target.current)void signal(target.current,'ice',{candidate:e.candidate.toJSON()}).catch(()=>setError('Network signalling interrupted.'));};connection.onconnectionstatechange=()=>{if(connection.connectionState==='connected'){setStatus('active');if(connectedAt.current===null)connectedAt.current=Date.now();}if(connection.connectionState==='failed')setError('Could not connect. Check network or TURN relay configuration.');};if(!offer.current)throw new Error('This call has expired.');await connection.setRemoteDescription(offer.current);for(const candidate of queued.current.splice(0)){try{await connection.addIceCandidate(candidate);}catch{}}const answer=await connection.createAnswer();await connection.setLocalDescription(answer);await signal(target.current,'answer',{sdp:answer});setIncoming(null);}catch(e:any){setError(e?.message||'Could not join the call. Check microphone and camera permissions.');setStatus('incoming');}}
 async function decline(){try{if(target.current)await signal(target.current,'reject');const user=(await db.auth.getUser()).data.user;if(user&&conversation.current)await db.from('messages').insert({conversation_id:conversation.current,sender_id:user.id,body:'Missed '+(mode.current==='video'?'video call':'voice call'),message_type:'text',media_type:null,media_url:null});}catch(e){console.warn('Missed call history could not be saved',e);}cleanup();}
 async function end(){const duration=connectedAt.current===null?0:Math.max(0,Math.floor((Date.now()-connectedAt.current)/1000));try{if(target.current)await signal(target.current,'end');if(conversation.current){const user=(await db.auth.getUser()).data.user;if(user)await db.from('messages').insert({conversation_id:conversation.current,sender_id:user.id,body:(mode.current==='video'?'Video call':'Voice call')+` · ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')} · Ended`,message_type:'text',media_type:null,media_url:null});}}catch(e){console.warn('Call history could not be saved',e);}cleanup();}
 async function flipCamera(){const stream=local.current,oldTrack=stream?.getVideoTracks()[0],connection=pc.current;if(!stream||!oldTrack)return;const next=localFacing==='user'?'environment':'user';try{const fresh=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:next}},audio:false});const newTrack=fresh.getVideoTracks()[0];if(!newTrack)throw new Error('Camera unavailable');const sender=connection?.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(newTrack);stream.removeTrack(oldTrack);stream.addTrack(newTrack);oldTrack.stop();fresh.getTracks().filter(t=>t!==newTrack).forEach(t=>t.stop());setLocalFacing(next);if(localVideo.current){localVideo.current.srcObject=stream;void localVideo.current.play().catch(()=>{});}}catch(e:any){setError(e?.message||'This device could not switch cameras.');}}
 useEffect(()=>{
  if(!db||!pathname)return;
  let alive=true;
  let remove:(()=>void)|undefined;
  const setup=async()=>{
   const {data:{user}}=await db.auth.getUser();
   if(!user||!alive)return;
   const handleSignal=async(row:Signal)=>{
    if(!alive)return;
    if(row.signal_type==='end'||row.signal_type==='reject'){
     if(row.call_id===callId.current)cleanup();
     void db.from('call_signals').delete().eq('id',row.id);
     return;
    }
    if(row.signal_type==='ice'){
     if(row.payload?.candidate){
      const candidate=row.payload.candidate as RTCIceCandidateInit;
      if(row.call_id===callId.current){
       if(pc.current?.remoteDescription){try{await pc.current.addIceCandidate(candidate);}catch{}}
       else queued.current.push(candidate);
      }else{
       const list=earlyIce.current.get(row.call_id)||[];
       if(list.length<64)list.push(candidate);
       earlyIce.current.set(row.call_id,list);
      }
     }
     void db.from('call_signals').delete().eq('id',row.id);
     return;
    }
    if(row.signal_type!=='offer')return;
    if(callId.current===row.call_id){void db.from('call_signals').delete().eq('id',row.id);return;}
    if(callId.current){
     try{await db.from('call_signals').insert({conversation_id:row.conversation_id,call_id:row.call_id,sender_id:user.id,recipient_id:row.sender_id,signal_type:'reject',mode:row.mode,payload:null});}catch{}
     return;
    }
    target.current=row.sender_id;
    callId.current=row.call_id;
    conversation.current=row.conversation_id;
    mode.current=row.mode;
    offer.current=row.payload?.sdp||null;
    queued.current=earlyIce.current.get(row.call_id)||[];
    earlyIce.current.delete(row.call_id);
    setIncoming(row);
    setStatus('incoming');
    const {data:p}=await db.from('profiles').select('id,username,display_name,avatar_url').eq('id',row.sender_id).maybeSingle();
    if(alive)setPerson(p||{id:row.sender_id,username:'WAYSS member',display_name:null,avatar_url:null});
    void db.from('call_signals').delete().eq('id',row.id);
   };
   const channel=db.channel('wayss-global-calls:'+user.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'call_signals',filter:'recipient_id=eq.'+user.id},({new:raw}:any)=>{void handleSignal(raw as Signal);})
    .subscribe(async(state:string)=>{
     if(state!=='SUBSCRIBED'||!alive||callId.current)return;
     const cutoff=new Date(Date.now()-45000).toISOString();
     const {data:pending}=await db.from('call_signals').select('*').eq('recipient_id',user.id).eq('signal_type','offer').gt('created_at',cutoff).order('created_at',{ascending:false}).limit(1);
     if(alive&&pending?.[0])await handleSignal(pending[0] as Signal);
    });
   return()=>{void db.removeChannel(channel);};
  };
  void setup().then(fn=>{remove=fn;});
  return()=>{alive=false;remove?.();};
 },[pathname]);
 useEffect(()=>{if(status!=='active'||connectedAt.current===null)return;const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-connectedAt.current!)/1000)),1000);return()=>window.clearInterval(timer);},[status]);
 useEffect(()=>{if(status!=='active')return;if(remoteVideo.current&&remote.current){remoteVideo.current.srcObject=remote.current;void remoteVideo.current.play().catch(()=>{});}if(remoteAudio.current&&remote.current){remoteAudio.current.srcObject=remote.current;void remoteAudio.current.play().catch(()=>{});}},[status]);
 if(status==='idle')return null;
 return <div className="wayss-call-overlay"><section className="wayss-call-card"><div className="wayss-call-brand">WAYSS</div><div className="wayss-call-top">{person?.avatar_url?<img className="wayss-global-call-avatar" src={person.avatar_url} alt=""/>:<div className="wayss-global-call-avatar">{(person?.username||'W').slice(0,1).toUpperCase()}</div>}<h3>{person?.display_name||person?.username||'WAYSS user'}</h3><p>{status==='incoming'?'Incoming '+mode.current+' call':status==='connecting'?'Connecting…':`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`}</p></div>{mode.current==='video'&&status!=='incoming'&&<div className={'wayss-call-video '+(status==='active'?'is-connected':'is-ringing')}><video ref={remoteVideo} autoPlay muted playsInline/><video ref={localVideo} autoPlay muted playsInline style={{transform:localFacing==='user'?'scaleX(-1)':'none'}}/><audio ref={remoteAudio} autoPlay/></div>}{mode.current==='audio'&&<audio ref={remoteAudio} autoPlay/>}{error&&<p className="wayss-call-error">{error}</p>}<div className="wayss-call-actions">{status==='incoming'?<><button className="wayss-call-accept" onClick={()=>void accept()}>{mode.current==='video'?<Video/>:<Phone/>} Accept</button><button className="wayss-call-end" onClick={()=>void decline()}><X/> Decline</button></>:<>{mode.current==='video'&&<button className="wayss-call-tool" onClick={()=>void flipCamera()} title="Switch front/back camera"><SwitchCamera/></button>}<button className="wayss-call-tool" onClick={()=>{local.current?.getAudioTracks().forEach(t=>t.enabled=muted);setMuted(v=>!v)}}>{muted?<MicOff/>:<Mic/>}</button>{mode.current==='video'&&<button className="wayss-call-tool" onClick={()=>{local.current?.getVideoTracks().forEach(t=>t.enabled=cameraOff);setCameraOff(v=>!v)}}>{cameraOff?<VideoOff/>:<Video/>}</button>}<button className="wayss-call-end" onClick={()=>void end()}><Phone/> End</button></>}</div><small>Calls require microphone/camera permission. Some networks require a TURN relay for reliable connections.</small></section></div>;
}
