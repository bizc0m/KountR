export const KEY='countr-bipo-v2';
export const today=()=>localDate(new Date());
export function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function days(end,n){const d=new Date(end+'T12:00:00');return Array.from({length:n},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()-n+1+i);return localDate(x)})}
export const blank=()=>({app:KEY,version:2,days:{},meds:[],changes:[],events:[],plan:{signals:'',actions:'',contact:'',phone:'',crisis:'',sleepTarget:null},savedAt:null});
export const emptyDay=()=>({mood:null,energy:null,sleep:null,quality:null,effects:'',benefits:'',notes:'',symptoms:[],takes:{},updatedAt:null});
export const id=()=>crypto.randomUUID();
export const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime())&&localDate(new Date(s+'T12:00:00'))===s;
const str=(x,n=10000)=>typeof x==='string'&&x.length<=n;
const num=(x,min,max)=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max);
export function validate(s){
 if(!s||s.app!==KEY||s.version!==2||!s.days||typeof s.days!=='object'||Array.isArray(s.days)||!Array.isArray(s.meds)||!Array.isArray(s.changes)||!Array.isArray(s.events)||!s.plan)throw Error('Ce fichier n’est pas une sauvegarde Bipo V2 valide.');
 if(Object.keys(s.days).length>20000||s.meds.length>500||s.events.length>10000||s.changes.length>10000)throw Error('Sauvegarde trop volumineuse.');
 const ids=new Set();
 for(const m of s.meds){if(!str(m.id,100)||ids.has(m.id)||!str(m.name,120)||!m.name.trim()||!str(m.dose,120)||!Array.isArray(m.times)||m.times.length<1||m.times.length>12||m.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||new Set(m.times).size!==m.times.length||!validDate(m.start)||(m.end!==null&&(!validDate(m.end)||m.end<m.start)))throw Error('Traitement invalide.');ids.add(m.id)}
 for(const [date,d]of Object.entries(s.days)){
  if(!validDate(date)||!d||!num(d.mood,-3,3)||!num(d.energy,0,10)||!num(d.sleep,0,24)||!num(d.quality,1,5)||!['effects','benefits','notes'].every(k=>str(d[k]))||!Array.isArray(d.symptoms)||d.symptoms.some(x=>!str(x,100))||!d.takes||typeof d.takes!=='object'||Array.isArray(d.takes))throw Error('Journal invalide.');
  for(const t of Object.values(d.takes))if(!t||!['taken','skipped'].includes(t.status)||!str(t.name,120)||!str(t.dose,120)||!str(t.reason,500)||!str(t.at,100)||!str(t.time,5))throw Error('Prise invalide.');
 }
 for(const e of s.events)if(!e||!str(e.id,100)||!str(e.title,200)||!validDate(e.date)||!['consultation','bilan'].includes(e.kind)||typeof e.done!=='boolean'||!str(e.notes,2000))throw Error('Rendez-vous invalide.');
 for(const c of s.changes)if(!c||!validDate(c.date)||!str(c.text,2000))throw Error('Historique invalide.');
 for(const k of ['signals','actions','contact','phone','crisis'])if(!str(s.plan[k],5000))throw Error('Plan invalide.');
 if(!num(s.plan.sleepTarget,0,24))throw Error('Repère de sommeil invalide.');
 return s;
}
export function schedule(s,date){return s.meds.filter(m=>m.start<=date&&(!m.end||m.end>=date)).flatMap(m=>m.times.map(time=>({key:m.id+'@'+time,med:m,time}))).sort((a,b)=>a.time.localeCompare(b.time))}
export function stats(s,start,end){const rows=Object.entries(s.days).filter(([d])=>d>=start&&d<=end).sort(([a],[b])=>a.localeCompare(b));const mean=k=>{const a=rows.map(([,d])=>d[k]).filter(v=>v!==null);return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10:null};let taken=0,skipped=0,unknown=0;for(const date of days(end,Math.round((new Date(end+'T12:00:00')-new Date(start+'T12:00:00'))/86400000)+1)){const d=s.days[date];const expected=schedule(s,date);const keys=new Set(expected.map(x=>x.key));for(const key of Object.keys(d?.takes||{}))keys.add(key);for(const key of keys){const t=d?.takes[key];if(t?.status==='taken')taken++;else if(t?.status==='skipped')skipped++;else unknown++}}
 return {rows,sleep:mean('sleep'),mood:mean('mood'),energy:mean('energy'),taken,skipped,unknown};
}
export function report(s,start,end,include){const p=stats(s,start,end),v=x=>x===null?'non renseigné':x;let a=[`ÉQUILIBRE QUOTIDIEN · BIPO V2`,`Période : ${start} au ${end}`,`Auto-observations du patient ; aucune interprétation diagnostique.`];
 if(include.journal){a.push(`\nJOURNAL (${p.rows.length} jour(s) renseigné(s))`,`Sommeil moyen : ${v(p.sleep)} h · humeur moyenne : ${v(p.mood)} (−3 à +3) · énergie moyenne : ${v(p.energy)} /10`);for(const [date,d]of p.rows)a.push(`${date} : humeur ${v(d.mood)} ; énergie ${v(d.energy)} ; sommeil ${v(d.sleep)} h ; repos ${v(d.quality)}/5`,d.symptoms.length?'Observations : '+d.symptoms.join(', '):'',d.notes?'Note : '+d.notes:'')}
 if(include.treatment){a.push(`\nTRAITEMENT ET PRISES`,`Confirmées : ${p.taken} · non prises déclarées : ${p.skipped} · non renseignées : ${p.unknown}`);for(const m of s.meds.filter(m=>m.start<=end&&(!m.end||m.end>=start)))a.push(`${m.name} · ${m.dose} · ${m.times.join(', ')} · du ${m.start} au ${m.end||'en cours'}`);for(const [date,d]of p.rows)for(const t of Object.values(d.takes))a.push(`${date} ${t.time} · ${t.name} ${t.dose} : ${t.status==='taken'?'prise confirmée':'non prise déclarée'}${t.reason?' ; motif : '+t.reason:''}`);for(const c of s.changes.filter(c=>c.date>=start&&c.date<=end))a.push(`${c.date} · ${c.text}`)}
 if(include.effects){a.push('\nEFFETS ET BÉNÉFICES RESSENTIS');for(const [date,d]of p.rows)if(d.effects||d.benefits)a.push(`${date} · effets : ${d.effects||'non renseignés'} · bénéfices : ${d.benefits||'non renseignés'}`)}
 if(include.plan)a.push('\nPLAN CONVENU',`Signaux personnels : ${s.plan.signals}`,`Actions convenues : ${s.plan.actions}`,`Contact : ${s.plan.contact} ${s.plan.phone}`,`Consignes en cas de crise : ${s.plan.crisis}`);
 if(include.events){a.push('\nCONSULTATIONS ET BILANS');for(const e of s.events.filter(e=>e.date>=start&&e.date<=end).sort((a,b)=>a.date.localeCompare(b.date)))a.push(`${e.date} · ${e.title} · ${e.done?'effectué':'prévu'} · ${e.notes}`)}
 return a.filter(x=>x!=='').join('\n');
}
