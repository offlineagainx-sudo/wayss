'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import QuickCenter from '@/components/QuickCenter';
import ToggleSwitch from '@/components/ToggleSwitch';
import {ArrowLeft,MapPin,ShieldCheck,Save,EyeOff,Users,Clock,LocateFixed} from 'lucide-react';
const db=supabase();
type Friend={id:string;username:string;display_name:string;avatar_url:string|null;sharing:boolean};
export default function NearbyPrivacySettings(){
 const router=useRouter();
 const [session,S]=useState<any>(null),[allow,A]=useState(false),[sharing,SH]=useState(false),[ghost,GH]=useState(true),[duration,DU]=useState('60'),[friends,FR]=useState<Friend[]>([]),[busy,B]=useState(false),[notice,N]=useState('');
 useEffect(()=>{if(!db)return;let alive=true;db.auth.getSession().then(async({data}:any)=>{if(!alive)return;S(data.session);if(data.session)await load(data.session.user.id);});const {data:{subscription}}=db.auth.onAuthStateChange((_e:string,s:any)=>{S(s);if(s)void load(s.user.id)});return()=>{alive=false;subscription.unsubscribe();};},[]);
 async function load(uid:string){
  const {data:p,error}=await db.from('nearby_preferences').select('allow_on_demand_location,location_sharing_enabled,ghost_mode,location_share_duration_minutes').eq('user_id',uid).maybeSingle();
  if(error){N(error.message);return;}
  A(!!p?.allow_on_demand_location);SH(!!p?.location_sharing_enabled);GH(p?.ghost_mode!==false);DU(String(p?.location_share_duration_minutes??60));
  const {data:out}=await db.from('follows').select('follower_id,following_id').eq('follower_id',uid).eq('status','accepted');
  const {data:incoming}=await db.from('follows').select('follower_id,following_id').eq('following_id',uid).eq('status','accepted');
  const outgoing=new Set((out||[]).map((x:any)=>x.following_id));
  const mutual=(incoming||[]).map((x:any)=>x.follower_id).filter((id:string)=>outgoing.has(id));
  if(!mutual.length){FR([]);return;}
  const [{data:people},{data:shares}]=await Promise.all([
   db.from('profiles').select('id,username,display_name,avatar_url').in('id',mutual),
   db.from('nearby_location_shares').select('friend_id,expires_at').eq('owner_id',uid)
  ]);
  const now=Date.now(),active=new Set((shares||[]).filter((x:any)=>!x.expires_at||new Date(x.expires_at).getTime()>now).map((x:any)=>x.friend_id));
  FR((people||[]).map((x:any)=>({...x,sharing:active.has(x.id)})));
 }
 async function save(){
  if(!db||!session)return;B(true);
  const {error}=await db.from('nearby_preferences').upsert({user_id:session.user.id,allow_on_demand_location:allow,location_sharing_enabled:sharing,ghost_mode:ghost,location_share_duration_minutes:Number(duration),updated_at:new Date().toISOString()});
  if(!error){const expires=Number(duration)===0?null:new Date(Date.now()+Number(duration)*60000).toISOString();await db.from('nearby_location_shares').update({expires_at:expires}).eq('owner_id',session.user.id);if(!sharing||ghost)await db.from('nearby_live_locations').delete().eq('user_id',session.user.id);}
  N(error?.message||'Nearby privacy settings saved.');B(false);if(!error)await load(session.user.id);
 }
 async function toggleFriend(friend:Friend,enabled:boolean){
  if(!db||!session)return;
  if(enabled){
   const {error:prefError}=await db.from('nearby_preferences').upsert({user_id:session.user.id,location_sharing_enabled:true,ghost_mode:false,location_share_duration_minutes:Number(duration),updated_at:new Date().toISOString()});if(prefError){N(prefError.message);return;}SH(true);GH(false);
   const expires=Number(duration)===0?null:new Date(Date.now()+Number(duration)*60000).toISOString();
   const {error}=await db.from('nearby_location_shares').upsert({owner_id:session.user.id,friend_id:friend.id,expires_at:expires},{onConflict:'owner_id,friend_id'});
   if(error){N(error.message);return;}
  }else{
   const {error}=await db.from('nearby_location_shares').delete().eq('owner_id',session.user.id).eq('friend_id',friend.id);
   if(error){N(error.message);return;}
  }
  FR(old=>old.map(x=>x.id===friend.id?{...x,sharing:enabled}:x));
  N(enabled?'Location access granted to this connection.':'Location access revoked immediately.');
 }
 if(!db)return <main className="setup">Connect Supabase first.</main>;
 if(!session)return <main className="setup">Log in to manage Nearby privacy.</main>;
 return <main className="feature-shell"><header className="feature-top"><button className="icon-btn" onClick={()=>router.push('/nearby')}><ArrowLeft/></button><div><b>Nearby privacy</b><small>Your location stays under your control</small></div></header><section className="feature-content settings-content">
 <p className="eyebrow">LOCATION CONTROL</p><h1>Stay in control.</h1>
 <section className="panel settings-card"><h3><MapPin/> On-demand location</h3><label className="setting-row"><span><b>Allow device location when I tap Nearby</b><small>Off by default. Used only after you tap the current-location control to center the map and find public places. It does not enable background tracking.</small></span><ToggleSwitch checked={allow} onChange={A} label="Allow on-demand location"/></label></section>
 <section className="panel settings-card"><h3><ShieldCheck/> Live location sharing</h3><label className="setting-row"><span><b>Enable live location sharing</b><small>Only people you explicitly select below can see your location. Sharing is separate from Nearby discovery.</small></span><ToggleSwitch checked={sharing} onChange={SH} label="Enable live location sharing"/></label><label className="setting-row"><span><b>Ghost Mode</b><small>Hide your location from everyone immediately, even if you previously shared it.</small></span><ToggleSwitch checked={ghost} onChange={GH} label="Ghost Mode"/></label><label className="nearby-duration"><span><Clock size={16}/> Sharing duration</span><select value={duration} onChange={e=>DU(e.target.value)}><option value="15">15 minutes</option><option value="60">1 hour</option><option value="480">8 hours</option><option value="0">Until I turn it off</option></select></label>
 <div className="nearby-privacy-note"><EyeOff/><span><b>Sharing stays paused until saved</b><small>Live GPS updates run only while WAYSS Nearby is open in this browser. Mobile browsers may suspend updates in the background; this setting does not claim always-on tracking.</small></span></div>
 </section>
 <section className="panel settings-card"><h3><Users/> Choose who can see your location</h3><p className="muted">Only mutual accepted connections appear here. Turn on sharing and switch on individual people. You can revoke access at any time.</p>
 {friends.length?friends.map(friend=><label className="setting-row" key={friend.id}><span><b>{friend.display_name||'WAYSS member'}</b><small>@{friend.username}</small></span><ToggleSwitch checked={friend.sharing} onChange={v=>void toggleFriend(friend,v)} label={'Share location with @'+friend.username}/></label>):<p className="nearby-empty">No mutual connections yet. Location sharing will remain private.</p>}
 </section>
 <section className="panel settings-card"><h3><ShieldCheck/> Privacy promise</h3><ul className="nearby-privacy-list"><li>Location sharing is OFF by default.</li><li>Ghost Mode hides your location from all connections.</li><li>Strangers and one-way follows cannot see precise location.</li><li>Blocked accounts are excluded both ways.</li><li>No secret tracking or public GPS coordinates.</li></ul></section>
 {notice&&<p className="notice">{notice}</p>}<button className="primary" disabled={busy} onClick={save}><Save size={16}/>{busy?'Saving…':'Save privacy settings'}</button>
 <p className="muted">Background location is not enabled on the web. An Android app would need a separate, visible foreground-service permission flow and OS-level testing.</p>
 </section><QuickCenter/></main>;
}
