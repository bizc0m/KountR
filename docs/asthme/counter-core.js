/* Daily values for the existing COUNTr tile engine. No storage or DOM access. */
(function(root){
 const date=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').getTime())&&date(new Date(s+'T12:00:00'))===s;
 const logDay=l=>l.day||(l.ts&&!Number.isNaN(new Date(l.ts).getTime())?date(new Date(l.ts)):'');
 function read(t,logs,day){let value=null,status=null,note='';for(const l of logs){if(l.tallyId!==t.id||logDay(l)!==day)continue;if(l.bipoOp==='set'){value=l.total;status=l.bipoStatus||null;note=l.note||''}else{value=Math.round(((value??0)+(Number(l.delta)||0))*100)/100;status=null;note=l.note||''}}return{value,status,note}}
 function check(t,value){if(value===null)return true;if(!Number.isFinite(value))return false;if(t.bipoType==='med')return value===0||value===1;return(t.bipoMin===null||t.bipoMin===undefined||value>=t.bipoMin)&&(t.bipoMax===null||t.bipoMax===undefined||value<=t.bipoMax)}
 function range(end,n){const d=new Date(end+'T12:00:00');return Array.from({length:n},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()-n+i+1);return date(x)})}
 function validate(s){
 const txt=(x,n=10000)=>typeof x==='string'&&x.length<=n, ident=x=>txt(x,100)&&/^[a-zA-Z0-9_-]+$/.test(x);
 if(!s||!Array.isArray(s.tabs)||!s.tabs.length||!Array.isArray(s.tallies)||!Array.isArray(s.logs)||s.tabs.length>200||s.tallies.length>5000||s.logs.length>100000)throw Error('Sauvegarde de compteurs invalide');
 const tabs=new Set(),tallies=new Set();for(const t of s.tabs){if(!ident(t.id)||tabs.has(t.id)||!txt(t.name,1000)||!/^#[a-fA-F0-9]{6}$/.test(t.color))throw Error('Onglet invalide');tabs.add(t.id)}
 for(const t of s.tallies){if(!ident(t.id)||tallies.has(t.id)||!tabs.has(t.tabId)||!txt(t.name,1000)||!txt(t.icon,100)||!/^#[a-fA-F0-9]{6}$/.test(t.color)||!Number.isFinite(t.step)||t.step<=0)throw Error('Compteur invalide');for(const key of ['bipoMin','bipoMax'])if(t[key]!==undefined&&t[key]!==null&&!Number.isFinite(t[key]))throw Error('Limite invalide');if(t.bipoMin!=null&&t.bipoMax!=null&&t.bipoMin>t.bipoMax)throw Error('Limites incohérentes');tallies.add(t.id)}
 for(const l of s.logs){if(!ident(l.id)||!ident(l.tallyId)||!txt(l.name,1000)||!Number.isFinite(l.delta)||(l.total!==null&&!Number.isFinite(l.total))||!txt(l.ts,100)||Number.isNaN(new Date(l.ts).getTime())||l.day!==undefined&&!validDay(l.day)||l.note!==undefined&&!txt(l.note,10000))throw Error('Historique invalide')}
 if(s.bipo){const b=s.bipo;if(typeof b!=='object'||!b.notes||typeof b.notes!=='object'||Array.isArray(b.notes)||!Array.isArray(b.events)||b.events.length>10000)throw Error('Suivi invalide');for(const [day,note]of Object.entries(b.notes))if(!validDay(day)||!txt(note))throw Error('Note invalide');for(const e of b.events)if(!ident(e.id)||!txt(e.name,1000)||!validDay(e.date)||typeof e.done!=='boolean')throw Error('Échéance invalide');for(const key of ['signals','actions'])if(b[key]!==undefined&&!txt(b[key]))throw Error('Repère invalide')}
 return s;
 }
 root.BipoCore={date,validDay,logDay,read,check,range,validate};
})(typeof window==='undefined'?globalThis:window);
