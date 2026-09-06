import {db} from './firebase-init.js';
import {ref,onValue} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';

const CONFIG_PATH='site/configuracao';
const pageKey=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/i,'')||'index';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function safeUrl(v){
  const s=String(v||'').trim();
  return /^(https?:\/\/|data:image\/)/i.test(s)?s:'';
}
function safeCss(v){
  return String(v||'').replace(/<\/?style[^>]*>/gi,'').slice(0,20000);
}
function sanitizeHtml(html){
  const box=document.createElement('div'); box.innerHTML=String(html||'');
  box.querySelectorAll('script,iframe,object,embed,form,style,link,meta').forEach(el=>el.remove());
  box.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(a=>{
      const n=a.name.toLowerCase(), val=a.value||'';
      if(n.startsWith('on') || n==='srcdoc' || (n==='href' && /^\s*javascript:/i.test(val)) || (n==='src' && /^\s*javascript:/i.test(val))) el.removeAttribute(a.name);
    });
  });
  return box.innerHTML;
}

function ensureBanner(){
  let el=document.getElementById('siteDynamicBanner');
  if(!el){
    el=document.createElement('section'); el.id='siteDynamicBanner'; el.setAttribute('aria-label','Banner do site');
    const main=document.querySelector('main');
    if(main?.parentNode) main.parentNode.insertBefore(el,main);
  }
  return el;
}
function ensureCustom(){
  let el=document.getElementById('siteCustomBlocks');
  if(!el){
    el=document.createElement('section'); el.id='siteCustomBlocks';
    const main=document.querySelector('main');
    if(main) main.appendChild(el); else document.body.appendChild(el);
  }
  return el;
}
function apply(config){
  config=config||{};
  const global=config.global||{}, page=config.pages?.[pageKey]||{};
  const body=document.body;
  const bg=safeUrl(global.backgroundUrl);
  if(bg){body.style.setProperty('background-image',`linear-gradient(rgba(0,0,0,${Math.max(0,Math.min(0.7,Number(global.backgroundOverlay)||0))}),rgba(0,0,0,${Math.max(0,Math.min(0.7,Number(global.backgroundOverlay)||0))})),url("${bg}")`,'important');body.style.backgroundSize='cover';body.style.backgroundAttachment='fixed';body.style.backgroundPosition='center';}
  else {body.style.removeProperty('background-image');}
  if(global.primaryColor) document.documentElement.style.setProperty('--site-primary',global.primaryColor);
  if(global.primaryDark) document.documentElement.style.setProperty('--site-primary-dark',global.primaryDark);

  const banner=ensureBanner();
  if(global.banner?.enabled && safeUrl(global.banner.imageUrl)){
    banner.innerHTML=`<div class="site-banner-inner" style="background-image:linear-gradient(rgba(0,0,0,.30),rgba(0,0,0,.45)),url('${safeUrl(global.banner.imageUrl)}')"><div class="site-banner-content">${global.banner.title?`<h2>${escapeHtml(global.banner.title)}</h2>`:''}${global.banner.subtitle?`<p>${escapeHtml(global.banner.subtitle)}</p>`:''}</div></div>`;
    banner.hidden=false;
  }else{banner.hidden=true;banner.innerHTML='';}

  const title=document.querySelector('main h1, main .hero h1, main .intro h1');
  if(page.title && title) title.textContent=page.title;
  const sub=document.querySelector('main .hero p, main .intro p, main > .subtitle');
  if(page.subtitle && sub) sub.textContent=page.subtitle;
  document.body.classList.toggle('site-page-hidden',page.enabled===false);

  const custom=ensureCustom();
  const html=sanitizeHtml(page.customHtml||'');
  custom.innerHTML=html;
  custom.hidden=!html.trim();
  document.getElementById('siteCustomStyle')?.remove();
  if(page.customCss){
    const st=document.createElement('style'); st.id='siteCustomStyle'; st.textContent=safeCss(page.customCss); document.head.appendChild(st);
  }
}

const style=document.createElement('style');
style.id='siteConfigBaseStyle';
style.textContent=`
:root{--site-primary:#a51d36;--site-primary-dark:#7c1226}
#siteDynamicBanner{width:100%;margin:0 auto 28px;padding:0 16px;position:relative;z-index:2}
#siteDynamicBanner[hidden],#siteCustomBlocks[hidden]{display:none!important}
.site-banner-inner{min-height:210px;max-width:1200px;margin:auto;border-radius:22px;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.20)}
.site-banner-content{text-align:center;color:#fff;padding:34px 24px;max-width:900px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.site-banner-content h2{margin:0 0 10px;font:300 clamp(1.8rem,5vw,3.5rem)/1.1 Comfortaa,sans-serif;color:#fff!important}
.site-banner-content p{margin:0;font:300 clamp(.9rem,2vw,1.15rem)/1.7 Comfortaa,sans-serif;color:#fff!important}
#siteCustomBlocks{max-width:1200px;margin:34px auto;padding:0 16px;position:relative;z-index:1}
.site-page-hidden{visibility:hidden}
@media(max-width:650px){.site-banner-inner{min-height:160px;border-radius:16px}.site-banner-content{padding:24px 16px}#siteDynamicBanner{padding:0 10px}}
`;
document.head.appendChild(style);

onValue(ref(db,CONFIG_PATH),snap=>apply(snap.val()||{}),err=>console.error('Configuração visual do site:',err));
