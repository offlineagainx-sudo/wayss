'use client';

export default function DefaultAvatar({className=''}:{className?:string}){
  return <span className={'wayss-default-avatar '+className} aria-label="Default profile picture" role="img">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="49" className="wayss-avatar-bg"/>
      <circle cx="50" cy="36" r="16" className="wayss-avatar-person"/>
      <path d="M15 91c2-22 16-34 35-34s33 12 35 34c-9 6-21 9-35 9S24 97 15 91Z" className="wayss-avatar-person"/>
      <circle cx="50" cy="50" r="48.5" className="wayss-avatar-outline"/>
    </svg>
  </span>
}
