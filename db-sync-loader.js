/* Carregamento sincronizado: controla apenas o estado visual da leitura inicial do Firebase. */
export function createDbSyncLoader(message="Sincronizando com o banco de dados..."){
  const existing=document.getElementById("dbSyncLoading");
  if(existing) return {show(){existing.classList.remove("is-hidden")},hide(){existing.classList.add("is-hidden")}};

  const overlay=document.createElement("div");
  overlay.id="dbSyncLoading";
  overlay.setAttribute("role","status");
  overlay.setAttribute("aria-live","polite");
  overlay.innerHTML=`<div class="db-sync-card"><div class="db-sync-spinner" aria-hidden="true"></div><strong>Sincronizando</strong><span>${message}</span></div>`;
  document.body.prepend(overlay);

  return {
    show(){overlay.classList.remove("is-hidden")},
    hide(){overlay.classList.add("is-hidden")}
  };
}
