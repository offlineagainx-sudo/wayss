'use client';
import {useRef,useState} from 'react';
import {Pause,Play,Volume2} from 'lucide-react';
type Props={src:string;label?:string};
export default function AudioPlayer({src,label='Audio message'}:Props){
 const ref=useRef<HTMLAudioElement>(null),[playing,P]=useState(false),[duration,D]=useState(0),[current,C]=useState(0);
 const toggle=()=>{const a=ref.current;if(!a)return;if(a.paused)void a.play().then(()=>P(true)).catch(()=>P(false));else{a.pause();P(false)}};
 const fmt=(n:number)=>{if(!Number.isFinite(n))return '0:00';const m=Math.floor(n/60),s=Math.floor(n%60);return m+':'+String(s).padStart(2,'0')};
 return <div className="wayss-audio"><audio ref={ref} src={src} controls={false} preload="metadata" onLoadedMetadata={e=>D(e.currentTarget.duration||0)} onTimeUpdate={e=>C(e.currentTarget.currentTime)} onEnded={()=>P(false)}/><button type="button" aria-label={playing?'Pause audio':'Play audio'} onClick={toggle}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><div className="wayss-audio-main"><b>{label}</b><input aria-label="Audio progress" type="range" min="0" max={duration||1} step="0.1" value={Math.min(current,duration||1)} onChange={e=>{const v=ref.current;if(v)v.currentTime=Number(e.target.value)}}/><small>{fmt(current)} / {fmt(duration)}</small></div><Volume2 size={16}/></div>;
}