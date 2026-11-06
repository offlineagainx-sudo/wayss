'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import {ArrowLeft,Lock} from 'lucide-react';
const db=supabase();
export default function ResetPasswordPage(){const router=useRouter();const [password,P]=useState(''),[confirm,C]=useState(''),[session,S]=useState<any>(null),[notice,N]=useState(''),[busy,B]=useState(false);
useEffect(()=>{db.auth.getSession().then(({data}:any)=>S(data.session))},[]);
async function save(e:React.FormEvent){e.preventDefault();if(password.length<8||password!==confirm){N(password!==confirm?'Passwords do not match.':'Use at least 8 characters.');return;}B(true);const {error}=await db.auth.updateUser({password});N(error?.message||'Your password has been updated.');B(false);if(!error)setTimeout(()=>router.push('/'),1000)}
return <main className="auth-shell"><section className="auth-card"><button className="icon-btn" onClick={()=>router.push('/')}><ArrowLeft/></button><div className="brand">WAYS<span>S</span></div><Lock size={28}/><h1>Reset password</h1>{!session?<p className="muted">Open the password reset link from your email first.</p>:<form className="auth-form" onSubmit={save}><input type="password" placeholder="New password" value={password} onChange={e=>P(e.target.value)} minLength={8} required/><input type="password" placeholder="Confirm new password" value={confirm} onChange={e=>C(e.target.value)} minLength={8} required/><button className="primary full" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>}{notice&&<p className="notice">{notice}</p>}</section></main>}
