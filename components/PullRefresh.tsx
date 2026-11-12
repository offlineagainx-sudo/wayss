'use client';
import {useEffect,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {useRouter} from 'next/navigation';

export default function PullRefresh(){
 const router=useRouter();
 const start=useRef<{x:number;y:number}|null>(null),pullRef=useRef(0);
 const [pull,setPull]=useState(0),[refreshing,setRefreshing]=useState(false);
 useEffect(()=>{
  let locked=false;
  const onStart=(e:TouchEvent)=>{if(locked||window.scrollY>2||e.touches.length!==1)return;const target=e.target as HTMLElement|null;if(target?.closest('input,textarea,select,button,a,[role=dialog],.nearby-map-stage,.nearby-sheet,.nearby-overlay,.modal-backdrop,.qc-root,.qc-create'))return;const t=e.touches[0];start.current={x:t.clientX,y:t.clientY};};
  const onMove=(e:TouchEvent)=>{if(!start.current||locked)return;const t=e.touches[0],dx=t.clientX-start.current.x,dy=t.clientY-start.current.y;if(Math.abs(dx)>Math.abs(dy)*1.2){start.current=null;setPull(0);pullRef.current=0;return;}if(dy>0){const amount=Math.min(88,dy*.58);pullRef.current=amount;setPull(amount);if(dy>8)e.preventDefault();}};
  const onEnd=()=>{if(!start.current)return;const shouldRefresh=pullRef.current>=66;start.current=null;if(shouldRefresh){locked=true;setRefreshing(true);pullRef.current=66;setPull(66);window.setTimeout(()=>{router.refresh();locked=false;setRefreshing(false);pullRef.current=0;setPull(0);},450);}else{pullRef.current=0;setPull(0);}};
  window.addEventListener('touchstart',onStart,{passive:true});window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onEnd,{passive:true});window.addEventListener('touchcancel',onEnd,{passive:true});
  return()=>{window.removeEventListener('touchstart',onStart);window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onEnd);window.removeEventListener('touchcancel',onEnd);};
 },[]);
 return <div className={'wayss-pull-indicator '+(refreshing?'is-refreshing':'')} style={{transform:'translate(-50%,'+(Math.max(-46,pull-46))+'px)',opacity:pull>0||refreshing?1:0}} aria-live="polite"><span className="wayss-pull-orbit"><RefreshCw size={17}/></span><small>{refreshing?'Refreshing WAYSS':pull>=66?'Release to refresh':'Pull to refresh'}</small></div>;
}
