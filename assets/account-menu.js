import { auth } from '../firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';
import { db } from '../firebase-init.js';

const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function getHeader(){
  return document.querySelector('.site-header, .player-header, header');
}

function renderAccount(header, user, profile){
  header.querySelectorAll('a[href$="login.html"], a[href$="cadastro.html"]').forEach(link => { link.hidden = !!user; link.setAttribute('aria-hidden', user ? 'true' : 'false'); });
  let host = header.querySelector('.account-menu-host');
  if(!host){
    const container = header.querySelector('.header-inner, .player-header-inner') || header;
    host = document.createElement('div');
    host.className = 'account-menu-host';
    container.appendChild(host);
  }
  if(!user){
    host.innerHTML = '';
    header.classList.remove('has-account');
    return;
  }
  const name = profile?.name || user.displayName || profile?.username || 'Jogador';
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  host.innerHTML = `<div class="account-menu">
    <button class="account-avatar" type="button" aria-expanded="false" aria-haspopup="true" title="Menu da conta">${esc(initial)}</button>
    <div class="account-dropdown" hidden>
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
  const close = () => { dropdown.hidden = true; avatar.setAttribute('aria-expanded','false'); };
  avatar.addEventListener('click', e => { e.stopPropagation(); dropdown.hidden = !dropdown.hidden; avatar.setAttribute('aria-expanded', String(!dropdown.hidden)); });
  dropdown.addEventListener('click', e => e.stopPropagation());
  host.querySelector('.account-logout').addEventListener('click', async () => { await signOut(auth); close(); location.href='index.html'; });
  if(!host.dataset.accountBound){ document.addEventListener('click', close); host.dataset.accountBound='1'; }
  header.classList.add('has-account');
}

const header = getHeader();
if(header){
  onAuthStateChanged(auth, async user => {
    if(!user){ renderAccount(header, null, null); document.documentElement.classList.remove('auth-pending'); return; }
    let profile = {};
    try { profile = (await get(ref(db, `site/profiles/${user.uid}`))).val() || {}; } catch(_) {}
    renderAccount(header, user, profile);
    document.documentElement.classList.remove('auth-pending');
  });
}
