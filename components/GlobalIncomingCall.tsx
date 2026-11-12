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
 const pathname=usePathname(),[incoming,setIncoming]=useState<Signal|null>(null),[person,setPerson]=useState<Person|null>(null),[status,setStatus]=useState<'idle'|'incoming'|'connecting'|'active'>('idle'),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[error,setError]=useState('');
 const pc=useRef<RTCPeerConnection|null>(null),local=useRef<MediaStream|null>(null),remote=useRef<MediaStream|null>(null),queued=useRef<RTCIceCandidateInit[]>([]),target=useRef<string|null>(null),callId=useRef<string|null>(null),conversation=useRef<string|null>(null),mode=useRef<'audio'|'video'>('audio'),offer=useRef<RTCSessionDescriptionInit|null>(null),earlyIce=useRef<Map<string,RTCIceCandidateInit[]>>(new Map()),localVideo=useRef<HTMLVideoElement>(null),remoteVideo=useRef<HTMLVideoElement>(null),remoteAudio=useRef<HTMLAudioElement>(null);
 async function signal(to:string,type:Signal['signal_type'],payload:any=null){if(!conversation.current||!callId.current)return;const {error}=await db.from('call_signals').insert({conversation_id:conversation.current,call_id:callId.current,sender_id:(await db.auth.getUser()).data.user?.id,recipient_id:to,signal_type:type,mode:mode.current,payload});if(error)throw error;}
 function cleanup(){pc.current?.close();pc.current=null;local.current?.getTracks().forEach(t=>t.stop());local.current=null;remote.current=null;queued.current=[];target.current=null;callId.current=null;conversation.current=null;offer.current=null;setIncoming(null);setPerson(null);setStatus('idle');setMuted(false);setCameraOff(false);}
 async function accept(){if(!incoming||!target.current||!callId.current)return;try{setError('');setStatus('connecting');const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:mode.current==='video'?{facingMode:'user'}:false});local.current=stream;if(localVideo.current){localVideo.current.srcObject=stream;void localVideo.current.play().catch(()=>{});}const dynamicIce=await getCallIceServers();const connection=new RTCPeerConnection({iceServers:dynamicIce.length?dynamicIce:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:4});pc.current=connection;stream.getTracks().forEach(t=>connection.addTrack(t,stream));connection.ontrack=e=>{remote.current=e.streams[0]||new MediaStream([e.track]);if(remoteVideo.current)remoteVideo.current.srcObject=remote.current;if(remoteAudio.current){remoteAudio.current.srcObject=remote.current;void remoteAudio.current.play().catch(()=>{});}if(remoteVideo.current)void remoteVideo.current.play().catch(()=>{});};connection.onicecandidate=e=>{if(e.candidate&&target.current)void signal(target.current,'ice',{candidate:e.candidate.toJSON()}).catch(()=>setError('Network signalling interrupted.'));};connection.onconnectionstatechange=()=>{if(connection.connectionState==='connected')setStatus('active');if(connection.connectionState==='failed')setError('Could not connect. Check network or TURN relay configuration.');};if(!offer.current)throw new Error('This call has expired.');await connection.setRemoteDescription(offer.current);for(const candidate of queued.current.splice(0)){try{await connection.addIceCandidate(candidate);}catch{}}const answer=await connection.createAnswer();await connection.setLocalDescription(answer);await signal(target.current,'answer',{sdp:answer});setIncoming(null);}catch(e:any){setError(e?.message||'Could not join the call. Check microphone and camera permissions.');setStatus('incoming');}}
 async function decline(){try{if(target.current)await signal(target.current,'reject');}catch{}cleanup();}
 async function end(){try{if(target.current)await signal(target.current,'end');}catch{}cleanup();}
 async function flipCamera(){const track=local.current?.getVideoTracks()[0];if(!track)return;try{const current=track.getSettings().facingMode;await track.applyConstraints({facingMode:current==='environment'?'user':'environment'});}catch{setError('This device could not switch cameras.');}}
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
 useEffect(()=>{if(status!=='active')return;if(remoteVideo.current&&remote.current){remoteVideo.current.srcObject=remote.current;void remoteVideo.current.play().catch(()=>{});}if(remoteAudio.current&&remote.current){remoteAudio.current.srcObject=remote.current;void remoteAudio.current.play().catch(()=>{});}},[status]);
 if(status==='idle')return null;
 return <div className="wayss-call-overlay"><section className="wayss-call-card"><div className="wayss-call-top">{person?.avatar_url?<img className="wayss-global-call-avatar" src={person.avatar_url} alt=""/>:<div className="wayss-global-call-avatar">{(person?.username||'W').slice(0,1).toUpperCase()}</div>}<h3>{person?.display_name||person?.username||'WAYSS user'}</h3><p>{status==='incoming'?'Incoming '+mode.current+' call':status==='connecting'?'Connecting…':'Connected'}</p></div>{mode.current==='video'&&status!=='incoming'&&<div className="wayss-call-video"><video ref={remoteVideo} autoPlay muted playsInline/><video ref={localVideo} autoPlay muted playsInline/><audio ref={remoteAudio} autoPlay/></div>}{mode.current==='audio'&&<audio ref={remoteAudio} autoPlay/>}{error&&<p className="wayss-call-error">{error}</p>}<div className="wayss-call-actions">{status==='incoming'?<><button className="wayss-call-accept" onClick={()=>void accept()}>{mode.current==='video'?<Video/>:<Phone/>} Accept</button><button className="wayss-call-end" onClick={()=>void decline()}><X/> Decline</button></>:<>{mode.current==='video'&&<button className="wayss-call-tool" onClick={()=>void flipCamera()} title="Switch front/back camera"><SwitchCamera/></button>}<button className="wayss-call-tool" onClick={()=>{local.current?.getAudioTracks().forEach(t=>t.enabled=muted);setMuted(v=>!v)}}>{muted?<MicOff/>:<Mic/>}</button>{mode.current==='video'&&<button className="wayss-call-tool" onClick={()=>{local.current?.getVideoTracks().forEach(t=>t.enabled=cameraOff);setCameraOff(v=>!v)}}>{cameraOff?<VideoOff/>:<Video/>}</button>}<button className="wayss-call-end" onClick={()=>void end()}><Phone/> End</button></>}</div><small>Calls require microphone/camera permission. Some networks require a TURN relay for reliable connections.</small></section></div>;
}
