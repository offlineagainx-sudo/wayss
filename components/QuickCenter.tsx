'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Home,Compass,Plus,MessageCircle,UserRound,ImagePlus,Images,Video} from 'lucide-react';
type Pref={style:'quick'|'classic';autoCollapse:boolean;delay:number;position:'left'|'center';labels:boolean};
const KEY='wayss-navigation-v1';
const defaults:Pref={style:'quick',autoCollapse:true,delay:2.5,position:'left',labels:true};
const links=[{label:'Home',href:'/',Icon:Home},{label:'Orbit',href:'/orbit',Icon:Compass},{label:'Msgs',href:'/messages',Icon:MessageCircle},{label:'Profile',href:'/profile',Icon:UserRound}];
export default function QuickCenter(){
 const router=useRouter(),path=usePathname(),[pref,SP]=useState<Pref>(defaults),[expanded,EX]=useState(false),[plus,PL]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{const read=()=>{try{const saved=localStorage.getItem(KEY);if(saved){const next={...defaults,...JSON.parse(saved)};SP(next);if(next.style==='classic')EX(true);}}catch{}};read();window.addEventListener('wayss-nav-change',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('wayss-nav-change',read);window.removeEventListener('storage',read);};},[]);
 const clear=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;},[]);
 const schedule=useCallback(()=>{clear();if(pref.autoCollapse&&!plus)timer.current=setTimeout(()=>{EX(false);PL(false);},pref.delay*1000);},[clear,pref.autoCollapse,pref.delay,plus]);
 useEffect(()=>{if(expanded&&!plus)schedule();else clear();return clear;},[expanded,plus,schedule,clear]);
 useEffect(()=>()=>clear(),[clear]);
 const go=(href:string)=>{clear();PL(false);EX(false);router.push(href);};
 const toggle=()=>{if(expanded){EX(false);PL(false);clear();}else{EX(true);}};
 const isActive=(href:string)=>href==='/'?path==='/':href==='/profile'?path==='/profile'||path.startsWith('/u/'):path===href||path.startsWith(href+'/');
 const navItems=<>{links.slice(0,2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}<button aria-label="Create" className="qc-item qc-plus" onClick={()=>{PL(v=>!v);EX(true);clear();}}><Plus/><span>{pref.labels?'Create':''}</span></button>{links.slice(2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}</>;
 return <><nav className={'qc-root '+(pref.style==='classic'?'qc-classic '+(expanded?'qc-classic-open':'qc-classic-closed'):'')+' '+(pref.position==='center'?'qc-center':'')} aria-label="WAYSS navigation">
 {pref.style==='classic'?<div className="qc-bar"><button className="qc-bar-brand" onClick={toggle} aria-label="WAYSS navigation"><span>W<span>•</span></span></button>{expanded&&navItems}</div>:<><button className={'qc-logo '+(expanded?'is-open':'')} onClick={toggle} aria-label={expanded?'Collapse navigation':'Open navigation'}><span>W<span>•</span></span></button>{expanded&&<div className="qc-bar">{navItems}</div>}</>}
 </nav>
 {plus&&<><button className="qc-dismiss" aria-label="Close create menu" onClick={()=>{PL(false);schedule();}}/><div className="qc-create"><button onClick={()=>go('/create?type=post')}><ImagePlus/><span>Post</span></button><button onClick={()=>go('/create?type=images')}><Images/><span>Images</span></button><button onClick={()=>go('/create?type=flux')}><Video/><span>Flux</span></button></div></>}
 </>;
}