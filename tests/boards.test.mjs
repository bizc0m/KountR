import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import '../docs/assets/boards.js';
const B=globalThis.BoardStore,store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
beforeEach(()=>store.clear());
const seed=()=>B.duplicate(B.BUILTIN);
test('Bipo garde ses clés de données existantes ; les autres tableaux sont isolés',()=>{assert.equal(B.stateKey('bipo'),'countr_bipo_tiles_v2');assert.equal(B.activeKey('bipo'),'countr_bipo_tiles_tab_v2');assert.notEqual(B.stateKey('a'),B.stateKey('b'));assert.equal(B.list().length,5);assert.equal(B.BUILTIN.tiles.length,20)});
test('Créer, sauvegarder et recharger un modèle vide fonctionne',()=>{const m=B.blank();m.name='Tableau de test';const saved=B.save(m,null);assert.equal(B.get(saved.id).name,m.name);assert.equal(B.get(saved.id).tiles.length,0);assert.equal(B.list().length,6)});
test('Les trois largeurs sont conservées dans le modèle',()=>{const m=seed();m.tiles[0].size='half';m.tiles[1].size='full';const saved=B.save(m,null);assert.deepEqual(B.get(saved.id).tiles.slice(0,3).map(t=>t.size),['half','full','third'])});
test('Le logo Base64 et le mode de note sont conservés et validés',()=>{const m=seed();m.logo='data:image/png;base64,AA==';m.tiles[0].noteMode='required';const saved=B.save(m,null);assert.equal(saved.logo,m.logo);assert.equal(saved.tiles[0].noteMode,'required');m.tiles[0].noteMode='espion';assert.throws(()=>B.validate(m));});
test('La duplication copie la configuration sans observations ni notes',()=>{const m=seed();m.logs=[{secret:'donnée patient'}];m.bipo={notes:{secret:'note privée'}};m.tiles[0].prescription='dose privée';const copy=B.save(B.duplicate(m),null);assert.equal(copy.logs,undefined);assert.equal(copy.bipo,undefined);assert.equal(copy.tiles[0].prescription,undefined);assert.notEqual(copy.id,m.id);assert.equal(localStorage.getItem(B.stateKey(copy.id)),null)});
test('Modifier le modèle conserve les valeurs, notes, prescriptions et paramètres du suivi',()=>{const m=seed();m.revision='revision-2';m.tiles[0].size='full';m.tiles[0].name='Nom changé';const log={id:'entry',tallyId:m.tiles[0].id,total:7.5};const state={tabs:m.tabs,tallies:[{...m.tiles[0],prescription:'consigne privée'}],logs:[log],layouts:{},settings:{sound:true},bipo:{notes:{'2026-10-31':'note privée'},events:[]}};B.apply(m,state);assert.equal(state.tallies[0].size,'full');assert.equal(state.tallies[0].prescription,'consigne privée');assert.equal(state.logs[0],log);assert.equal(state.bipo.notes['2026-10-31'],'note privée');assert.equal(state.settings.sound,true)});
test('Retirer puis réintroduire une tuile garde ses anciennes données',()=>{const m=seed(),tile=m.tiles[0],state={tabs:m.tabs,tallies:[{...tile,prescription:'ancienne consigne'}],logs:[{tallyId:tile.id,total:2}],layouts:{}};m.tiles=m.tiles.filter(t=>t.id!==tile.id);B.apply(m,state);assert.ok(state.retiredTallies.some(t=>t.id===tile.id));assert.equal(state.logs.length,1);m.tiles.unshift(tile);m.revision='restored';B.apply(m,state);assert.equal(state.tallies[0].prescription,'ancienne consigne');assert.equal(state.retiredTallies.length,0)});
test('Une bibliothèque invalide n’est pas remplacée silencieusement',()=>{localStorage.setItem(B.LIBKEY,'{invalide');assert.throws(()=>B.list());assert.throws(()=>B.save(seed(),null));assert.equal(localStorage.getItem(B.LIBKEY),'{invalide')});
test('Un conflit de révision bloque une sauvegarde obsolète',()=>{const m=B.save(seed(),null),stale=structuredClone(m);m.name='Nouvelle version';B.save(m,m.revision);assert.throws(()=>B.save(stale,stale.revision));assert.equal(B.get(m.id).name,'Nouvelle version')});
test('Les limites incohérentes et les identifiants dangereux sont refusés',()=>{const m=seed();m.tiles[0].bipoMin=25;m.tiles[0].bipoMax=24;assert.throws(()=>B.validate(m));m.tiles[0].bipoMin=0;m.tabs[0].id='x" onclick="';assert.throws(()=>B.validate(m))});
test('L’éditeur reprend la configuration locale sans copier les observations',()=>{const m=B.save(seed(),null),tiles=[{...m.tiles[1],size:'half'},{...m.tiles[0],size:'full'}];localStorage.setItem(B.stateKey(m.id),JSON.stringify({tabs:m.tabs,tallies:tiles,layouts:{daily:tiles.map(t=>t.id)},boardRevision:m.revision,logs:[{private:'secret'}]}));const edited=B.editable(m.id);assert.equal(edited.tiles[0].id,tiles[0].id);assert.equal(edited.tiles[0].size,'half');assert.equal(edited.logs,undefined)});
test('Sauvegarder la configuration ne réécrit aucune donnée de suivi ni clé historique',()=>{
 const m=B.editable('bipo'),key=B.stateKey('bipo');
 const raw=JSON.stringify({logs:[{id:'existing',total:7.5}],bipo:{notes:{'2026-10-31':'Note fictive'}},backup:{version:2}});
 localStorage.setItem(key,raw);localStorage.setItem(B.activeKey('bipo'),'daily');
 localStorage.setItem('tallycounter_v2','ancienne-version');
 m.tiles[0].name='Sommeil modifié';m.tiles[0].step=.1;m.tiles[0].size='half';B.save(m,m.revision);
 assert.equal(localStorage.getItem(key),raw);assert.equal(localStorage.getItem(B.activeKey('bipo')),'daily');
 assert.equal(localStorage.getItem('tallycounter_v2'),'ancienne-version');assert.equal(B.get('bipo').tiles[0].step,.1);
});
test('Les cinq modèles sont disponibles sans initialiser ou réécrire le stockage',()=>{
 assert.deepEqual(B.list().map(m=>m.id),['bipo','migraine','epilepsie','asthme','intestin-irritable']);
 for(const m of B.list()){B.validate(m);assert.ok(m.tiles.length>=7);assert.equal(B.editable(m.id).id,m.id)}
 assert.equal(store.size,0);
});
test('Un modèle prédéfini se personnalise sans doublon ni modification des autres modèles',()=>{
 const m=B.editable('migraine'),originalBipo=JSON.stringify(B.get('bipo')),revision=m.revision;
 m.tiles[0].name='Mes crises';const saved=B.save(m,revision);
 assert.equal(B.get('migraine').tiles[0].name,'Mes crises');assert.equal(B.list().length,5);
 assert.equal(JSON.stringify(B.get('bipo')),originalBipo);assert.throws(()=>B.save(m,revision));
 assert.notEqual(saved.revision,revision);
});
test('Les cinq compteurs isolent les clés, historiques, notes et tuiles',()=>{
 const all=B.list(),keys=all.map(m=>B.stateKey(m.id)),tileIds=all.flatMap(m=>m.tiles.map(t=>t.id));
 assert.equal(new Set(keys).size,5);assert.equal(new Set(tileIds).size,tileIds.length);
 for(const m of all){const state={tabs:[],tallies:[],logs:[],layouts:{},bipo:{notes:{}}};B.apply(m,state);state.logs.push({id:'log-'+m.id,total:1});state.bipo.notes['2026-11-01']='Test '+m.id;localStorage.setItem(B.stateKey(m.id),JSON.stringify(state));}
 for(const m of all){const s=JSON.parse(localStorage.getItem(B.stateKey(m.id)));assert.equal(s.logs.length,1);assert.equal(s.logs[0].id,'log-'+m.id);assert.equal(s.bipo.notes['2026-11-01'],'Test '+m.id);assert.deepEqual(s.tallies.map(t=>t.id),m.tiles.map(t=>t.id));}
});
test('Les mesures des modèles ont leurs unités et limites sans objectifs thérapeutiques',()=>{
 for(const id of ['migraine','epilepsie','asthme','intestin-irritable']){
  for(const t of B.get(id).tiles){assert.equal(t.goal,null);assert.ok(['count','value'].includes(t.bipoType));assert.ok(t.help.length>0)}
 }
 assert.equal(B.get('migraine').tiles.find(t=>t.id==='migraine-duration').unit,'min');
 assert.equal(B.get('epilepsie').tiles.find(t=>t.id==='epilepsie-duration').unit,'s');
 assert.equal(B.get('asthme').tiles.find(t=>t.id==='asthme-tightness').bipoMax,10);
});
test('Verrouiller empêche l’éditeur de sauvegarder sans toucher au suivi',()=>{
 const model=B.editable('bipo'),key=B.stateKey('bipo');
 const raw=JSON.stringify({settings:{locked:true},logs:[{id:'kept'}]});localStorage.setItem(key,raw);
 assert.equal(B.isLocked('bipo'),true);assert.throws(()=>B.save(model,model.revision),/verrouillés/);
 assert.equal(localStorage.getItem(key),raw);assert.equal(localStorage.getItem(B.LIBKEY),null);
 localStorage.setItem(key,JSON.stringify({settings:{locked:false}}));assert.doesNotThrow(()=>B.save(model,model.revision));
});
