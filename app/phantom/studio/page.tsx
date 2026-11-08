'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import QuickCenter from '@/components/QuickCenter';
import {ArrowLeft,Eye,ImagePlus,Lock,Save,ShieldCheck,KeyRound} from 'lucide-react';
const db=supabase();

export default function PhantomStudio(){
 const router=useRouter();
 const [session,S]=useState<any>(null),[profile,P]=useState<any>(null),[challenge,C]=useState<any>(null);
 const [mode,M]=useState<'code'|'puzzle'>('puzzle'),[answer,A]=useState(''),[hint,H]=useState(''),[clue,Q]=useState('');
 const [busy,B]=useState(false),[notice,N]=useState(''),[loaded,L]=useState(false),[editing,ED]=useState(false);
 useEffect(()=>{if(!db)return;db.auth.getSession().then(({data}:any)=>S(data.session));const {data:{subscription}}=db.auth.onAuthStateChange((_e:string,s:any)=>S(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session?.user?.id)void load();},[session?.user?.id]);
 async function load(){
  if(!db||!session)return;L(false);
  const {data:p}=await db.from('phantom_profiles').select('*').eq('owner_id',session.user.id).maybeSingle();P(p||null);
  const {data:c}=await db.from('phantom_challenges').select('*').eq('owner_id',session.user.id).maybeSingle();C(c||null);
  if(c){
   M(c.access_mode==='code'?'code':'puzzle');
   const {data:s}=await db.from('phantom_puzzle_stages').select('id,prompt,accepted_answers,instructions').eq('challenge_id',c.id).eq('stage_number',1).maybeSingle();
   if(s){Q(c.access_mode==='code'?(s.instructions||''):s.prompt||'');A((s.accepted_answers||[])[0]||'');const {data:h}=await db.from('phantom_hints').select('body').eq('stage_id',s.id).eq('hint_order',1).maybeSingle();H(h?.body||'');}
  }
  L(true);
 }
 async function save(){
  if(!db||!session)return;
  const username=(document.getElementById('phantom-username') as HTMLInputElement)?.value.trim();
  const display=(document.getElementById('phantom-display') as HTMLInputElement)?.value.trim()||'';
  const bio=(document.getElementById('phantom-bio') as HTMLTextAreaElement)?.value.trim()||'';
  const enabled=(document.getElementById('phantom-enabled') as HTMLInputElement)?.checked??true;
  if(!username||!/^[a-z0-9_.]{3,24}$/i.test(username)){N('Username must be 3–24 characters (letters, numbers, _ or .).');return;}
  if(!answer.trim()){N(mode==='code'?'Set an access code first.':'Add the correct answer first.');return;}
  if(mode==='puzzle'&&!clue.trim()){N('Write a short puzzle first.');return;}
  if(answer.trim().length>120||hint.length>500||clue.length>1000){N('Please shorten the answer, hint or clue.');return;}
  B(true);N('');
  let avatar_url=profile?.avatar_url||null,cover_url=profile?.cover_url||null;
  for(const [id,key] of [['phantom-avatar-file','avatar'],['phantom-cover-file','cover']] as const){
   const file=(document.getElementById(id) as HTMLInputElement)?.files?.[0];if(!file)continue;
   if(!file.type.startsWith('image/')||file.size>10*1024*1024){N('Profile images must be under 10 MB.');B(false);return;}
   const ext=file.name.split('.').pop()?.toLowerCase()||'jpg',path=session.user.id+'/identity/'+key+'-'+crypto.randomUUID()+'.'+ext;
   const {error}=await db.storage.from('phantom-media').upload(path,file,{contentType:file.type,upsert:false});
   if(error){N(error.message);B(false);return;}if(key==='avatar')avatar_url=path;else cover_url=path;
  }
  const {error:pe}=await db.from('phantom_profiles').upsert({owner_id:session.user.id,username,display_name:display||username,bio,avatar_url,cover_url,enabled},{onConflict:'owner_id'});
  if(pe){N(pe.message);B(false);return;}
  const {data:c,error:ce}=await db.from('phantom_challenges').upsert({
   owner_id:session.user.id,description:mode==='code'?'Enter the private access code.':'Solve this short puzzle to discover the hidden profile.',
   instructions:mode==='code'?'Enter the code set by the owner.':'Think about the clue, then submit your answer.',
   difficulty:'easy',attempt_limit:8,allow_retry:true,retry_cooldown_hours:1,
   single_stage:true,access_mode:mode,is_published:false
  },{onConflict:'owner_id'}).select().single();
  if(ce){N(ce.message);B(false);return;}
  const prompt=mode==='code'?'Enter the access code':clue.trim();
  const stageInstructions=mode==='code'?'This code was chosen by the profile owner.':'';
  const {data:stage,error:se}=await db.from('phantom_puzzle_stages').upsert({
   challenge_id:c.id,stage_number:1,puzzle_type:mode==='code'?'cipher':'logic',
   prompt,instructions:stageInstructions,accepted_answers:[answer.trim()],case_sensitive:mode==='code'
  },{onConflict:'challenge_id,stage_number'}).select('id').single();
  if(se||!stage){N(se?.message||'Could not save the access challenge.');B(false);return;}
  if(hint.trim()){
   const {error:he}=await db.from('phantom_hints').upsert({challenge_id:c.id,stage_id:stage.id,hint_order:1,body:hint.trim(),is_published:true},{onConflict:'stage_id,hint_order'});
   if(he){N(he.message);B(false);return;}
  }else{
   await db.from('phantom_hints').delete().eq('stage_id',stage.id).eq('hint_order',1);
  }
  const {error:resetError}=await db.rpc('phantom_reset_challenge_access');
  if(resetError){N(resetError.message);B(false);return;}
  if(enabled){
   const {error:pubError}=await db.rpc('phantom_publish_challenge',{p_published:true});
   if(pubError){N(pubError.message);B(false);return;}
   N('PHANTOM saved and published. Anyone with the clue or code can request access.');
  }else{
   await db.rpc('phantom_publish_challenge',{p_published:false});
   N('PHANTOM saved and turned off.');
  }
  B(false);await load();ED(false);
 }
 async function deletePhantom(){
  if(!db||!session||!profile)return;
  if(!window.confirm('Delete your PHANTOM identity, its challenge and all PHANTOM posts, stories and Flux? This cannot be undone.'))return;
  B(true);N('');
  const [posts,stories,flux]=await Promise.all([db.from('phantom_posts').select('media_path').eq('owner_id',session.user.id),db.from('phantom_stories').select('media_path').eq('owner_id',session.user.id),db.from('phantom_flux').select('media_path').eq('owner_id',session.user.id)]);
  const paths=[profile.avatar_url,profile.cover_url,...(posts.data||[]).map((x:any)=>x.media_path),...(stories.data||[]).map((x:any)=>x.media_path),...(flux.data||[]).map((x:any)=>x.media_path)].filter(Boolean);
  const {error}=await db.from('phantom_profiles').delete().eq('owner_id',session.user.id);
  if(error){N(error.message);B(false);return;}
  if(paths.length)await db.storage.from('phantom-media').remove(paths);
  P(null);C(null);ED(false);N('Your PHANTOM identity has been deleted.');B(false);
 }
 if(!db)return <main className="setup">Connect Supabase first.</main>;
 if(!session)return <main className="setup"><h2>Sign in to create your PHANTOM</h2><button className="primary" onClick={()=>router.push('/')}>Go to WAYSS</button></main>;
 if(!loaded)return <main className="setup">Loading PHANTOM…</main>;
 return <main className="feature-shell">
  <header className="feature-top"><button className="icon-btn" onClick={()=>router.push('/')}><ArrowLeft/></button><div><b>PHANTOM</b><small>Your second profile</small></div><span className="phantom-mark">PRIVATE</span></header>
  <section className="feature-content phantom-studio">
   {profile&&!editing?<><p className="eyebrow">YOUR SECOND IDENTITY</p><h1>My Phantom.</h1><section className="panel settings-card"><h3><ShieldCheck size={18}/> @{profile.username}</h3><p className="muted">{profile.display_name||profile.username} · {profile.enabled?"Visible to challengers":"Hidden from challengers"}</p><p className="muted">{profile.bio||"No Phantom bio yet."}</p><div className="phantom-manage-actions"><button className="primary" onClick={()=>ED(true)}><Save size={15}/> Edit PHANTOM</button><button className="secondary-action" disabled={busy} onClick={()=>void deletePhantom()}><Lock size={15}/> Delete PHANTOM</button><button className="secondary-action" onClick={()=>router.push("/phantom/profile/"+session.user.id)}><Eye size={15}/> View my PHANTOM profile</button></div></section>{notice&&<p className="notice">{notice}</p>}</>:<>
   <p className="eyebrow">TWO IDENTITIES. ONE MYSTERY.</p>
   <h1>Create your Phantom.</h1>
   <p className="muted">Set it up just like a profile. Others need your code or the answer to your puzzle before they can see it.</p>
   <section className="panel settings-card">
    <h3><ShieldCheck size={18}/> Profile details</h3>
    <label>Phantom username<input id="phantom-username" defaultValue={profile?.username||''} placeholder="your_hidden_name" maxLength={24}/></label>
    <label>Display name<input id="phantom-display" defaultValue={profile?.display_name||''} placeholder="Display name" maxLength={50}/></label>
    <label>Bio<textarea id="phantom-bio" defaultValue={profile?.bio||''} placeholder="A little about this identity…" maxLength={300}/></label>
    <div className="phantom-form-grid"><label><ImagePlus size={15}/> Profile photo<input id="phantom-avatar-file" type="file" accept="image/jpeg,image/png,image/webp"/></label><label><ImagePlus size={15}/> Cover photo<input id="phantom-cover-file" type="file" accept="image/jpeg,image/png,image/webp"/></label></div>
    <label className="setting-row"><span><b>Show my Phantom to challengers</b><small>Turn this off whenever you want to hide it.</small></span><input id="phantom-enabled" type="checkbox" defaultChecked={profile?.enabled??true}/></label>
   </section>
   <section className="panel settings-card">
    <h3><Lock size={18}/> How should people unlock it?</h3>
    <div className="phantom-mode-picker">
     <button type="button" className={mode==='puzzle'?'active':''} onClick={()=>M('puzzle')}><ShieldCheck size={17}/><b>Puzzle</b><small>Give them a clue and a correct answer.</small></button>
     <button type="button" className={mode==='code'?'active':''} onClick={()=>M('code')}><KeyRound size={17}/><b>Access code</b><small>Only people who know your code can enter.</small></button>
    </div>
    {mode==='puzzle'?<label>Your clue<textarea value={clue} onChange={e=>Q(e.target.value)} maxLength={1000} placeholder="Write one short riddle or clue…"/></label>:<p className="muted">Choose a code that you can share with the people you want to let in.</p>}
    <label>{mode==='code'?'Your access code':'Correct answer'}<input type="password" value={answer} onChange={e=>A(e.target.value)} maxLength={120} autoComplete="new-password" placeholder={mode==='code'?'Set your private code':'The answer to your clue'}/></label>
    <label>Hint (optional)<input value={hint} onChange={e=>H(e.target.value)} maxLength={500} placeholder="A small hint to help them…"/></label>
    <p className="muted">Your answer/code stays private and is checked securely. People get up to 8 tries.</p>
   </section>
   <button className="primary full" disabled={busy} onClick={()=>void save()}><Save size={16}/>{busy?'Saving…':'Save PHANTOM'}</button>
   {profile&&<button className="secondary-action full" onClick={()=>router.push('/phantom/profile/'+session.user.id)}><Eye size={16}/> View my Phantom profile</button>}
   {challenge?.is_published&&<p className="notice">Your Phantom is published.</p>}
   {profile&&editing&&<button className="secondary-action full" onClick={()=>ED(false)}>Cancel editing</button>}
   {notice&&<p className="notice">{notice}</p>}</>}
  </section><QuickCenter/>
 </main>;
}
