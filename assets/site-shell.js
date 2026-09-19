/* Shared public-site chrome. Content and page-specific scripts remain untouched. */
(() => {
  const current = location.pathname.split('/').pop() || 'index.html';
  if (current === 'index.html' || document.querySelector('.site-header')) {
    const accountScript = document.createElement('script');
    accountScript.type = 'module';
    accountScript.src = './assets/account-menu.js';
    document.body.appendChild(accountScript);
    return;
  }

  const links = [
    ['explore-auradon.html', 'Auradon'],
    ['alunos.html', 'Alunos'],
    ['corpo-docente.html', 'Docentes'],
    ['filiacoes.html', 'Filiações'],
    ['sistema-de-aulas.html', 'Aulas'],
    ['login.html', 'LOGIN'],
    ['cadastro.html', 'CADASTRO']
  ];
  const header = document.createElement('header');
  header.className = 'site-header site-header--shared';
  header.innerHTML = `<div class="shell header-inner">
    <a class="brand" href="index.html" aria-label="Descendentes RPG — Início"><img src="./assets/logo-descendentes.png" alt="Descendentes RPG"></a>
    <nav class="nav" aria-label="Navegação principal">${links.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  </div>`;

  const oldHeader = document.querySelector('header');
  if (oldHeader) oldHeader.replaceWith(header);
  else document.body.prepend(header);

  document.body.classList.add('shared-shell');
  const accountScript = document.createElement('script');
  accountScript.type = 'module';
  accountScript.src = './assets/account-menu.js';
  document.body.appendChild(accountScript);
  const footer = document.querySelector('footer');
  if (footer) footer.classList.add('site-footer', 'site-footer--shared');
})();
