const RETENTION = 43200000;
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
function assert(ok) { if (!ok) throw new Error('Invalid payload'); }
function keys(v, allowed) { assert(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k))); }
function text(v, max=80) { assert(typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f]/.test(v)); return v; }
function point(p, now, encounter=false, client=false) {
  keys(p, encounter ? ['id','name','identity','area','position','relationship','firstSeenAt','lastSeenAt'] : client ? ['id','name','role','position','lastSeenAt'] : ['id','name','identity','position','relationship','lastSeenAt','observed']);
  text(p.id); text(p.name,40);
  assert(Array.isArray(p.position) && p.position.length===3 && p.position.every((v,i)=>integer(v,0,i===2?3:65535)));
  assert(integer(p.lastSeenAt,now-RETENTION,now+2000));
  if(client) assert(['LEADER','FOLLOWER','OFF'].includes(p.role));
  else { text(p.identity,40); assert(['friend','clan','other'].includes(p.relationship)); }
  if(encounter) { text(p.area); assert(integer(p.firstSeenAt,0,p.lastSeenAt)); }
  else if(!client) assert(typeof p.observed==='boolean');
  return p;
}
export function validate(body, now) {
  keys(body,['capturedAt','players','clients','encounters','removed']);
  assert(integer(body.capturedAt,now-120000,now+2000));
  assert(Array.isArray(body.players) && body.players.length<=4096 && Array.isArray(body.clients) && body.clients.length<=64);
  assert(Array.isArray(body.encounters) && body.encounters.length<=20 && Array.isArray(body.removed) && body.removed.length<=20);
  body.players.forEach(p=>point(p,now)); body.clients.forEach(p=>point(p,now,false,true));
  body.encounters.forEach(p=>point(p,now,true)); body.removed.forEach(id=>text(id));
  return body;
}
function reply(data,status=200) { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}}); }
async function authorized(request, secret) {
  if(!secret || request.headers.get('Origin')) return false;
  const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([hash(request.headers.get('Authorization')||''),hash('Bearer '+secret)]);
  return a.reduce((d,v,i)=>d|(v^b[i]),0)===0;
}
function windowMs(url) {
  const q=url.searchParams;
  assert([...q.keys()].every(k=>['windowSeconds','offset'].includes(k)) && [...new Set(q.keys())].every(k=>q.getAll(k).length===1));
  const seconds=Number(q.get('windowSeconds')||30); assert(integer(seconds,1,43200)); return seconds*1000;
}
function areaAt([x,y]) {
  if(x>=3000&&x<=3100&&y>=10270&&y<=10370)return 'aquanite';
  if(x>=3200&&x<=3280&&y>=10300&&y<=10400)return 'scorpia';
  if(x>=2500&&x<=2570&&y>=4670&&y<=4750)return 'mage-bank';
  return y>=6400?`underground:${Math.floor(x/64)}:${Math.floor(y/64)}`:'surface';
}
function encounter(row) { return {id:row.id,name:row.name,identity:row.identity,area:row.area,position:[row.x,row.y,row.plane],relationship:row.relationship,firstSeenAt:row.first,lastSeenAt:row.last}; }
export default {
  async fetch(request,env) {
    const url=new URL(request.url), now=Date.now();
    try {
      if(request.method==='POST' && url.pathname==='/v1/publish') {
        if(!await authorized(request,env.UPLOAD_TOKEN)) return reply({error:'Unauthorized'},401);
        const length=Number(request.headers.get('Content-Length'));
        if(length>1048576) return reply({error:'Payload too large'},413);
        const reader=request.body?.getReader(); if(!reader)return reply({error:'Empty payload'},400);
        let size=0;const chunks=[];
        for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();return reply({error:'Payload too large'},413);}chunks.push(value);}
        const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
        const b=validate(JSON.parse(new TextDecoder().decode(bytes)),now);
        const last=await env.DB.prepare('SELECT captured FROM feed WHERE id=1').first();
        if(last && b.capturedAt<last.captured)return reply({error:'Stale upload'},409);
        const commands=[env.DB.prepare('INSERT INTO feed VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET captured=excluded.captured,snapshot=excluded.snapshot WHERE excluded.captured>=feed.captured').bind(b.capturedAt,JSON.stringify({players:b.players,clients:b.clients}))];
        for(const p of b.encounters)commands.push(env.DB.prepare('INSERT INTO encounters VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,identity=excluded.identity,area=excluded.area,x=excluded.x,y=excluded.y,plane=excluded.plane,relationship=excluded.relationship,first=excluded.first,last=excluded.last WHERE excluded.last>=encounters.last').bind(p.id,p.name,p.identity,p.area,...p.position,p.relationship,Math.max(now-RETENTION,p.firstSeenAt),p.lastSeenAt));
        for(const id of b.removed)commands.push(env.DB.prepare('DELETE FROM encounters WHERE id=?').bind(id));
        commands.push(env.DB.prepare('DELETE FROM encounters WHERE last<?').bind(now-RETENTION));
        await env.DB.batch(commands);
        return reply({accepted:true,serverNow:now});
      }
      if(request.method!=='GET')return reply({error:'Not found'},404);
      if(url.pathname==='/health')return reply({service:'SWARM_PUBLIC_MAP',readOnly:true});
      if(!['/v1/state','/v1/history','/v1/hotspots'].includes(url.pathname))return reply({error:'Not found'},404);
      const window=windowMs(url),start=now-window;
      if(url.pathname==='/v1/history') {
        const offset=Number(url.searchParams.get('offset')||0);assert(integer(offset,0,10000000));
        const {results}=await env.DB.prepare('SELECT * FROM encounters WHERE last>=? AND last<=? ORDER BY last DESC,id LIMIT 501 OFFSET ?').bind(start,now,offset).all();
        return reply({serverNow:now,encounters:results.slice(0,500).map(encounter),nextOffset:results.length>500?offset+500:null});
      }
      if(url.pathname==='/v1/hotspots') {
        const {results}=await env.DB.prepare('SELECT (x/8)*8 AS x,(y/8)*8 AS y,plane,COUNT(DISTINCT identity) AS uniquePlayers,COUNT(*) AS encounters FROM encounters WHERE last>=? AND last<=? GROUP BY x/8,y/8,plane').bind(start,now).all();
        return reply({serverNow:now,cells:results.map(p=>({position:[p.x,p.y,p.plane],uniquePlayers:p.uniquePlayers,encounters:p.encounters,cellTiles:8}))});
      }
      const saved=await env.DB.prepare('SELECT * FROM feed WHERE id=1').first();
      const online=Boolean(saved && now-saved.captured<10000);
      const live=saved?JSON.parse(saved.snapshot):{players:[],clients:[]};
      const {results}=await env.DB.prepare('SELECT * FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY identity,area,plane ORDER BY last DESC,id DESC) AS n FROM encounters WHERE last>=? AND last<=?) WHERE n=1 ORDER BY last DESC LIMIT 5001').bind(start,now).all();
      const players=results.slice(0,5000).map(p=>({...encounter(p),observed:false,expiresAt:p.last+window}));
      for(const p of live.players)if(p.lastSeenAt>=start && p.lastSeenAt<=now+2000){
        // Hide the saved summary if live reports already represent that name and area.
        for(let i=players.length-1;i>=0;i--)if(players[i].firstSeenAt!==undefined && players[i].identity===p.identity && players[i].position[2]===p.position[2] && players[i].area===areaAt(p.position))players.splice(i,1);
        players.push({...p,observed:online&&p.observed&&now-p.lastSeenAt<4000,expiresAt:p.lastSeenAt+window});
      }
      const clients=online?live.clients.filter(p=>now-p.lastSeenAt<5000):[];
      return reply({serverNow:now,online,updatedAt:saved?.captured||null,players,clients,retentionSeconds:43200,sessionGapSeconds:300,partial:results.length>5000});
    } catch(error) { return reply({error:error.message==='Invalid payload' || error instanceof SyntaxError?'Invalid request':'Service unavailable'},error.message==='Invalid payload'||error instanceof SyntaxError?400:503); }
  },
  async scheduled(_event,env) { await env.DB.prepare('DELETE FROM encounters WHERE last<?').bind(Date.now()-RETENTION).run(); }
};
