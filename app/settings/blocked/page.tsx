'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import QuickCenter from '@/components/QuickCenter';
import {ArrowLeft,ShieldOff,UserRound} from 'lucide-react';
const db=supabase();
export default function BlockedAccountsPage(){
 const router=useRouter();const [session,S]=useState<any>(null),[rows,R]=useState<any[]>([]),[notice,N]=useState(''),[busy,B]=useState(false);
 useEffect(()=>{if(!db)return;db.auth.getSession().then(({data}:any)=>{S(data.session);if(data.session)void load(data.session.user.id);});},[]);
 async function load(id:string){const {data,error}=await db.from('blocks').select('blocked_id,created_at').eq('blocker_id',id).order('created_at',{ascending:false});if(error){N(error.message);return;}const ids=(data||[]).map((x:any)=>x.blocked_id);const {data:people}=ids.length?await db.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]};R((data||[]).map((x:any)=>({...x,profile:(people||[]).find((p:any)=>p.id===x.blocked_id)})));}
 async function unblock(id:string){if(!session)return;B(true);const {error}=await db.from('blocks').delete().eq('blocker_id',session.user.id).eq('blocked_id',id);if(error)N(error.message);else{R(old=>old.filter(x=>x.blocked_id!==id));N('Account unblocked.');}B(false);}
 if(!db)return <main className="setup">Connect Supabase first.</main>;
 if(!session)return <main className="setup">Log in to manage blocked accounts.</main>;
 return <main className="feature-shell"><header className="feature-top"><button className="icon-btn" onClick={()=>router.push('/settings')}><ArrowLeft/></button><div><b>Blocked accounts</b><small>Your safety controls</small></div></header><section className="feature-content settings-content"><p className="eyebrow">PRIVACY & SAFETY</p><h1>Blocked accounts.</h1><p className="muted">Blocked accounts cannot interact with you through supported WAYSS features. Unblock only if you want to restore access.</p><section className="panel settings-card">{rows.length===0?<div className="empty"><ShieldOff/><h3>No blocked accounts</h3><p>Your blocked list is empty.</p></div>:rows.map(x=><div className="setting-row" key={x.blocked_id}><span style={{display:'flex',alignItems:'center',gap:10}}><span className="orbit-avatar">{x.profile?.avatar_url?<img src={x.profile.avatar_url} alt=""/>:<UserRound/>}</span><span><b>{x.profile?.display_name||x.profile?.username||'WAYSS account'}</b><small>@{x.profile?.username||'unknown'}</small></span></span><button className="secondary-action" disabled={busy} onClick={()=>void unblock(x.blocked_id)}>Unblock</button></div>)}</section>{notice&&<p className="notice">{notice}</p>}</section><QuickCenter/></main>;
}