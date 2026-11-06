'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {ArrowLeft,ShieldCheck,Check,X} from 'lucide-react';
const db=supabase();
export default function AdminPage(){const router=useRouter();const [session,S]=useState<any>(null),[admin,A]=useState(false),[rows,R]=useState<any[]>([]),[notice,N]=useState(''),[busy,B]=useState(false);
useEffect(()=>{if(!db)return;db.auth.getSession().then(({data}:any)=>S(data.session));const {data:{subscription}}=db.auth.onAuthStateChange((_e:string,s:any)=>S(s));return()=>subscription.unsubscribe()},[]);
useEffect(()=>{if(!session)return;(async()=>{const {data,error}=await db.rpc('is_wayss_admin');if(error){N(error.message);return;}A(!!data);if(data){const {data:r,error:e}=await db.from('verification_requests').select('id,note,status,created_at,profiles!verification_requests_user_id_fkey(id,username,display_name,avatar_url,is_verified)').eq('status','pending').order('created_at');if(e)N(e.message);else R(r||[])}})()},[session]);
async function review(id:string,decision:'approved'|'rejected'){B(true);const {error}=await db.rpc('review_verification',{request_id:id,decision});B(false);if(error)N(error.message);else R(old=>old.filter(x=>x.id!==id))}
if(!db||!session)return <main className="setup">Log in with the WAYSS admin account.</main>;
if(!admin)return <main className="setup"><ShieldCheck/><h2>Admin access only</h2><p>This panel is restricted to the configured WAYSS admin account.</p><button className="primary" onClick={()=>router.push('/')}>Back to WAYSS</button></main>;
return <main className="app-shell"><header className="topbar"><button className="icon-btn" onClick={()=>router.push('/')}><ArrowLeft/></button><b>WAYSS Admin · @teamwayss</b></header><section className="panel side-panel" style={{marginTop:24,maxWidth:850}}><p className="eyebrow">MODERATION</p><h2>Verification requests</h2>{notice&&<p className="notice">{notice}</p>}{rows.length===0?<p className="muted">No pending requests.</p>:rows.map(r=><article key={r.id} style={{padding:'16px 0',borderTop:'1px solid var(--line)'}}><b>@{r.profiles?.username}</b><p className="muted">{r.note}</p><small className="muted">{new Date(r.created_at).toLocaleString()}</small><div style={{display:'flex',gap:10,marginTop:12}}><button className="primary" disabled={busy} onClick={()=>review(r.id,'approved')}><Check size={15}/> Approve</button><button className="icon-btn" disabled={busy} onClick={()=>review(r.id,'rejected')}><X size={15}/> Reject</button></div></article>)}</section></main>
}