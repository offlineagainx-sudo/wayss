'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import QuickCenter from '@/components/QuickCenter';
import {ArrowLeft,Search,UserRound,Shield,Bell,SlidersHorizontal,Monitor,MessageCircle,Film,Activity,LifeBuoy,Settings2,ChevronRight,Lock,Bookmark,Compass,Users,Eye,Database} from 'lucide-react';
const db=supabase();
const groups=[
 {id:'account',title:'Accounts Center',desc:'Personal details, password and account access.',icon:UserRound,keywords:'profile username email phone birthday password security login sessions verification export deactivate'},
 {id:'activity',title:'Your Activity',desc:'Your posts, likes, saved content and account activity.',icon:Activity,keywords:'posts reels comments likes saved archived recently deleted search history time spent'},
 {id:'notifications',title:'Notifications',desc:'Choose which updates WAYSS can send you.',icon:Bell,keywords:'push messages sound followers posts stories quiet pause alerts'},
 {id:'privacy',title:'Privacy',desc:'Manage visibility, safety and personal information.',icon:Shield,keywords:'private blocked restricted hidden words activity status read receipts nearby location'},
 {id:'interactions',title:'Interactions & Messages',desc:'Control how people can reach and interact with you.',icon:MessageCircle,keywords:'message requests group chats story replies mentions tags comments typing read receipts'},
 {id:'content',title:'Content Preferences',desc:'Manage your feed and content experience.',icon:Compass,keywords:'suggested sensitive interested not interested favorites following muted reels language captions'},
 {id:'app',title:'App Experience',desc:'Appearance, accessibility and device preferences.',icon:Monitor,keywords:'theme language media quality data saver autoplay upload accessibility text size motion permissions cache'},
 {id:'flux',title:'Flux Settings',desc:'Video playback and viewing preferences.',icon:Film,keywords:'autoplay quality data saver loop sound playback'},
 {id:'messaging',title:'Messaging Settings',desc:'Chat appearance, privacy and media preferences.',icon:MessageCircle,keywords:'chat theme background typing indicators read receipts online status notifications auto download'},
 {id:'navigation',title:'Navigation Customization',desc:'Customize the WAYSS navigation and preview changes live.',icon:SlidersHorizontal,keywords:'quick center classic collapsed expanded duration auto collapse animation speed position haptic labels'},
 {id:'appearance',title:'Appearance Settings',desc:'Theme, accent color, motion and interface density.',icon:Settings2,keywords:'dark light system accent color animation glass background reduce motion text size'},
 {id:'help',title:'Help & Support',desc:'WAYSS information and support resources.',icon:LifeBuoy,keywords:'help center report problem account status support privacy terms about version'}
];
export default function SettingsPage(){
 const router=useRouter();const [query,Q]=useState('');const [session,S]=useState<any>(null);const [profile,P]=useState<any>(null);
 useEffect(()=>{if(!db)return;db.auth.getSession().then(async({data}:any)=>{S(data.session);if(data.session){const {data:p}=await db.from('profiles').select('username,display_name,avatar_url').eq('id',data.session.user.id).maybeSingle();P(p);}});},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return groups.filter(g=>!q||[g.title,g.desc,g.keywords].join(' ').toLowerCase().includes(q));},[query]);
 return <main className="feature-shell settings-hub"><header className="feature-top"><button className="icon-btn" onClick={()=>router.push('/profile')} aria-label="Back"><ArrowLeft/></button><div><b>Settings and Activity</b><small>One place for your WAYSS controls</small></div></header><section className="feature-content settings-content">
  <div className="settings-hero"><div><p className="eyebrow">WAYSS / ACCOUNT</p><h1>Settings & activity</h1><p>Make WAYSS work the way you want.</p></div><span className="settings-hero-mark"><SlidersHorizontal/></span></div>
  <div className="settings-account-strip">{profile?.avatar_url?<img className="settings-account-avatar-img" src={profile.avatar_url} alt="Profile"/>:<span className="settings-account-avatar"><UserRound/></span>}<span><b>{profile?.display_name||profile?.username||session?.user?.user_metadata?.username||'Your WAYSS account'}</b><small>{profile?.username?'@'+profile.username:session?.user?.email||'Sign in to sync settings'}</small></span><span className="settings-account-tag">ACCOUNT</span></div>
  <label className="settings-search"><Search/><input value={query} onChange={e=>Q(e.target.value)} placeholder="Search settings and activity…" aria-label="Search settings"/>{query&&<button type="button" onClick={()=>Q('')} aria-label="Clear search">×</button>}</label>
  <div className="settings-category-grid">{filtered.map(g=>{const Icon=g.icon;return <button className="settings-category-card" key={g.id} onClick={()=>router.push('/settings/'+g.id)}><span className="settings-category-icon"><Icon/></span><span className="settings-category-copy"><b>{g.title}</b><small>{g.desc}</small></span><ChevronRight className="settings-category-arrow"/></button>;})}</div>
  {filtered.length===0&&<div className="settings-search-empty"><Search/><b>No matching settings</b><p>Try another keyword such as privacy, Flux or navigation.</p></div>}
  <p className="settings-hub-footnote">Settings that affect your account are saved to your WAYSS profile. Device-only appearance preferences are also remembered on this device.</p>
 </section><QuickCenter/></main>;
}
