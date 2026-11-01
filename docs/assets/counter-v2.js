/* KountR V2 enhancements. The adapter owns the existing counter state and logs. */
(function(root){
'use strict';
const round=n=>Math.round((n+Number.EPSILON)*1e6)/1e6;
function shifted(tile,current,direction){
 if(![1,-1].includes(direction)||tile.bipoType==='med')return null;
 const next=round((current??0)+direction*(Number(tile.step)||1));
 if(!Number.isFinite(next)||(tile.bipoMin!=null&&next<tile.bipoMin)||(tile.bipoMax!=null&&next>tile.bipoMax))return null;
 return next;
}
function reordered(layout,id,target){const next=[...layout],from=next.indexOf(id),to=next.indexOf(target);if(from<0||to<0||from===to||!id||!target)return next;next.splice(from,1);next.splice(to,0,id);return next;}
function elapsed(timer,now=Date.now()){return !timer?0:Math.max(0,Number(timer.elapsedMs)||0)+Math.max(0,timer.startedAt==null?0:now-timer.startedAt);}
function durationValue(ms,unit){return round(ms/({s:1000,min:60000,h:3600000}[unit]||60000));}
function unitOf(t){if(['s','min','h'].includes(t.unit))return t.unit;return /\(h\)/.test(t.name)?'h':null;}
let live=null;
function mount(a){
 const d=document,$=s=>d.querySelector(s),grid=$('#grid'),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const timerKey='countr-v2-timer-'+a.boardId;
 const canWrite=()=>!a.blocked();
 const canConfigure=()=>!a.locked()&&canWrite();
 let timer=null,timerRaw=null,timerMemory=false,interval=null,drag=null,longPress=null,suppress=null,menuTile=null;
 try{timerRaw=localStorage.getItem(timerKey);timer=timerRaw?JSON.parse(timerRaw):null;if(timer&&(!Number.isFinite(timer.elapsedMs)||timer.elapsedMs<0||!a.validDay(timer.day)||typeof timer.tileId!=='string'||timer.startedAt!==null&&!Number.isFinite(timer.startedAt)))timer=null}catch(e){timer=null}
 function timerFresh(){if(timerMemory)return true;try{const raw=localStorage.getItem(timerKey);if(raw!==timerRaw){timerRaw=raw;timer=raw?JSON.parse(raw):null;a.notify('Chronomètre modifié dans un autre onglet. Vérifiez la durée.');return false}}catch(e){a.notify('Chronomètre indisponible dans le stockage.');return false}return true;}
 function writeTimer(value){timer=value;try{if(value===null)localStorage.removeItem(timerKey);else localStorage.setItem(timerKey,JSON.stringify(value));timerRaw=localStorage.getItem(timerKey)}catch(e){timerMemory=true;a.notify('Durée conservée en mémoire seulement. Enregistrez-la avant de fermer.')}updateClock();}
 const toolbar=d.createElement('div');toolbar.className='v2-toolbar';toolbar.innerHTML='<div class="v2-views" role="group" aria-label="Affichage"><button data-v2-view="grid">▦ <span>Grille</span></button><button data-v2-view="list">☰ <span>Liste</span></button><button data-v2-view="focus">⛶ <span>Plein écran</span></button></div><select id="v2Focus" aria-label="Tuile à afficher" hidden></select><button id="v2TimerOpen">⏱ <span>Chronomètre</span></button><button id="v2FullWindow" title="Agrandir la fenêtre" aria-label="Agrandir la fenêtre" hidden>⛶</button><a id="v2Backup" class="v2-export" href="#">↓ <span>Sauvegarder</span></a>';
 grid.before(toolbar);
 const quick=d.createElement('dialog');quick.id='v2Quick';quick.className='v2-dialog';quick.innerHTML='<div class="v2-dialog-head"><h2 id="v2QuickTitle"></h2><button data-v2-close aria-label="Fermer">×</button></div><div id="v2QuickActions" class="v2-quick-actions"></div>';d.body.append(quick);
 const clock=d.createElement('dialog');clock.id='v2Clock';clock.className='v2-dialog';clock.innerHTML='<div class="v2-dialog-head"><h2>Chronomètre</h2><button data-v2-close aria-label="Fermer">×</button></div><label>Tuile de durée<select id="v2TimerTile"></select></label><p id="v2TimerDay"></p><output id="v2ClockValue" aria-live="off">00:00:00</output><p class="v2-hint">La durée continue si vous fermez ce panneau. Enregistrer ajoute la durée à la valeur du jour de départ.</p><div class="v2-clock-actions"><button id="v2Start">Démarrer</button><button id="v2Pause">Pause</button><button id="v2Resume">Reprendre</button><button id="v2Commit">Enregistrer la durée</button><button id="v2Discard">Effacer la durée</button><button id="v2AddDuration">+ Tuile Durée</button></div>';d.body.append(clock);
 const focusedTile=()=>a.tiles().find(t=>t.tabId===a.active()&&t.id===a.state().settings.v2Focus)||a.tiles().find(t=>t.tabId===a.active());
 const durationTiles=()=>a.tiles().filter(t=>t.bipoType==='value'&&unitOf(t));
 function populateClock(){const select=$('#v2TimerTile'),chosen=timer?.tileId||select.value;select.innerHTML=durationTiles().map(t=>`<option value="${esc(t.id)}">${esc(t.name)} (${unitOf(t)})</option>`).join('');if(durationTiles().some(t=>t.id===chosen))select.value=chosen;select.disabled=!!timer;$('#v2AddDuration').hidden=!canConfigure();updateClock();}
 function updateClock(){
  const ms=elapsed(timer),sec=Math.floor(ms/1000),value=[Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':');
  $('#v2ClockValue').textContent=value;$('#v2TimerDay').textContent=timer?'Jour suivi : '+timer.day:'';
  $('#v2TimerOpen').title=timer?value:'Chronomètre';$('#v2TimerOpen').classList.toggle('v2-running',!!timer?.startedAt);
  $('#v2Start').disabled=!!timer||!durationTiles().length||!canWrite();$('#v2Pause').disabled=!timer||timer.startedAt===null;$('#v2Resume').disabled=!timer||timer.startedAt!==null;
  $('#v2Commit').disabled=!timer||ms<=0||!canWrite();$('#v2Discard').disabled=!timer;
  if(timer&&timer.startedAt!==null&&!d.hidden&&!interval)interval=setInterval(updateClock,250);
  if((!timer||timer.startedAt===null||d.hidden)&&interval){clearInterval(interval);interval=null}
 }
 function openClock(){timerFresh();populateClock();clock.showModal();}
 $('#v2TimerOpen').onclick=openClock;
 $('#v2Start').onclick=()=>{if(!canWrite()||timer||!timerFresh())return;const t=durationTiles().find(t=>t.id===$('#v2TimerTile').value);if(!t)return;writeTimer({tileId:t.id,day:a.day(),elapsedMs:0,startedAt:Date.now()});populateClock();};
 $('#v2Pause').onclick=()=>{if(timer&&timer.startedAt!==null&&timerFresh())writeTimer({...timer,elapsedMs:elapsed(timer),startedAt:null});};
 $('#v2Resume').onclick=()=>{if(timer&&timer.startedAt===null&&timerFresh())writeTimer({...timer,startedAt:Date.now()});};
 $('#v2Discard').onclick=()=>{if(timer&&timerFresh()&&confirm('Effacer la durée non enregistrée ?')){writeTimer(null);populateClock();}};
 $('#v2Commit').onclick=()=>{
  if(!canWrite()||!timer||!timerFresh())return;const snapshot={...timer,elapsedMs:elapsed(timer),startedAt:null},t=a.tiles().find(t=>t.id===snapshot.tileId),unit=t&&unitOf(t);
  if(!t||!unit){a.notify('Tuile de durée introuvable ou unité modifiée.');return;}
  const amount=durationValue(snapshot.elapsedMs,unit);if(amount<=0){a.notify('Durée trop courte pour cette unité.');return;}
  const previous=a.read(t,snapshot.day),value=round((previous.value??0)+amount),timerNote=[previous.note,'Chronomètre : '+amount+' '+unit].filter(Boolean).join('\n');
  writeTimer(snapshot);
  if(a.record(t,value,timerNote,snapshot.day)){writeTimer(null);populateClock();clock.close();a.notify('Durée enregistrée dans le jour de départ.');}
 };
 $('#v2AddDuration').onclick=()=>{
  if(!canConfigure())return;const t={id:a.uid(),tabId:a.active(),name:'Durée',icon:'⏱',color:'#8e9cbd',size:'third',bipoType:'value',step:1,bipoMin:0,bipoMax:null,goal:null,unit:'min',help:'Durée cumulée en minutes.',count:null,createdAt:new Date().toISOString(),period:'none',autoExport:true};
  a.state().tallies.push(t);const layout=a.layout(a.active()),slot=layout.indexOf(null);if(slot>=0)layout[slot]=t.id;else layout.push(t.id);a.save();a.render();populateClock();$('#v2TimerTile').value=t.id;
 };
 for(const dialog of [quick,clock])dialog.querySelector('[data-v2-close]').onclick=()=>dialog.close();
 $('#v2Backup').onclick=e=>{e.preventDefault();a.backup();};
 $('#v2FullWindow').onclick=()=>{const el=d.documentElement;if(d.fullscreenElement)d.exitFullscreen?.();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>a.notify('Grand affichage actif ; plein écran indisponible.'));else a.notify('Grand affichage actif ; plein écran indisponible.');};
 toolbar.querySelectorAll('[data-v2-view]').forEach(b=>b.onclick=()=>{a.state().settings.v2View=b.dataset.v2View;a.save();a.render();});
 $('#v2Focus').onchange=e=>{a.state().settings.v2Focus=e.target.value;a.save();a.render();};
 function shift(t,dir){if(!canWrite())return;const next=shifted(t,a.read(t,a.day()).value,dir);if(next===null){a.notify('Limite atteinte ou confirmation à corriger avec ✎.');return;}a.record(t,next,a.read(t,a.day()).note,a.day());}
 function menu(t){
  menuTile=t.id;$('#v2QuickTitle').textContent=t.icon+' '+t.name;
  const numeric=t.bipoType!=='med';$('#v2QuickActions').innerHTML=(numeric?'<button data-quick="plus">+ Ajouter</button><button data-quick="minus">− Retirer</button>':'')+'<button data-quick="entry">✎ Saisir / corriger</button><button data-quick="history">Historique</button>'+(!a.locked()?'<button data-quick="settings">Réglages</button>':'')+(unitOf(t)?'<button data-quick="timer">Chronomètre</button>':'');
  quick.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{const current=a.tiles().find(x=>x.id===menuTile);quick.close();if(!current)return;switch(b.dataset.quick){case'plus':shift(current,1);break;case'minus':shift(current,-1);break;case'entry':a.entry(current);break;case'history':a.history(current);break;case'settings':if(canConfigure())a.configure(current);break;case'timer':populateClock();if(!timer)$('#v2TimerTile').value=current.id;clock.showModal();}});
  quick.showModal();
 }
 function move(id,target){if(!canConfigure())return;const t=a.tiles().find(x=>x.id===id),other=a.tiles().find(x=>x.id===target);if(!t||!other||t.tabId!==other.tabId||t.tabId!==a.active())return;a.state().layouts[t.tabId]=reordered(a.layout(t.tabId),id,target);a.save();a.render();}
 function cancelLong(){if(longPress){clearTimeout(longPress.timeout);longPress=null}}
 grid.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary)return;
  const card=e.target.closest('[data-tally-id]');if(!card)return;const id=card.dataset.tallyId;
  if(e.target.closest('.v2-drag')){
   if(!canConfigure())return;drag={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,target:null,moved:false,handle:e.target.closest('.v2-drag')};drag.handle.setPointerCapture(e.pointerId);return;
  }
  if(e.target.closest('button,a,input,select'))return;
  cancelLong();longPress={x:e.clientX,y:e.clientY,timeout:setTimeout(()=>{const t=a.tiles().find(x=>x.id===id);longPress=null;if(t){suppress={id,until:Date.now()+1000};menu(t)}},550)};
 });
 grid.addEventListener('pointermove',e=>{
  if(longPress&&Math.hypot(e.clientX-longPress.x,e.clientY-longPress.y)>10)cancelLong();
  if(!drag||drag.pointer!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;
  if(drag.moved){e.preventDefault();const target=d.elementFromPoint(e.clientX,e.clientY)?.closest('[data-tally-id]');grid.querySelectorAll('.v2-drop-target').forEach(x=>x.classList.remove('v2-drop-target'));drag.target=target&&grid.contains(target)?target.dataset.tallyId:null;if(target&&drag.target!==drag.id)target.classList.add('v2-drop-target');}
 });
 function release(e){cancelLong();if(!drag||drag.pointer!==e.pointerId)return;const x=drag;drag=null;grid.querySelectorAll('.v2-drop-target').forEach(n=>n.classList.remove('v2-drop-target'));if(e.type==='pointerup'&&x.moved&&x.target)move(x.id,x.target);}
 grid.addEventListener('pointerup',release);grid.addEventListener('pointercancel',release);grid.addEventListener('lostpointercapture',e=>{if(drag&&drag.pointer===e.pointerId){drag=null;grid.querySelectorAll('.v2-drop-target').forEach(n=>n.classList.remove('v2-drop-target'));}});
 grid.addEventListener('click',e=>{const card=e.target.closest('[data-tally-id]');if(e.target.closest('.v2-drag')||(suppress&&card?.dataset.tallyId===suppress.id&&Date.now()<suppress.until)){e.preventDefault();e.stopImmediatePropagation();}},true);
 grid.addEventListener('contextmenu',e=>{const card=e.target.closest('[data-tally-id]');if(card&&!e.target.closest('button')){e.preventDefault();const t=a.tiles().find(x=>x.id===card.dataset.tallyId);if(t)menu(t);}});
 function enhance(){
  const mode=['grid','list','focus'].includes(a.state().settings.v2View)?a.state().settings.v2View:'grid';grid.classList.remove('v2-grid','v2-list','v2-focus');grid.classList.add('v2-'+mode);
  toolbar.querySelectorAll('[data-v2-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v2View===mode)));
  const focus=focusedTile(),select=$('#v2Focus');select.hidden=$('#v2FullWindow').hidden=mode!=='focus';select.innerHTML=a.tiles().filter(t=>t.tabId===a.active()).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');if(focus)select.value=focus.id;
  const configureLink=$('#configureBoard');if(configureLink){configureLink.hidden=a.locked();configureLink.setAttribute('aria-disabled',String(a.locked()));}
  grid.querySelectorAll('[data-tally-id]').forEach(card=>{
   const t=a.tiles().find(t=>t.id===card.dataset.tallyId);if(!t)return;card.querySelector('.v2-tile-actions')?.remove();card.hidden=mode==='focus'&&t.id!==focus?.id;
   const row=d.createElement('div');row.className='v2-tile-actions';
   if(t.bipoType!=='med')for(const [dir,symbol]of [[-1,'−'],[1,'+']]){const b=d.createElement('button');b.className='v2-step';b.textContent=symbol;b.setAttribute('aria-label',(dir===1?'Ajouter à ':'Retirer de ')+t.name);b.disabled=shifted(t,a.read(t,a.day()).value,dir)===null||!canWrite();b.onclick=()=>shift(t,dir);row.append(b)}
   if(!a.locked()){
    const handle=d.createElement('button');handle.className='v2-drag';handle.textContent='⠿';handle.setAttribute('aria-label','Déplacer '+t.name);handle.title='Glisser ou utiliser les flèches du clavier';handle.onkeydown=e=>{if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();const all=a.layout(a.active()).filter(Boolean),index=all.indexOf(t.id),target=all[index+(['ArrowUp','ArrowLeft'].includes(e.key)?-1:1)];if(target)move(t.id,target);grid.querySelector(`[data-tally-id="${t.id}"] .v2-drag`)?.focus();}};row.append(handle);
   }
   card.append(row);
  });
  grid.querySelectorAll('.addTile').forEach(el=>el.hidden=a.locked()||mode==='focus');
  $('#v2AddDuration').hidden=!canConfigure();updateClock();
 }
 window.addEventListener('storage',e=>{if(e.key===timerKey){try{timerRaw=e.newValue;timer=e.newValue?JSON.parse(e.newValue):null;populateClock()}catch(x){timer=null;updateClock()}}});
 d.addEventListener('visibilitychange',updateClock);live={enhance};enhance();return live;
}
root.CounterV2={round,shifted,reordered,elapsed,durationValue,unitOf,mount,enhance:()=>live?.enhance()};
})(typeof window==='undefined'?globalThis:window);
