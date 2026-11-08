'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Home,Compass,Plus,MessageCircle,UserRound,ImagePlus,Images,Video,MapPin,MoreHorizontal,Settings,ChevronLeft,Shield,UserCog,Ghost} from 'lucide-react';
type Pref={style:'quick'|'classic';autoCollapse:boolean;delay:number;position:'left'|'center';labels:boolean};
const KEY='wayss-navigation-v1';
const defaults:Pref={style:'quick',autoCollapse:true,delay:2.5,position:'left',labels:true};
const links=[{label:'Home',href:'/',Icon:Home},{label:'Orbit',href:'/orbit',Icon:Compass},{label:'Msgs',href:'/messages',Icon:MessageCircle},{label:'Profile',href:'/profile',Icon:UserRound}];
export default function QuickCenter(){
 const router=useRouter(),path=usePathname(),[pref,SP]=useState<Pref>(defaults),[expanded,EX]=useState(false),[plus,PL]=useState(false),[more,MO]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{const read=()=>{try{const saved=localStorage.getItem(KEY);if(saved){const next={...defaults,...JSON.parse(saved)};SP(next);EX(next.style==='classic');}}catch{}};read();window.addEventListener('wayss-nav-change',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('wayss-nav-change',read);window.removeEventListener('storage',read);};},[]);
 const clear=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;},[]);
 const schedule=useCallback(()=>{clear();if(pref.style==='quick'&&pref.autoCollapse&&!plus)timer.current=setTimeout(()=>{EX(false);PL(false);},pref.delay*1000);},[clear,pref.style,pref.autoCollapse,pref.delay,plus]);
 useEffect(()=>{if(expanded&&pref.style==='quick'&&!plus)schedule();else clear();return clear;},[expanded,plus,pref.style,schedule,clear]);
 useEffect(()=>()=>clear(),[clear]);
 const go=(href:string)=>{clear();PL(false);MO(false);if(pref.style==='quick')EX(false);else EX(true);router.push(href);};
 const isActive=(href:string)=>href==='/'?path==='/':href==='/profile'?path==='/profile'||path.startsWith('/u/'):path===href||path.startsWith(href+'/');
 const navItems=<>{links.slice(0,2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}<button aria-label="Create" title="Create" className="qc-item qc-plus" onClick={()=>{PL(v=>!v);EX(true);clear();}}><Plus/></button>{links.slice(2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}</>;
 return <>
 {!path.startsWith("/nearby")&&<div className="qc-top-actions"><button className={'qc-nearby '+(path.startsWith('/nearby')?'active':'')} onClick={()=>go('/nearby')}><MapPin size={16}/><span>Nearby</span></button><div className="qc-more-wrap"><button className="qc-more-trigger" aria-label="More options" onClick={()=>MO(v=>!v)}><MoreHorizontal/></button>{more&&<><button className="qc-more-dismiss" aria-label="Close menu" onClick={()=>MO(false)}/><div className="qc-more-menu"><button onClick={()=>go('/settings')}><Settings size={16}/>Settings</button><button onClick={()=>go('/settings/profile')}><UserCog size={16}/>Edit profile</button><button onClick={()=>go('/settings/blocked')}><Shield size={16}/>Blocked accounts</button><button onClick={()=>go('/phantom/studio')}><Ghost size={16}/>My PHANTOM</button></div></>}</div></div>
 <nav className={'qc-root '+(pref.style==='classic'?'qc-classic qc-classic-open':'')+' '+(pref.position==='center'?'qc-center':'')} aria-label="WAYSS navigation">
 {pref.style==='classic'?<div className="qc-bar">{navItems}</div>:<>{!expanded&&<button className="qc-logo" onClick={()=>EX(true)} aria-label="Open navigation"><span>W<span>•</span></span></button>}{expanded&&<div className="qc-bar">{navItems}</div>}</>}
 </nav>
 {plus&&<><button className="qc-dismiss" aria-label="Close create menu" onClick={()=>{PL(false);schedule();}}/><div className="qc-create"><button onClick={()=>go('/create?type=post')}><ImagePlus/><span>Post</span></button><button onClick={()=>go('/create?type=story')}><Images/><span>Story</span></button><button onClick={()=>go('/create?type=images')}><Images/><span>Images</span></button><button onClick={()=>go('/create?type=flux')}><Video/><span>Flux</span></button></div></>}
 </>;
}
