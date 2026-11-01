/* Apply shared links to existing headers without adding another navigation bar. */
(()=>{'use strict';
const base=new URL('../',document.currentScript.src),config=window.CountrSiteConfig||{};
const header=document.querySelector('[data-shared-header]')||document.querySelector('header.top,header .header-inner');
if(!header)return;
if(config.brand){const brand=header.querySelector('.brand');if(brand?.firstChild)brand.firstChild.textContent=brand.firstChild.textContent.replace(/^COUNTr/,config.brand)}
let coffee=header.querySelector('.coffeeBtn,[data-site-link="support"]');
if(!coffee){coffee=document.createElement('a');coffee.className='coffeeBtn';coffee.target='_blank';coffee.rel='noopener noreferrer';header.append(coffee)}
coffee.dataset.siteLink='support';coffee.textContent='Payez-moi un café ☕';
for(const a of document.querySelectorAll('[data-site-link]')){const item=config.links?.[a.dataset.siteLink];if(!item)continue;try{const url=new URL(item.href,base);if(!['http:','https:'].includes(url.protocol))continue;a.href=url.href;if(item.label&&a!==coffee)a.textContent=item.label}catch(e){}}
const bar=document.querySelector('[data-countr-language]');if(bar){bar.classList.add('inline-language');const slot=header.querySelector('[data-language-slot]');if(slot)slot.append(bar);else header.append(bar)}
})();
