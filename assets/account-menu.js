import { auth } from '../firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';
import { db } from '../firebase-init.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getHeader(){ return document.querySelector('.site-header, .player-header, header'); }

function normalizeAccountHost(header){
  const container = header?.querySelector('.header-inner, .player-header-inner') || header;
  if(!container) return null;
  let host = header.querySelector('.account-menu-host');
  if(!host){ host = document.createElement('div'); host.className = 'account-menu-host'; }
  if(host.parentElement !== container) container.appendChild(host);
  return host;
}

function renderAccount(header, user, profile){
  header.querySelectorAll('a[href$="login.html"], a[href$="cadastro.html"]').forEach(link => {
    link.hidden = !!user;
    link.setAttribute('aria-hidden', user ? 'true' : 'false');
  });
  const host = normalizeAccountHost(header);
  if(!host) return;
  if(!user){ host.innerHTML=''; header.classList.remove('has-account'); return; }
  const name = profile?.name || user.displayName || profile?.username || 'Jogador';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  host.innerHTML = `<div class="account-menu">
    <button class="account-avatar" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="account-dropdown" title="Menu da conta">${esc(initial)}</button>
    <div class="account-dropdown" id="account-dropdown" hidden>
      <div class="account-user"><span class="account-user-avatar">${esc(initial)}</span><div><strong>${esc(name)}</strong><small>${esc(profile?.username || '')}</small></div></div>
      <div class="account-divider"></div>
      <a href="home.html">Ir para sua página</a>
      <a href="configuracoes.html">Configurações de cadastro</a>
      <button class="account-logout" type="button">Sair da sua conta</button>
    </div>
  </div>`;
  const menu = host.querySelector('.account-menu');
  const avatar = host.querySelector('.account-avatar');
  const dropdown = host.querySelector('.account-dropdown');
  const close = () => { dropdown.hidden=true; avatar.setAttribute('aria-expanded','false'); };
  avatar.addEventListener('click', e => { e.stopPropagation(); const open=dropdown.hidden; dropdown.hidden=!open; avatar.setAttribute('aria-expanded',String(open)); });
  dropdown.addEventListener('click', e => e.stopPropagation());
  host.querySelector('.account-logout').addEventListener('click', async () => {
    const logout = host.querySelector('.account-logout');
    logout.disabled = true;
    try { await signOut(auth); close(); location.href='index.html'; }
    finally { logout.disabled=false; }
  });
  if(!host.dataset.accountBound){
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => { if(e.key==='Escape') close(); });
    host.dataset.accountBound='1';
  }
  header.classList.add('has-account');
}

function enhanceResponsiveNav(header){
  const nav=header?.querySelector('.nav, .player-nav');
  if(!nav || nav.dataset.responsiveReady==='1') return;
  nav.dataset.responsiveReady='1';
  nav.id=nav.id||'auradon-main-nav';
  const parent=nav.parentElement;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='nav-toggle';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','Abrir menu principal');
  toggle.setAttribute('aria-controls',nav.id);
  toggle.innerHTML='<span></span><span></span><span></span>';
  parent?.insertBefore(toggle,nav);
  const close=()=>{nav.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menu principal');nav.setAttribute('aria-hidden',window.innerWidth<=760?'true':'false');};
  const open=()=>{nav.classList.add('nav-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Fechar menu principal');nav.setAttribute('aria-hidden','false');};
  toggle.addEventListener('click',e=>{e.stopPropagation();nav.classList.contains('nav-open')?close():open();});
  nav.addEventListener('click',e=>{if(e.target.closest('a')) close();});
  document.addEventListener('click',e=>{if(!nav.contains(e.target) && e.target!==toggle) close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});
  const sync=()=>{if(window.innerWidth>760) close();else nav.setAttribute('aria-hidden',nav.classList.contains('nav-open')?'false':'true');};
  window.addEventListener('resize',sync,{passive:true});
  sync();
}

const header = getHeader();
if(header){
  normalizeAccountHost(header);
  enhanceResponsiveNav(header);
  onAuthStateChanged(auth, async user => {
    if(!user){ renderAccount(header,null,null); document.documentElement.classList.remove('auth-pending'); return; }
    let profile={};
    try { profile=(await get(ref(db,`site/profiles/${user.uid}`))).val()||{}; } catch(_) {}
    renderAccount(header,user,profile);
    document.documentElement.classList.remove('auth-pending');
  });
}
