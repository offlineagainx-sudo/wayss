'use client';
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {Check,RotateCw,X,Type,SlidersHorizontal} from 'lucide-react';

type Props={file:File;mode:'avatar'|'story';onCancel:()=>void;onApply:(file:File)=>void};
const filters=[
 ['Original',''],['Soft','brightness(1.08) saturate(.88) contrast(.94)'],['Fresh','brightness(1.04) saturate(1.2) contrast(1.04)'],['Clear','contrast(1.16) saturate(1.08)'],['Glow','brightness(1.14) saturate(1.18)'],['Retro','sepia(.28) saturate(.88) contrast(.94)'],['Film','contrast(1.12) saturate(.82) sepia(.12)'],['Faded','brightness(1.1) contrast(.82) saturate(.76)'],['Classic','sepia(.18) contrast(1.08)'],['Grain','contrast(1.1) saturate(.9)'],['Cinema','contrast(1.22) saturate(.82) brightness(.96)'],['Drama','contrast(1.35) saturate(.9)'],['Moody','brightness(.86) contrast(1.18) saturate(.8)'],['Teal','hue-rotate(155deg) saturate(.72)'],['Noir','grayscale(1) contrast(1.35)'],['Dream','brightness(1.12) saturate(.8) blur(.15px)'],['Blush','sepia(.12) hue-rotate(325deg) saturate(1.15)'],['Rose','hue-rotate(330deg) saturate(1.22)'],['Cloud','brightness(1.15) contrast(.88) saturate(.72)'],['Pastel','brightness(1.08) saturate(.7) contrast(.9)'],['Golden','sepia(.34) saturate(1.35)'],['Arctic','hue-rotate(175deg) saturate(.78) brightness(1.04)'],['Sunset','sepia(.2) hue-rotate(345deg) saturate(1.35)'],['Ocean','hue-rotate(185deg) saturate(1.18)'],['Amber','sepia(.42) saturate(1.25)'],['Mono','grayscale(1)'],['Silver','grayscale(1) brightness(1.08) contrast(.92)'],['Contrast','grayscale(1) contrast(1.5)'],['Vintage Mono','grayscale(1) sepia(.18) contrast(.9)'],['Dark Mono','grayscale(1) brightness(.78) contrast(1.3)']
] as const;
type Point={x:number;y:number};
export default function PhotoEditor({file,mode,onCancel,onApply}:Props){
 const [url,setUrl]=useState(''),[selected,setSelected]=useState(0),[zoom,setZoom]=useState(1),[rotation,setRotation]=useState(0),[offset,setOffset]=useState<Point>({x:0,y:0}),[brightness,setBrightness]=useState(100),[contrast,setContrast]=useState(100),[text,setText]=useState(''),[showAdjust,setShowAdjust]=useState(false),[busy,setBusy]=useState(false);
 const imgRef=useRef<HTMLImageElement>(null);
 const stageRef=useRef<HTMLDivElement>(null);
 const pointers=useRef(new Map<number,Point>());
 const gesture=useRef<{distance:number;zoom:number;mid:Point;offset:Point;start:Point}|null>(null);
 useEffect(()=>{const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
 const filter=filters[selected][1];
 const fullFilter=useMemo(()=>(filter?filter+' ':'')+'brightness('+brightness/100+') contrast('+contrast/100+')',[filter,brightness,contrast]);
 function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y)}
 function midpoint(a:Point,b:Point):Point{return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function clampOffset(next:Point,scaleZoom=zoom,angle=rotation):Point{
  const stage=stageRef.current,img=imgRef.current;if(!stage||!img?.naturalWidth||!img.naturalHeight)return next;
  const rect=stage.getBoundingClientRect();const fit=Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight)*scaleZoom;
  let width=img.naturalWidth*fit,height=img.naturalHeight*fit;if(Math.abs(angle%180)===90)[width,height]=[height,width];
  const maxX=Math.max(0,(width-rect.width)/2),maxY=Math.max(0,(height-rect.height)/2);
  return {x:Math.min(maxX,Math.max(-maxX,next.x)),y:Math.min(maxY,Math.max(-maxY,next.y))};
 }
 function pointerDown(e:ReactPointerEvent<HTMLDivElement>){
  e.currentTarget.setPointerCapture(e.pointerId);
  const rect=e.currentTarget.getBoundingClientRect();const p={x:e.clientX-rect.left,y:e.clientY-rect.top};
  pointers.current.set(e.pointerId,p);
  if(pointers.current.size===1)gesture.current={distance:0,zoom,mid:p,offset:{...offset},start:p};
  if(pointers.current.size===2){const pts=[...pointers.current.values()];gesture.current={distance:distance(pts[0],pts[1]),zoom,mid:midpoint(pts[0],pts[1]),offset:{...offset},start:midpoint(pts[0],pts[1])};}
 }
 function pointerMove(e:React.PointerEvent<HTMLDivElement>){
  if(!pointers.current.has(e.pointerId))return;
  const rect=e.currentTarget.getBoundingClientRect();pointers.current.set(e.pointerId,{x:e.clientX-rect.left,y:e.clientY-rect.top});
  const pts=[...pointers.current.values()],g=gesture.current;if(!g)return;
  if(pts.length>=2){const d=distance(pts[0],pts[1]);setZoom(Math.min(5,Math.max(1,g.zoom*(d/(g.distance||d||1)))));const mid=midpoint(pts[0],pts[1]);setOffset({x:g.offset.x+mid.x-g.mid.x,y:g.offset.y+mid.y-g.mid.y});}
  else if(pts.length===1)setOffset({x:g.offset.x+pts[0].x-g.start.x,y:g.offset.y+pts[0].y-g.start.y});
 }
 function pointerUp(e:React.PointerEvent<HTMLDivElement>){
  pointers.current.delete(e.pointerId);const pts=[...pointers.current.values()];
  if(pts.length===1)gesture.current={distance:0,zoom,mid:pts[0],offset:{...offset},start:pts[0]};else gesture.current=null;
 }
 async function apply(){
  const img=imgRef.current;if(!img||!img.naturalWidth)return;setBusy(true);
  try{
   const w=1080,h=mode==='avatar'?1080:1920,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo editing is not supported on this device.');
   const base=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*base,dh=img.naturalHeight*base;
   const stage=stageRef.current;
   const rx=w/(stage?.clientWidth||w),ry=h/(stage?.clientHeight||h);
   ctx.translate(w/2+offset.x*rx,h/2+offset.y*ry);ctx.rotate(rotation*Math.PI/180);ctx.scale(zoom,zoom);
   ctx.filter=fullFilter;ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.filter='none';
   if(mode==='story'&&text.trim()){ctx.font='bold 64px system-ui';ctx.textAlign='center';ctx.lineWidth=8;ctx.strokeStyle='rgba(0,0,0,.55)';ctx.fillStyle='#fff';ctx.strokeText(text.trim(),w/2,-h*.32,w*.82);ctx.fillText(text.trim(),w/2,-h*.32,w*.82);}
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not process image.')),'image/jpeg',.95));
   onApply(new File([blob],(file.name.replace(/\.[^.]+$/,'')||'wayss-image')+'-edited.jpg',{type:'image/jpeg'}));
  }catch(e:any){alert(e.message||'Could not edit image.')}finally{setBusy(false)}
 }
 if(!url)return null;
 return <div className="photo-editor-backdrop" role="dialog" aria-modal="true" aria-label={mode==='avatar'?'Adjust profile picture':'Edit story'}>
  <section className={'photo-editor '+(mode==='story'?'story-editor':'avatar-editor')}>
   <header><button type="button" onClick={onCancel} aria-label="Close"><X/></button><b>{mode==='avatar'?'Adjust profile picture':'Edit story'}</b><button type="button" className="done" onClick={()=>void apply()} disabled={busy}>{busy?'Saving…':<><Check size={17}/> Done</>}</button></header>
   <div ref={stageRef} className={'photo-editor-stage '+(mode==='avatar'?'avatar-stage':'story-stage')} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <img ref={imgRef} src={url} alt="Image to crop" draggable={false} style={{transform:'translate('+offset.x+'px,'+offset.y+'px) scale('+zoom+') rotate('+rotation+'deg)',filter:fullFilter}}/>
    {mode==='avatar'&&<div className="avatar-crop-guide" aria-hidden="true"><span/></div>}
   </div>
   <div className="gesture-hint">{mode==='avatar'?'Drag to position · Pinch to zoom · Move the photo inside the circle':'Drag to move · Pinch to zoom · Rotate to adjust'}</div>
   {mode==='story'&&<div className="story-tools">
    <button type="button" onClick={()=>{setRotation(v=>(v+90)%360);setOffset({x:0,y:0})}}><RotateCw size={18}/><small>Rotate</small></button>
    <button type="button" onClick={()=>setShowAdjust(v=>!v)}><SlidersHorizontal size={18}/><small>Adjust</small></button>
    <label><Type size={18}/><small>Add text</small><input value={text} onChange={e=>setText(e.target.value)} placeholder="Write something…"/></label>
   </div>}
   {showAdjust&&mode==='story'&&<div className="adjust-panel"><label>Brightness <input type="range" min="50" max="150" value={brightness} onChange={e=>setBrightness(+e.target.value)}/></label><label>Contrast <input type="range" min="50" max="150" value={contrast} onChange={e=>setContrast(+e.target.value)}/></label></div>}
   {mode==='story'&&<div className="photo-filter-strip">{filters.map(([name,css],i)=><button type="button" key={name} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span><img src={url} alt="" style={{filter:css}}/></span><small>{name}</small></button>)}</div>}
   {mode==='avatar'&&<div className="avatar-actions"><button type="button" onClick={()=>{setZoom(1);setOffset({x:0,y:0});setRotation(0)}}>Reset position</button><button type="button" onClick={()=>{setRotation(v=>(v+90)%360);setOffset({x:0,y:0})}}><RotateCw size={15}/> Rotate</button></div>}
   {mode==='story'&&<footer><button type="button" className="cancel" onClick={onCancel}>Discard</button><button type="button" className="primary" onClick={()=>void apply()} disabled={busy}>{busy?'Applying…':'Use photo'}</button></footer>}
  </section>
  <style jsx>{`
   .photo-editor-backdrop{position:fixed;inset:0;z-index:3200;background:#050609f5;display:grid;place-items:center;padding:0;color:#f5f5f7}
   .photo-editor{width:min(100%,520px);height:100dvh;max-height:100dvh;background:#08090d;display:flex;flex-direction:column;gap:12px;padding:env(safe-area-inset-top) 14px env(safe-area-inset-bottom)}
   header{height:54px;flex:0 0 54px;display:flex;align-items:center;justify-content:space-between}header button{border:0;background:transparent;color:#fff;display:flex;align-items:center;gap:6px;padding:8px}header b{font-size:14px}header .done{color:#ff5474;font-weight:700}
   .photo-editor-stage{position:relative;margin:auto;overflow:hidden;background:#11131a;touch-action:none;user-select:none;width:min(100%,390px);flex:0 1 auto}
   .avatar-stage{width:min(88vw,390px);aspect-ratio:1;border-radius:0}
   .story-stage{width:min(76vw,360px);height:min(65dvh,640px);aspect-ratio:9/16;border-radius:12px}
   .photo-editor-stage>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:center;pointer-events:none;will-change:transform}
   .avatar-crop-guide{position:absolute;inset:0;pointer-events:none;display:grid;place-items:center}
   .avatar-crop-guide span{width:100%;height:100%;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.62),0 0 18px #0008}
   .gesture-hint{text-align:center;color:#b6b9c4;font-size:11px;letter-spacing:.1px}
   .avatar-actions{display:flex;justify-content:center;gap:14px;padding:10px}.avatar-actions button{display:flex;align-items:center;gap:7px;color:#f5f5f7;background:#191b23;border:1px solid #343744;border-radius:20px;padding:10px 16px;font-size:12px}
   .story-tools{display:flex;align-items:center;justify-content:space-around;gap:10px;padding:8px 0}.story-tools>button,.story-tools>label{display:flex;flex-direction:column;align-items:center;gap:5px;background:transparent;border:0;color:#fff;font-size:10px}.story-tools label input{width:100px;background:#17181f;border:1px solid #343744;color:white;border-radius:8px;padding:6px}
   .adjust-panel{display:grid;grid-template-columns:1fr 1fr;gap:12px}.adjust-panel label{display:grid;gap:5px;font-size:10px;color:#aaa}.adjust-panel input{width:100%;accent-color:#f32950}
   .photo-filter-strip{display:flex;gap:10px;overflow-x:auto;padding:4px 0 10px;flex:0 0 auto}.photo-filter-strip button{flex:0 0 62px;background:transparent;border:0;color:#aaa;padding:0}.photo-filter-strip button>span{display:block;width:58px;height:58px;border:2px solid transparent;border-radius:50%;overflow:hidden}.photo-filter-strip button.active>span{border-color:#f32950}.photo-filter-strip img{width:100%;height:100%;object-fit:cover}.photo-filter-strip small{display:block;font-size:9px;margin-top:5px;white-space:nowrap}
   footer{display:flex;gap:10px;padding:6px 0 12px}footer button{flex:1;min-height:44px;border-radius:12px}footer .cancel{background:#17181f;color:#fff;border:1px solid #30313d}
   @media(max-width:599px){
    .photo-editor.story-editor{width:100%;height:100dvh;max-height:100dvh;min-height:0;overflow:hidden;gap:clamp(5px,1.1dvh,10px);padding:calc(env(safe-area-inset-top) + 4px) 12px calc(env(safe-area-inset-bottom) + 6px)}
    .story-editor header{height:46px;flex:0 0 46px}
    .story-editor .photo-editor-stage.story-stage{width:min(100%,390px,calc(46dvh * 9 / 16));max-width:100%;height:auto;max-height:46dvh;aspect-ratio:9/16;flex:0 1 auto;min-height:0;margin:0 auto;border-radius:12px}
    .story-editor .gesture-hint{flex:0 0 auto;font-size:10px;line-height:1.25}
    .story-editor .story-tools{flex:0 0 auto;padding:2px 0;gap:8px}
    .story-editor .story-tools>button,.story-editor .story-tools>label{min-width:0}
    .story-editor .story-tools label input{width:min(28vw,100px);max-width:100%}
    .story-editor .adjust-panel{flex:0 0 auto;gap:8px}
    .story-editor .photo-filter-strip{width:100%;max-width:100%;min-width:0;flex:0 0 84px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;touch-action:pan-x;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:2px 2px 8px}
    .story-editor .photo-filter-strip button{scroll-snap-align:start;flex:0 0 58px}
    .story-editor .photo-filter-strip button>span{width:52px;height:52px}
    .story-editor footer{flex:0 0 auto;padding:2px 0 4px}
   }
   @media(min-width:600px){.photo-editor{height:auto;max-height:96dvh;border:1px solid #30313d;border-radius:22px;padding:16px}.story-stage{height:min(58dvh,600px)}}
  `}</style>
 </div>;
}
