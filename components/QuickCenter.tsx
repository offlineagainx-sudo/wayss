'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Home,Compass,Plus,MessageCircle,UserRound} from 'lucide-react';
const items=[{label:'Home',href:'/',Icon:Home},{label:'Orbit',href:'/orbit',Icon:Compass},{label:'Plus',href:'/create',Icon:Plus},{label:'Msgs',href:'/messages',Icon:MessageCircle},{label:'Profile',href:'/profile',Icon:UserRound}];
export default function QuickCenter(){const router=useRouter(),path=usePathname();const [open,setOpen]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
const reveal=()=>{setOpen(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(false),2600)};
useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
return <div className={'quick-center '+(open?'expanded':'')}><button className="quick-center-trigger" aria-label="Open WAYSS navigation" onClick={reveal}><span className="quick-mark">WAY<span>S</span></span></button>{open&&<div className="quick-center-menu">{items.map(({label,href,Icon})=><button key={href} className={'quick-center-item '+(path===href?'selected':'')} onClick={()=>{setOpen(false);router.push(href)}}><Icon size={18}/><span>{label}</span></button>)}</div>}</div>}
