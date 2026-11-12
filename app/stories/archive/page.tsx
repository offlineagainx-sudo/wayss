'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import QuickCenter from '@/components/QuickCenter';
import {ArrowLeft,Archive,Trash2,RotateCcw,Image as ImageIcon,Video} from 'lucide-react';
const db=supabase();
type Item={id:string;media_url:string;media_path:string|null;media_type:string;caption:string|null;created_at:string;expires_at:string};
export default function StoryArchivePage(){
 const router=useRouter();const [session,S]=useState<any>(null),[ready,R]=useState(false),[items,I]=useState<Item[]>([]),[busy,B]=useState(false),[notice,N]=useState('');
 useEffect(()=>{if(!db)return;db.auth.getSession().then(({data}:any)=>{S(data.session);R(true)});const {data:{subscription}}=db.auth.onAuthStateChange((_e:string,s:any)=>S(s));return()=>subscription.unsubscribe()},[]);
 async function load(){if(!db||!session?.user)return;B(true);const now=new Date().toISOString();await db.from('stories').update({archived:true}).eq('user_id',session.user.id).eq('archived',false).lte('expires_at',now);const {data,error}=await db.from('stories').select('id,media_url,media_path,media_type,caption,created_at,expires_at').eq('user_id',session.user.id).eq('archived',true).order('created_at',{ascending:false}).limit(100);if(error)N(error.message);const rows=(data||[]) as Item[];const signed=await Promise.all(rows.map(async x=>{if(!x.media_path)return x;const {data}=await db!.storage.from('wayss-media').createSignedUrl(x.media_path,3600);return data?.signedUrl?{...x,media_url:data.signedUrl}:x}));I(signed);B(false)}
 useEffect(()=>{if(session?.user)void load()},[session]);
 async function restore(x:Item){if(!db||!session?.user)return;B(true);const {error}=await db.from('stories').update({archived:false,expires_at:new Date(Date.now()+86400000).toISOString()}).eq('id',x.id).eq('user_id',session.user.id);if(error)N(error.message);else{N('Story restored for 24 hours.');await load()}B(false)}
 async function remove(x:Item){if(!db||!session?.user||!window.confirm('Delete this archived story permanently?'))return;B(true);const {error}=await db.from('stories').delete().eq('id',x.id).eq('user_id',session.user.id);if(error)N(error.message);else I(old=>old.filter(y=>y.id!==x.id));B(false)}
 if(!db)return <main className="setup">Connect your WAYSS database first.</main>;
 if(!ready)return <main className="setup">Loading Story Archive…</main>;
 if(!session)return <main className="setup">Log in to view your archive.</main>;
 return <main className="feature-shell"><header className="feature-top"><button className="icon-btn" onClick={()=>router.back()}><ArrowLeft/></button><div><b>Story Archive</b><small>Your expired stories, private to you</small></div></header><section className="feature-content"><div className="panel" style={{padding:16,marginBottom:16}}><Archive color="#F32950"/><p>Expired stories are moved here when the archive is opened. Only you can view and restore them.</p></div>{busy&&items.length===0?<p className="muted">Loading archive…</p>:items.length===0?<div className="empty panel"><ImageIcon/><h2>No archived stories yet</h2><p>Stories you publish will appear here after they expire.</p></div>:<div className="story-archive-grid">{items.map(x=><article className="panel" key={x.id}><div className="story-archive-media">{x.media_type==='video'?<video src={x.media_url} muted playsInline/>:<img src={x.media_url} alt="Archived story"/>}</div><div className="story-archive-meta"><b>{new Date(x.created_at).toLocaleDateString()}</b><small>{x.caption||'Story'}</small><div><button className="secondary-action" disabled={busy} onClick={()=>void restore(x)}><RotateCcw size={14}/> Restore</button><button className="icon-btn" disabled={busy} onClick={()=>void remove(x)} aria-label="Delete"><Trash2 size={15}/></button></div></div></article>)}</div>}{notice&&<p className="notice">{notice}</p>}</section><QuickCenter/></main>;
}
