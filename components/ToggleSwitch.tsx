'use client';
type Props={checked:boolean;onChange:(checked:boolean)=>void;label?:string;disabled?:boolean;name?:string};
export default function ToggleSwitch({checked,onChange,label,disabled=false,name}:Props){
 return <button type="button" role="switch" aria-checked={checked} aria-label={label||name||'Toggle setting'} disabled={disabled} className={'wayss-switch '+(checked?'is-on':'')} onClick={()=>onChange(!checked)}><span className="wayss-switch-thumb"/></button>;
}