import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';

const noStore={'Cache-Control':'no-store, max-age=0'};

export async function GET(request:NextRequest){
  const auth=request.headers.get('authorization')||'';
  const accessToken=auth.startsWith('Bearer ')?auth.slice(7):'';
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if(!accessToken||!supabaseUrl||!anonKey){
    return NextResponse.json({error:'Unauthorized'},{status:401,headers:noStore});
  }

  try{
    const verified=await fetch(supabaseUrl.replace(/\/$/,'')+'/auth/v1/user',{
      headers:{apikey:anonKey,Authorization:'Bearer '+accessToken},
      cache:'no-store',
      signal:AbortSignal.timeout(10000)
    });
    if(!verified.ok){
      return NextResponse.json({error:'Unauthorized'},{status:401,headers:noStore});
    }

    const apiToken=process.env.TURNIX_API_TOKEN;
    if(!apiToken){
      console.error('TURNIX_API_TOKEN is not configured');
      return NextResponse.json({error:'TURN relay is not configured'},{status:503,headers:noStore});
    }

    const forwardedFor=request.headers.get('x-forwarded-for');
    const clientIp=forwardedFor?.split(',')[0]?.trim();
    const turn=await fetch('https://turnix.io/api/v1/credentials/ice',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+apiToken,
        'Content-Type':'application/json',
        ...(clientIp?{'X-TURN-CLIENT-IP':clientIp}:{})
      },
      body:JSON.stringify({ttl:3600}),
      cache:'no-store',
      signal:AbortSignal.timeout(10000)
    });

    if(!turn.ok){
      const status=turn.status;
      // Never log or return the secret API token or upstream response body.
      console.error('Turnix credential request failed with status',status);
      return NextResponse.json(
        {error:status===429?'TURN usage limit reached':'TURN credentials unavailable'},
        {status:status===429?503:502,headers:noStore}
      );
    }

    const data=await turn.json();
    const iceServers=Array.isArray(data.iceServers)?data.iceServers.filter((server:any)=>server&&server.urls):[];
    if(!iceServers.length){
      return NextResponse.json({error:'TURN credentials unavailable'},{status:502,headers:noStore});
    }

    return NextResponse.json({iceServers,expiresAt:data.expiresAt||null},{headers:noStore});
  }catch(error:any){
    console.error('Could not request Turnix ICE credentials:',error?.name||'unknown error');
    return NextResponse.json({error:'Could not create TURN credentials'},{status:502,headers:noStore});
  }
}
