'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,Camera,FlipHorizontal,ImagePlus,RefreshCw,X} from 'lucide-react';

type Props={onCapture:(file:File)=>void;onClose:()=>void;onGallery:()=>void};
export default function StoryCamera({onCapture,onClose,onGallery}:Props){
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null);
 const [facing,setFacing]=useState<'user'|'environment'>('environment');
 const [error,setError]=useState(''),[starting,setStarting]=useState(true),[flash,setFlash]=useState(false);
 const stop=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;},[]);
 const start=useCallback(async()=>{
  stop();setStarting(true);setError('');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera is unavailable here. Open WAYSS over HTTPS or use Gallery.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}}});
   streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
  }catch(e:any){setError(e?.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings.':e?.message||'Could not open camera.');}
  finally{setStarting(false);}
 },[facing,stop]);
 useEffect(()=>{void start();return stop;},[start,stop]);
 async function capture(){
  const video=videoRef.current;if(!video||!video.videoWidth)return;
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const ctx=canvas.getContext('2d');if(!ctx){setError('Camera capture is not supported on this device.');return;}
  if(facing==='user'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
  if(blob)onCapture(new File([blob],'wayss-story-'+Date.now()+'.jpg',{type:'image/jpeg'}));
 }
 return <div className="story-camera-overlay">
  <div className="story-camera-top"><button onClick={onClose} aria-label="Close camera"><ArrowLeft/></button><b>WAYSS <span>STORY</span></b><button onClick={()=>{setFacing(v=>v==='user'?'environment':'user')}} aria-label="Switch camera"><FlipHorizontal/></button></div>
  <div className="story-camera-view">
   <video ref={videoRef} autoPlay playsInline muted className={facing==='user'?'selfie':''}/>
   {starting&&<div className="story-camera-message">Opening camera…</div>}
   {error&&<div className="story-camera-error"><Camera size={26}/><b>Camera unavailable</b><p>{error}</p><button onClick={()=>void start()}><RefreshCw size={15}/> Try again</button></div>}
  </div>
  <div className="story-camera-bottom">
   <button className="gallery-pick" onClick={onGallery}><ImagePlus/><span>Gallery</span></button>
   <button className="shutter" disabled={starting||!!error} onClick={()=>void capture()} aria-label="Take photo"><span/></button>
   <button className="camera-close-small" onClick={onClose}><X/></button>
  </div>
  <style jsx>{`
   .story-camera-overlay{position:fixed;inset:0;z-index:3100;background:#050609;color:#f5f5f7;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
   .story-camera-top{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 17px}.story-camera-top button,.camera-close-small{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;background:#ffffff16;color:#fff}.story-camera-top b{font-size:13px;letter-spacing:2px}.story-camera-top b span{color:#f32950}
   .story-camera-view{position:relative;flex:1;min-height:0;overflow:hidden;background:#11131a;display:grid;place-items:center}.story-camera-view video{width:100%;height:100%;object-fit:cover}.story-camera-view video.selfie{transform:scaleX(-1)}.story-camera-message,.story-camera-error{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#08090dd9;text-align:center;padding:28px}.story-camera-error p{max-width:290px;color:#aeb2bf;font-size:12px;line-height:1.6}.story-camera-error button{display:flex;align-items:center;gap:8px;border:1px solid #393b46;border-radius:10px;padding:10px 15px;background:#17181f;color:#fff}
   .story-camera-bottom{height:118px;flex:0 0 118px;display:flex;align-items:center;justify-content:space-around;padding:0 20px}.gallery-pick{display:grid;justify-items:center;gap:5px;border:0;background:transparent;color:#f5f5f7;font-size:10px}.gallery-pick svg{width:22px;height:22px}.shutter{width:72px;height:72px;display:grid;place-items:center;border:4px solid #fff;border-radius:50%;background:transparent}.shutter span{width:56px;height:56px;border-radius:50%;background:#f5f5f7}.shutter:disabled{opacity:.35}.camera-close-small{visibility:hidden}
  `}</style>
 </div>;
}
