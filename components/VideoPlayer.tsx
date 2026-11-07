'use client';
import {useRef,useState} from 'react';
import {Maximize,Pause,Play,Volume2,VolumeX} from 'lucide-react';
type Props={src:string;className?:string;loop?:boolean;autoPlay?:boolean;muted?:boolean;label?:string};
export default function VideoPlayer({src,className='',loop=false,autoPlay=false,muted:initialMuted=true,label='Video'}:Props){
 const ref=useRef<HTMLVideoElement>(null),[playing,setPlaying]=useState(autoPlay),[muted,setMuted]=useState(initialMuted),[progress,setProgress]=useState(0);
 const toggle=()=>{const v=ref.current;if(!v)return;if(v.paused){void v.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));}else{v.pause();setPlaying(false)}};
 const fullscreen=()=>{const v=ref.current;if(!v)return;if(v.requestFullscreen)void v.requestFullscreen();};
 return <div className={'wayss-player '+className}>
  <video ref={ref} className="wayss-player-video" src={src} playsInline loop={loop} muted={muted} autoPlay={autoPlay} controls={false} controlsList="nodownload noplaybackrate" disablePictureInPicture preload="metadata" aria-label={label} onContextMenu={e=>e.preventDefault()} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={e=>{const v=e.currentTarget;setProgress(v.duration? v.currentTime/v.duration*100:0)}} onClick={toggle}/>
  {!playing&&<button className="wayss-player-center" aria-label="Play video" onClick={toggle}><Play fill="currentColor"/></button>}
  <div className="wayss-player-controls">
   <button type="button" aria-label={playing?'Pause video':'Play video'} onClick={toggle}>{playing?<Pause size={17}/>:<Play size={17}/>}</button>
   <div className="wayss-player-track"><span style={{width:progress+'%'}}/></div>
   <button type="button" aria-label={muted?'Unmute video':'Mute video'} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
   <button type="button" aria-label="Fullscreen video" onClick={fullscreen}><Maximize size={16}/></button>
  </div>
 </div>;
}