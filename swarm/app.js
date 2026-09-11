(() => {
  'use strict';
  const $=id=>document.getElementById(id),chart=$('map'),W=960,H=600;
  const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const svg=(tag,attrs={},text)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
  const colors={LEADER:'#ffb781',FOLLOWER:'#7fbaf0',OFF:'#aab8b0',friend:'#75df8b',clan:'#c897ff',other:'#ff7b7b'};
  let map=null,state=null,cells=[],anchor=performance.now(),camera={x:3200,y:3700,span:700},selected=null,drag=null,nextOffset=null,generation=0,historyGeneration=0;
  const api=(window.SWARM_PUBLIC_CONFIG?.apiBase||'').replace(/\/$/,'');
  const area=p=>{const [x,y]=p;return x>=3000&&x<=3100&&y>=10270&&y<=10370?'aquanite':x>=3200&&x<=3280&&y>=10300&&y<=10400?'scorpia':x>=2500&&x<=2570&&y>=4670&&y<=4750?'mage-bank':y>=6400?'unmapped':'surface';};
  const here=p=>area(p.position)===$('area').value&&p.position[2]===Number($('plane').value);
  const now=()=>state?state.serverNow+performance.now()-anchor:Date.now();
  const scale=()=>W/camera.span;
  const project=p=>[W/2+(p[0]-camera.x)*scale(),H/2-(p[1]-camera.y)*scale()];
  const point=e=>{const r=chart.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];};
  function players(){const t=now();return [...(state?.clients||[]).filter(p=>t-p.lastSeenAt<5000),...($('show').value==='swarm'?[]:(state?.players||[]).filter(p=>p.expiresAt>t))];}
  function fit(){
    const points=[...(map?.features||[]).filter(here).map(p=>p.position),...players().filter(here).map(p=>p.position)];
    if(!points.length){camera={x:3100,y:$('area').value==='unmapped'?10300:3900,span:160};draw();return;}
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
    camera={x:(loX+hiX)/2,y:(loY+hiY)/2,span:Math.max(35,(hiX-loX+20)*1.1,(hiY-loY+20)*W/H*1.1)};draw();
  }
  function inspect(p,locate=false){selected=p.id;if(locate){$('area').value=area(p.position);$('plane').value=p.position[2];camera={x:p.position[0],y:p.position[1],span:80};}
    $('inspection').textContent=`${p.name} · ${p.role||p.relationship} · ${p.position.join(', ')} · last seen ${new Date(p.lastSeenAt).toLocaleTimeString()}${p.firstSeenAt?' · encounter began '+new Date(p.firstSeenAt).toLocaleTimeString():''}`;draw();}
  function draw(){
    if(!map)return;chart.replaceChildren();$('area-label').textContent=$('area').selectedOptions[0]?.textContent+' · plane '+$('plane').value;
    if($('area').value==='surface'&&$('plane').value==='0')for(const t of map.tiles){const [x,y]=project([t.worldLeft,t.worldTop]);chart.append(svg('image',{href:t.file,x,y,width:(t.worldRight-t.worldLeft)*scale(),height:(t.worldTop-t.worldBottom)*scale(),opacity:.82}));}
    const step=camera.span>400?64:camera.span>120?16:8;
    for(let x=Math.floor((camera.x-camera.span/2)/step)*step;x<camera.x+camera.span/2;x+=step){const [px]=project([x,0]);chart.append(svg('line',{x1:px,x2:px,y1:0,y2:H,stroke:'#acc2a9','stroke-opacity':.1}));}
    for(let y=Math.floor((camera.y-camera.span*H/W/2)/step)*step;y<camera.y+camera.span*H/W/2;y+=step){const [,py]=project([0,y]);chart.append(svg('line',{x1:0,x2:W,y1:py,y2:py,stroke:'#acc2a9','stroke-opacity':.1}));}
    for(const f of map.features.filter(here)){const [x,y]=project(f.position);chart.append(svg('circle',{cx:x,cy:y,r:2,fill:'#d4d6a8'}));if(camera.span<220)chart.append(svg('text',{x:x+5,y:y-5,class:'feature'},f.label||f.id));}
    if($('view').value==='hotspots'&&$('show').value!=='swarm')for(const c of cells.filter(here)){const[x,y]=project([c.position[0],c.position[1]+c.cellTiles]);const r=svg('rect',{x,y,width:c.cellTiles*scale(),height:c.cellTiles*scale(),fill:'#e59d64',opacity:Math.min(.8,.2+Math.log1p(c.uniquePlayers)/8),class:'hotspot'});r.append(svg('title',{},`${c.uniquePlayers} players · ${c.encounters} encounters (latest positions)`));chart.append(r);}
    for(const p of players().filter(here)){if($('view').value==='hotspots'&&!p.role)continue;const[x,y]=project(p.position);if(x<0||y<0||x>W||y>H)continue;
      const live=p.role||p.observed&&now()-p.lastSeenAt<4000,color=colors[p.role||p.relationship];
      const g=svg('g',{transform:`translate(${x},${y})`,class:'marker',role:'button',tabindex:0,'aria-label':p.name+' '+(p.role||p.relationship)});
      g.append(svg('circle',{r:p.role?7:5,fill:color,opacity:live?1:.55,stroke:p.id===selected?'#fff':'#101713','stroke-width':2}));g.append(svg('text',{x:0,y:21,'text-anchor':'middle'},p.name));
      if(!live){const seconds=Math.max(0,Math.ceil((p.expiresAt-now())/1000));g.append(svg('text',{x:0,y:35,'text-anchor':'middle',class:'countdown'},seconds<60?seconds:Math.ceil(seconds/60)+'m'));}
      g.addEventListener('pointerdown',e=>e.stopPropagation());g.addEventListener('click',()=>inspect(p));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(p);}});chart.append(g);
    }
  }
  function render(){
    const online=state?.online&&now()-state.updatedAt<10000;$('light').classList.toggle('online',Boolean(online));
    $('status').textContent=online?'Collector online':api?'Collector offline':'Feed setup pending';
    $('updated').textContent=state?.updatedAt?'Last update '+new Date(state.updatedAt).toLocaleTimeString():'No live sightings yet';
    const list=$('players'),search=$('search').value.toLowerCase(),visible=players().filter(p=>p.name.toLowerCase().includes(search));list.replaceChildren();$('count').textContent=visible.length;
    for(const p of visible){const b=el('button',p.name),s=el('small',`${p.role||p.relationship} · ${p.position.join(', ')}`);b.append(s);b.addEventListener('click',()=>inspect(p,true));list.append(b);}
    if(!visible.length){const p=el('p',search?'No matching sightings.':'No sightings in this window. Try a longer window or return when the collector is online.');p.className='empty';list.append(p);}draw();
  }
  async function get(path){if(!api)throw Error('Unconfigured');const r=await fetch(api+path,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Unavailable');return r.json();}
  async function poll(){const g=generation;try{const q='?windowSeconds='+$('window').value;const value=await get('/v1/state'+q);if(g!==generation)return;state=value;anchor=performance.now();if($('view').value==='hotspots'){const h=await get('/v1/hotspots'+q);if(g!==generation)return;cells=h.cells;}render();}catch(_){if(g===generation){if(state)state.online=false;render();}}finally{setTimeout(poll,2000);}}
  async function loadHistory(more=false){const g=++historyGeneration,offset=more?nextOffset:0;if(!more)$('history-list').replaceChildren();$('history-load').disabled=true;
    try{const result=await get('/v1/history?windowSeconds='+$('window').value+'&offset='+(offset||0));if(g!==historyGeneration)return;nextOffset=result.nextOffset;
      for(const p of result.encounters){const row=el('div');row.className='encounter';const b=el('button',p.name),s=el('span',`${new Date(p.firstSeenAt).toLocaleTimeString()} – ${new Date(p.lastSeenAt).toLocaleTimeString()} · ${p.position.join(', ')}`);b.addEventListener('click',()=>inspect(p,true));row.append(b,s);$('history-list').append(row);}
      if(!more&&!result.encounters.length)$('history-list').textContent='No encounters in this window.';$('history-more').hidden=nextOffset===null;
    }catch(_){if(g===historyGeneration)$('history-list').textContent='Encounter history is currently unavailable.';}finally{if(g===historyGeneration)$('history-load').disabled=false;}}
  for(const id of ['area','plane'])$(id).addEventListener('change',fit);
  for(const id of ['window','show','view'])$(id).addEventListener('change',()=>{generation++;historyGeneration++;state=null;cells=[];nextOffset=null;$('history-list').replaceChildren();$('history-more').hidden=true;$('history-load').disabled=false;render();});
  $('search').addEventListener('input',render);$('fit').addEventListener('click',fit);
  $('plus').addEventListener('click',()=>{camera.span=Math.max(12,camera.span/1.4);draw();});$('minus').addEventListener('click',()=>{camera.span=Math.min(4000,camera.span*1.4);draw();});
  chart.addEventListener('wheel',e=>{e.preventDefault();camera.span=Math.min(4000,Math.max(12,camera.span*(e.deltaY>0?1.15:.87)));draw();},{passive:false});
  chart.addEventListener('pointerdown',e=>{drag={p:point(e),x:camera.x,y:camera.y};chart.setPointerCapture(e.pointerId);});
  chart.addEventListener('pointermove',e=>{const p=point(e);if(drag){camera.x=drag.x-(p[0]-drag.p[0])/scale();camera.y=drag.y+(p[1]-drag.p[1])/scale();draw();}$('coordinates').textContent=Math.round(camera.x+(p[0]-W/2)/scale())+', '+Math.round(camera.y-(p[1]-H/2)/scale());});
  for(const event of ['pointerup','pointercancel'])chart.addEventListener(event,()=>{drag=null;});
  $('history-load').addEventListener('click',()=>loadHistory());$('history-more').addEventListener('click',()=>loadHistory(true));
  fetch('map.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(v=>{map=v;for(const a of v.areas){const o=el('option',a.label);o.value=a.id;$('area').append(o);}$('attribution').textContent=v.attribution;fit();render();poll();setInterval(render,1000);}).catch(()=>{$('status').textContent='Map could not load';});
})();
