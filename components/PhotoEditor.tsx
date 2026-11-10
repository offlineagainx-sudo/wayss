'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,RotateCw,X} from 'lucide-react';

type Props={file:File;mode:'avatar'|'story';onCancel:()=>void;onApply:(file:File)=>void};
const filters=[
 ['Original','none'],['Soft','brightness(1.08) saturate(.88) contrast(.94)'],['Fresh','brightness(1.04) saturate(1.2) contrast(1.04)'],['Clear','contrast(1.16) saturate(1.08)'],['Glow','brightness(1.14) saturate(1.18)'],['Retro','sepia(.28) saturate(.88) contrast(.94)'],['Film','contrast(1.12) saturate(.82) sepia(.12)'],['Faded','brightness(1.1) contrast(.82) saturate(.76)'],['Classic','sepia(.18) contrast(1.08)'],['Grain','contrast(1.1) saturate(.9)'],['Cinema','contrast(1.22) saturate(.82) brightness(.96)'],['Drama','contrast(1.35) saturate(.9)'],['Moody','brightness(.86) contrast(1.18) saturate(.8)'],['Teal','hue-rotate(155deg) saturate(.72)'],['Noir','grayscale(1) contrast(1.35)'],['Dream','brightness(1.12) saturate(.8) blur(.15px)'],['Blush','sepia(.12) hue-rotate(325deg) saturate(1.15)'],['Rose','hue-rotate(330deg) saturate(1.22)'],['Cloud','brightness(1.15) contrast(.88) saturate(.72)'],['Pastel','brightness(1.08) saturate(.7) contrast(.9)'],['Golden','sepia(.34) saturate(1.35)'],['Arctic','hue-rotate(175deg) saturate(.78) brightness(1.04)'],['Sunset','sepia(.2) hue-rotate(345deg) saturate(1.35)'],['Ocean','hue-rotate(185deg) saturate(1.18)'],['Amber','sepia(.42) saturate(1.25)'],['Mono','grayscale(1)'],['Silver','grayscale(1) brightness(1.08) contrast(.92)'],['Contrast','grayscale(1) contrast(1.5)'],['Vintage Mono','grayscale(1) sepia(.18) contrast(.9)'],['Dark Mono','grayscale(1) brightness(.78) contrast(1.3)']
] as const;

export default function PhotoEditor({file,mode,onCancel,onApply}:Props){
 const [url,setUrl]=useState(''),[selected,setSelected]=useState(0),[zoom,setZoom]=useState(1),[rotation,setRotation]=useState(0),[brightness,setBrightness]=useState(100),[contrast,setContrast]=useState(100),[busy,setBusy]=useState(false);
 const imgRef=useRef<HTMLImageElement>(null);
 useEffect(()=>{const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
 const filter=filters[selected][1];
 const fullFilter=useMemo(()=>filter+' brightness('+brightness/100+') contrast('+contrast/100+')',[filter,brightness,contrast]);
 async function apply(){
  const img=imgRef.current;if(!img||!img.naturalWidth)return;setBusy(true);
  try{
   const w=mode==='avatar'?1080:1080,h=mode==='avatar'?1080:1920;
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo editor is not supported on this device.');
   const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*zoom;
   ctx.translate(w/2,h/2);ctx.rotate(rotation*Math.PI/180);
   const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
   ctx.filter='none';ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
   ctx.globalAlpha=.0;ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
   ctx.globalAlpha=1;ctx.filter=fullFilter;ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.filter='none';
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not process this image.')),'image/jpeg',.94));
   onApply(new File([blob],(file.name.replace(/\.[^.]+$/,'')||'wayss-image')+'-edited.jpg',{type:'image/jpeg'}));
  }catch(e:any){alert(e.message||'Could not edit image.')}finally{setBusy(false)}
 }
 if(!url)return null;
 return <div className="photo-editor-backdrop" role="dialog" aria-modal="true" aria-label={mode==='avatar'?'Adjust profile picture':'Edit story photo'}>
  <section className="photo-editor">
   <header><button type="button" onClick={onCancel} aria-label="Cancel"><X/></button><b>{mode==='avatar'?'Adjust profile picture':'Edit story'}</b><button type="button" onClick={()=>{setZoom(1);setRotation(0);setSelected(0);setBrightness(100);setContrast(100)}}>Reset</button></header>
   <div className={'photo-editor-stage '+(mode==='avatar'?'avatar-stage':'story-stage')}>
    <img ref={imgRef} src={url} alt="Image preview" style={{transform:'scale('+zoom+') rotate('+rotation+'deg)',filter:fullFilter}}/>
   </div>
   <div className="photo-editor-tools">
    <label>Zoom <input type="range" min="1" max="3" step=".01" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
    <button type="button" className="photo-editor-rotate" onClick={()=>setRotation(v=>(v+90)%360)}><RotateCw size={16}/> Rotate</button>
    <label>Brightness <input type="range" min="50" max="150" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
    <label>Contrast <input type="range" min="50" max="150" value={contrast} onChange={e=>setContrast(Number(e.target.value))}/></label>
   </div>
   {mode==='story'&&<div className="photo-filter-strip">{filters.map(([name],i)=><button type="button" key={name} className={selected===i?'active':''} onClick={()=>setSelected(i)}><span className="photo-filter-thumb"><img src={url} alt="" style={{filter:filters[i][1]}}/></span><small>{name}</small></button>)}</div>}
   <footer><button type="button" className="secondary-action" onClick={onCancel}>Cancel</button><button type="button" className="primary" onClick={()=>void apply()} disabled={busy}>{busy?'Applying…':<><Check size={16}/> Use photo</>}</button></footer>
  </section>
  <style jsx>{`
   .photo-editor-backdrop{position:fixed;inset:0;z-index:3000;background:#05060beF;display:grid;place-items:center;padding:12px}
   .photo-editor{width:min(100%,620px);max-height:94dvh;overflow:auto;border:1px solid #30313d;border-radius:20px;background:#101116;color:#f5f5f7;padding:14px;display:grid;gap:13px}
   header,footer{display:flex;align-items:center;justify-content:space-between;gap:10px}header button{border:0;background:transparent;color:#f5f5f7;padding:8px}header b{font-size:14px}header button:last-child{font-size:11px;color:#ff8199}
   .photo-editor-stage{margin:auto;overflow:hidden;background:#08090d;display:grid;place-items:center;border-radius:12px;width:min(100%,380px);touch-action:pan-y}
   .avatar-stage{aspect-ratio:1;border-radius:50%;width:min(76vw,340px)}.story-stage{aspect-ratio:9/16;width:min(62vw,300px);max-height:48dvh}
   .photo-editor-stage img{width:100%;height:100%;object-fit:cover;transform-origin:center;will-change:transform}
   .photo-editor-tools{display:grid;grid-template-columns:1fr 1fr;gap:10px}.photo-editor-tools label{display:grid;gap:5px;color:#aeb2bf;font-size:10px}.photo-editor-tools input{width:100%;accent-color:#f32950}.photo-editor-rotate{align-self:end;display:flex;justify-content:center;align-items:center;gap:7px;min-height:32px;border:1px solid #30313d;border-radius:9px;background:#17181f;color:#eee;font-size:11px}
   .photo-filter-strip{display:flex;gap:9px;overflow-x:auto;padding:2px 0 7px}.photo-filter-strip button{flex:0 0 62px;border:0;background:transparent;color:#9da1af;padding:2px}.photo-filter-thumb{display:block;width:56px;height:56px;border:2px solid transparent;border-radius:10px;overflow:hidden}.photo-filter-strip button.active .photo-filter-thumb{border-color:#f32950}.photo-filter-thumb img{width:100%;height:100%;object-fit:cover}.photo-filter-strip small{display:block;margin-top:5px;font-size:9px;white-space:nowrap}
   footer{padding-top:4px}footer button{min-height:40px;display:flex;align-items:center;gap:7px}
   @media(max-width:420px){.photo-editor{padding:11px}.photo-editor-tools{grid-template-columns:1fr 1fr}.story-stage{width:min(68vw,280px);max-height:42dvh}}
  `}</style>
 </div>;
}
