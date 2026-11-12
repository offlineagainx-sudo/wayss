'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname,useRouter,useParams} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {Home,Compass,Plus,MessageCircle,UserRound,ImagePlus,Images,Video,MapPin,MoreHorizontal,Settings,Shield,UserCog,Ghost,Orbit,Bell} from 'lucide-react';
type Pref={style:'quick'|'classic';autoCollapse:boolean;delay:number;position:'left'|'center';labels:boolean;animations?:boolean;animationSpeed?:number;haptics?:boolean};
const db=supabase();
const KEY='wayss-navigation-v1';
const defaults:Pref={style:'quick',autoCollapse:true,delay:2.5,position:'left',labels:true,animations:true,animationSpeed:1,haptics:false};
const links=[{label:'Home',href:'/',Icon:Home},{label:'Orbit',href:'/orbit',Icon:Compass},{label:'Msgs',href:'/messages',Icon:MessageCircle},{label:'Profile',href:'/profile',Icon:UserRound}];
export default function QuickCenter(){
 const router=useRouter(),path=usePathname(),params=useParams(),profileUsername=path.startsWith('/u/')?String((params as any)?.username||''): '',[pref,SP]=useState<Pref>(defaults),[expanded,EX]=useState(false),[plus,PL]=useState(false),[more,MO]=useState(false),[admin,AD]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),swipeStart=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{if(!db)return;let active=true;db.auth.getSession().then(async({data}:any)=>{if(!active||!data.session)return;const {data:allowed}=await db.rpc('is_wayss_admin');if(active)AD(!!allowed)});const {data:{subscription}}=db.auth.onAuthStateChange(async(_event:string,s:any)=>{if(!s){AD(false);return;}const {data:allowed}=await db.rpc('is_wayss_admin');AD(!!allowed)});return()=>{active=false;subscription.unsubscribe()}},[]);
 useEffect(()=>{['/','/messages','/nearby','/flux','/profile','/settings'].forEach(href=>{try{router.prefetch(href)}catch{}})},[router]);
 useEffect(()=>{const read=()=>{try{const saved=localStorage.getItem(KEY);if(saved){const next={...defaults,...JSON.parse(saved)};SP(next);EX(next.style==='classic');}}catch{}};read();window.addEventListener('wayss-nav-change',read);window.addEventListener('storage',read);return()=>{window.removeEventListener('wayss-nav-change',read);window.removeEventListener('storage',read);};},[]);
 const clear=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;},[]);
 const schedule=useCallback(()=>{clear();if(pref.style==='quick'&&pref.autoCollapse&&!plus)timer.current=setTimeout(()=>{EX(false);PL(false);},pref.delay*1000);},[clear,pref.style,pref.autoCollapse,pref.delay,plus]);
 useEffect(()=>{if(expanded&&pref.style==='quick'&&!plus)schedule();else clear();return clear;},[expanded,plus,pref.style,schedule,clear]);
 useEffect(()=>()=>clear(),[clear]);
 useEffect(()=>{
  const canStart=(target:EventTarget|null)=>{const el=target as HTMLElement|null;return !el?.closest('input,textarea,select,button,a,[role=dialog],.nearby-map-stage,.nearby-sheet,.nearby-overlay,.modal-backdrop,.qc-root,.qc-create,.qc-top-actions');};
  const start=(x:number,y:number,target:EventTarget|null)=>{if(canStart(target))swipeStart.current={x,y};};
  const finish=(x:number,y:number)=>{const s=swipeStart.current;swipeStart.current=null;if(!s)return;const dx=x-s.x,dy=y-s.y;if(Math.abs(dx)<90||Math.abs(dx)<Math.abs(dy)*1.35)return;if(dx>0){EX(true);PL(false);MO(false);}else{EX(false);PL(false);MO(false);clear();}};
  const ts=(e:TouchEvent)=>{if(e.touches.length===1)start(e.touches[0].clientX,e.touches[0].clientY,e.target)};
  const te=(e:TouchEvent)=>{if(e.changedTouches.length)finish(e.changedTouches[0].clientX,e.changedTouches[0].clientY)};
  const ps=(e:PointerEvent)=>{if(e.pointerType==='mouse')start(e.clientX,e.clientY,e.target)};
  const pe=(e:PointerEvent)=>{if(e.pointerType==='mouse')finish(e.clientX,e.clientY)};
  window.addEventListener('touchstart',ts,{passive:true});window.addEventListener('touchend',te,{passive:true});window.addEventListener('pointerdown',ps);window.addEventListener('pointerup',pe);
  return()=>{window.removeEventListener('touchstart',ts);window.removeEventListener('touchend',te);window.removeEventListener('pointerdown',ps);window.removeEventListener('pointerup',pe)};
 },[clear]);

 const haptic=()=>{if(pref.haptics&&typeof navigator!=='undefined'&&'vibrate' in navigator)navigator.vibrate(8);};
 const go=(href:string)=>{haptic();clear();PL(false);MO(false);if(pref.style==='quick')EX(false);else EX(true);router.push(href);};
 const isActive=(href:string)=>href==='/'?path==='/':href==='/profile'?path==='/profile'||path.startsWith('/u/'):path===href||path.startsWith(href+'/');
 const navItems=<>{links.slice(0,2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}<button aria-label="Create" title="Create" className="qc-item qc-plus" onClick={()=>{haptic();clear();EX(true);MO(false);PL(v=>!v);}}><Plus/></button>{links.slice(2).map(({label,href,Icon})=><button key={href} aria-label={label} className={'qc-item '+(isActive(href)?'active':'')} onClick={()=>go(href)}><Icon/>{pref.labels&&<span>{label}</span>}</button>)}</>;
 return <>
 {!path.startsWith("/messages")&&!path.startsWith("/flux")&&!path.startsWith("/nearby")&&<div className="qc-top-actions">{!["/messages","/profile"].includes(path)&&<><button className={"qc-nearby "+(path.startsWith("/nearby")?"active":"")} onClick={()=>go("/nearby")}><MapPin size={16}/><span>Nearby</span></button><button className={"qc-flux "+(path.startsWith("/flux")?"active":"")} onClick={()=>go("/flux")}><Video size={16}/><span>Flux</span></button></>}{path.startsWith('/messages')?<div className="qc-more-wrap"><button className="qc-more-trigger" aria-label="Chat settings" onClick={()=>window.dispatchEvent(new Event("wayss:open-chat-settings"))}><MoreHorizontal/></button></div>:<div className="qc-more-wrap"><button className="qc-more-trigger" aria-label="More options" onClick={()=>MO(v=>!v)}><MoreHorizontal/></button>{more&&<><button className="qc-more-dismiss" aria-label="Close menu" onClick={()=>MO(false)}/><div className="qc-more-menu"><button onClick={()=>go('/activity')}><Bell size={16}/>Activity</button><button onClick={()=>go('/settings')}><Settings size={16}/>Settings</button><button onClick={()=>go('/settings/blocked')}><Shield size={16}/>Blocked accounts</button><button onClick={()=>go(profileUsername?'/phantom/'+encodeURIComponent(profileUsername):'/phantom/studio')}><Ghost size={16}/>{profileUsername?("View @"+profileUsername+"'s PHANTOM"):"My PHANTOM"}</button><button onClick={()=>go('/eclipse')}><Orbit size={16}/>ECLIPSE</button>{admin&&<button onClick={()=>go('/admin')}><Shield size={16}/>Admin panel</button>}<button onClick={async()=>{MO(false);clear();await db?.auth.signOut();router.replace('/');}}><UserRound size={16}/>Log out</button></div></>}</div>}</div>}
 {!path.startsWith('/flux')&&<nav className={'qc-root '+(pref.style==='classic'?'qc-classic qc-classic-open':'')+' '+(expanded||pref.style==='classic'?'qc-expanded':'')+' '+(pref.position==='center'?'qc-center':'')+' '+(pref.animations===false?'qc-no-animations':'')} style={{['--qc-duration' as any]:String((pref.animationSpeed??1)*220)+'ms'}} aria-label="WAYSS navigation">
 {pref.style==='classic'?<div className="qc-bar">{navItems}</div>:<>{!expanded&&<button className="qc-logo" onClick={()=>{haptic();EX(true)}} aria-label="Open navigation"><span>W<span>•</span></span></button>}{expanded&&<div className="qc-bar">{navItems}</div>}</>}
 </nav>}
 {plus&&<><button className="qc-dismiss" aria-label="Close create menu" onClick={()=>PL(false)}/><div className="qc-create"><button onClick={()=>go('/create?type=story')}><ImagePlus/><span>Story</span></button><button onClick={()=>go('/create?type=post')}><Images/><span>Post</span></button><button onClick={()=>go('/create?type=flux')}><Video/><span>Flux</span></button></div></>}

 </>;
}
