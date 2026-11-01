/* One language component and preference for the current counters, index and editor.
   Translate interface text only; observations, inputs and saved models are untouched. */
(function(){
'use strict';
const dictionaries=window.CountrLocales,KEY='countr-language-v1';
const names={fr:'Français',en:'English',es:'Español',pt:'Português',de:'Deutsch',it:'Italiano',ar:'العربية',zh:'简体中文',hi:'हिन्दी',bn:'বাংলা',ja:'日本語',ko:'한국어',ru:'Русский',tr:'Türkçe',id:'Bahasa Indonesia'};
const normalize=code=>String(code||'').toLowerCase().split(/[-_]/)[0];
const supported=code=>Object.hasOwn(names,code);
let lang='fr';
try{const saved=localStorage.getItem(KEY);lang=supported(saved)?saved:normalize(navigator.language)}catch(e){lang=normalize(navigator.language)}
if(!supported(lang))lang='fr';
const bar=document.createElement('div');bar.className='countr-language-bar';bar.dataset.countrLanguage='';
const label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select');
caption.textContent='Langue';select.id='countrLanguage';select.dir='ltr';
for(const [code,name]of Object.entries(names)){const o=document.createElement('option');o.value=code;o.textContent=name;o.lang=code;select.append(o)}
label.append(caption,select);bar.append(label);document.body.prepend(bar);
const texts=new WeakMap(),attrs=new WeakMap();
const protectedSelector='input,textarea,script,style,code,pre,[contenteditable],#bipoReviewText,#historyList,#bipoEvents,#bipoRxHint,#bipoEntryTitle,#bipoEntryNote,#bipoDailyNote,#toast,.toast,.tileBottom,.tile-name,.preview-name,.preview-number,.preview-icon,#boardName,#description,#condition,#previewTabs,#tabs,#boards,#tabList,#v2Focus,#v2TimerTile,#v2QuickTitle,#v2TimerDay,#v2ClockValue';
function translated(source){
 const trimmed=source.trim(),dict=dictionaries[lang];
 if(Object.hasOwn(dict,trimmed))return source.replace(trimmed,dict[trimmed]);
 const plain=trimmed.replace(/^[✎＋+▦▶←→↗⏱☰⛶🔓🔒−↓☕\s]+|[←→↗\s]+$/gu,'');
 return plain&&Object.hasOwn(dict,plain)?source.replace(plain,dict[plain]):source;
}
function apply(){
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 select.value=lang;caption.textContent=dictionaries[lang]['Langue'];select.setAttribute('aria-label',caption.textContent);
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;if(!parent||parent.closest(protectedSelector)||parent.closest('[data-countr-language]'))continue;
  const previous=texts.get(node),source=previous&&node.nodeValue===previous.output?previous.source:node.nodeValue;
  const output=translated(source);texts.set(node,{source,output});if(node.nodeValue!==output)node.nodeValue=output;
 }
 document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>{
  if(el.closest(protectedSelector)||el.closest('[data-countr-language]'))return;
  let previous=attrs.get(el);if(!previous){previous={};attrs.set(el,previous)}
  for(const name of ['title','aria-label','placeholder'])if(el.hasAttribute(name)){
   const current=el.getAttribute(name),entry=previous[name],source=entry&&current===entry.output?entry.source:current,output=translated(source);
   previous[name]={source,output};if(current!==output)el.setAttribute(name,output);
  }
 });
}
let observer;
function refresh(){observer?.disconnect();apply();observer?.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']})}
select.addEventListener('change',()=>{lang=select.value;try{localStorage.setItem(KEY,lang)}catch(e){}refresh();window.dispatchEvent(new CustomEvent('countr:language',{detail:{language:lang}}))});
window.addEventListener('storage',e=>{if(e.key===KEY){lang=supported(e.newValue)?e.newValue:'fr';refresh()}});
observer=new MutationObserver(refresh);refresh();
})();
