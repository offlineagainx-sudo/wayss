'use client';
import {useEffect} from 'react';
export default function AppearanceProvider({children}:{children:React.ReactNode}){
 useEffect(()=>{
  const apply=()=>{
   try{
    const accent=localStorage.getItem('wayss-accent-v1')||'#F32950';
    const theme=localStorage.getItem('wayss-theme-v1')||'dark';
    const raw=localStorage.getItem('wayss-ui-prefs-v1');
    const prefs=raw?JSON.parse(raw):{};
    const root=document.documentElement;
    root.dataset.theme=theme==='light'?'light':'dark';
    root.style.setProperty('--pink',accent);
    root.dataset.reducedMotion=String(!!prefs.reducedMotion);
    root.dataset.compact=String(!!prefs.compact);
   }catch{}
  };
  apply();
  window.addEventListener('wayss-appearance-change',apply);
  window.addEventListener('storage',apply);
  return()=>{window.removeEventListener('wayss-appearance-change',apply);window.removeEventListener('storage',apply)};
 },[]);
 return <>{children}</>;
}
