'use client';
import React from 'react';

export type AvatarConfig = {
  skin?: string; hair?: string; hairStyle?: string; eyes?: string;
  outfit?: string; background?: string; accessory?: string;
};
type ProfileLike = { username?: string|null; display_name?: string|null; avatar_url?: string|null; avatar_config?: AvatarConfig|null };
const palettes:Record<string,string>={warm:'#E8AD83',light:'#F4C9A6',tan:'#B97850',deep:'#75452F',rose:'#D99485'};
const hairColors:Record<string,string>={espresso:'#2B1B1A',black:'#17171D',chestnut:'#70402E',blonde:'#D7AE57',silver:'#A6A8B4',pink:'#D66C9A'};
const outfits:Record<string,string>={violet:'#7C5CE7',coral:'#F07878',mint:'#43A88F',blue:'#4779C8',black:'#282A36',sun:'#E4A83E'};
const bgs:Record<string,string>={night:'#202236',lavender:'#C8B8F3',peach:'#F4C7B5',mint:'#B8E2D6',sky:'#B8D9F1',cream:'#F0E6D4'};
export function AvatarIllustration({config={},label='WAYSS avatar'}:{config?:AvatarConfig|null;label?:string}) {
 const skin=palettes[config?.skin||'warm']||palettes.warm, hair=hairColors[config?.hair||'espresso']||hairColors.espresso, outfit=outfits[config?.outfit||'violet']||outfits.violet, bg=bgs[config?.background||'lavender']||bgs.lavender;
 const style=config?.hairStyle||'soft', eyes=config?.eyes||'brown';
 return <svg viewBox="0 0 120 120" role="img" aria-label={label} className="wayss-avatar-art">
  <defs><clipPath id="avatarClip"><circle cx="60" cy="60" r="59"/></clipPath></defs>
  <g clipPath="url(#avatarClip)">
   <rect width="120" height="120" fill={bg}/>
   <circle cx="17" cy="22" r="13" fill="#fff" opacity=".16"/><circle cx="104" cy="38" r="18" fill="#fff" opacity=".12"/>
   <path d="M13 122c4-24 19-35 47-35s43 11 47 35" fill={outfit}/>
   <path d="M43 83h34l7 19H36z" fill={skin}/>
   <ellipse cx="60" cy="54" rx="31" ry="36" fill={skin}/>
   {style==='curly'&&<g fill={hair}><circle cx="34" cy="34" r="12"/><circle cx="43" cy="22" r="12"/><circle cx="58" cy="18" r="13"/><circle cx="74" cy="22" r="13"/><circle cx="86" cy="35" r="12"/><circle cx="31" cy="51" r="8"/><circle cx="89" cy="52" r="8"/></g>}
   {style==='crop'&&<path d="M29 51c-2-27 11-39 31-39 23 0 34 16 29 39l-8-13c-12 6-27 7-44 1z" fill={hair}/>}
   {style==='long'&&<path d="M28 47c-5-28 9-39 32-39s38 13 32 42l-5 42-13-5 1-39c-8 6-25 7-39 0l1 42-13 2z" fill={hair}/>}
   {style==='soft'&&<path d="M28 52c-4-26 8-40 32-40 25 0 37 16 31 42-6-9-11-17-17-23-12 9-27 13-44 12z" fill={hair}/>}
   <path d="M45 54q5-4 10 0M66 54q5-4 10 0" fill="none" stroke={eyes==='green'?'#4D8767':eyes==='blue'?'#527DAA':'#4A3028'} strokeWidth="2.8" strokeLinecap="round"/>
   <ellipse cx="52" cy="59" rx="2" ry="3" fill="#24212A"/><ellipse cx="72" cy="59" rx="2" ry="3" fill="#24212A"/>
   <path d="M59 61q-3 7 1 8" fill="none" stroke="#B97868" strokeWidth="1.8" strokeLinecap="round"/>
   <path d="M51 75q9 7 18 0" fill="none" stroke="#9D4E55" strokeWidth="2.4" strokeLinecap="round"/>
   {config?.accessory==='glasses'&&<g fill="none" stroke="#272735" strokeWidth="2.4"><rect x="40" y="51" width="19" height="14" rx="5"/><rect x="62" y="51" width="19" height="14" rx="5"/><path d="M59 57h3M40 56l-5-2M81 56l5-2"/></g>}
   {config?.accessory==='cap'&&<path d="M29 36q2-25 31-25 28 0 32 25-30 10-63 0M56 36q27-3 48 4" fill={outfit} stroke="#fff" strokeOpacity=".25" strokeWidth="2"/>}
   {config?.accessory==='earrings'&&<g fill="none" stroke="#F7D98B" strokeWidth="3"><circle cx="29" cy="66" r="4"/><circle cx="91" cy="66" r="4"/></g>}
  </g>
 </svg>;
}
export default function AvatarView({p,size='md',className=''}:{p?:ProfileLike|null;size?:string;className?:string}) {
 if(p?.avatar_config) return <span className={'avatar avatar-illustrated '+size+' '+className}><AvatarIllustration config={p.avatar_config}/></span>;
 return p?.avatar_url ? <img className={'avatar '+size+' '+className} src={p.avatar_url} alt=""/> : <span className={'avatar fallback '+size+' '+className}>{(p?.display_name||p?.username||'W').slice(0,1).toUpperCase()}</span>;
}
