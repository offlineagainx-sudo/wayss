import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
  const auth=request.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!token||!supabaseUrl||!anonKey){
    return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  try{
    const verified=await fetch(supabaseUrl.replace(/\/$/,'')+'/auth/v1/user',{
      headers:{apikey:anonKey,Authorization:'Bearer '+token},
      cache:'no-store'
    });
    if(!verified.ok)return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
    const keyId=process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken=process.env.CLOUDFLARE_TURN_API_TOKEN;
    if(!keyId||!apiToken){
      return NextResponse.json({error:'TURN is not configured'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
    const turn=await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(keyId)+'/credentials/generate-ice-servers',{
      method:'POST',
      headers:{Authorization:'Bearer '+apiToken,'Content-Type':'application/json'},
      body:JSON.stringify({ttl:14400}),
      cache:'no-store'
    });
    if(!turn.ok){
      return NextResponse.json({error:'TURN credentials unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});
    }
    const data=await turn.json();
    const iceServers=Array.isArray(data.iceServers)?data.iceServers.map((server:any)=>({
      ...server,
      urls:Array.isArray(server.urls)?server.urls.filter((url:string)=>!url.includes(':53')):server.urls
    })).filter((server:any)=>server.urls?.length):[];
    return NextResponse.json({iceServers},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch{
    return NextResponse.json({error:'Could not create TURN credentials'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
