import { db } from "./firebase-init.js?v=20260909-news";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { hideDbLoading } from "./db-loader.js";

const list = document.getElementById("newsList");
let firstResponseReceived = false;

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function richText(value){
  const source=String(value||"");
  if(!/[<>]/.test(source)) return esc(source).replace(/\n/g,"<br>");
  const holder=document.createElement("div");
  holder.innerHTML=source;
  const allowed=new Set(["B","STRONG","I","EM","BR","P","DIV"]);
  const clean=(node)=>{
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===1){
        if(!allowed.has(child.tagName)){
          const text=document.createTextNode(child.textContent||"");
          child.replaceWith(text);
        }else{
          [...child.attributes].forEach(a=>child.removeAttribute(a.name));
          clean(child);
        }
      }
    });
  };
  clean(holder);
  return holder.innerHTML
    .replace(/<div>/gi,"")
    .replace(/<\/div>/gi,"<br>")
    .replace(/(<br>\s*){3,}/gi,"<br><br>");
}

function newsTimestamp(n){
  return Number(n.createdAt || n.updatedAt || 0);
}

function sortNews(posts){
  return posts.sort((a,b)=>{
    const tb=newsTimestamp(b), ta=newsTimestamp(a);
    if(tb!==ta) return tb-ta;
    const oa=Number(a.order || 999999), ob=Number(b.order || 999999);
    if(oa!==ob) return oa-ob;
    return String(b.key).localeCompare(String(a.key));
  });
}

function renderNews(snapshot){
  const data = snapshot.val() || {};
  const posts = sortNews(
    Object.entries(data)
      .map(([key, value]) => ({key, ...(value || {})}))
      .filter(n => n && typeof n === "object" && (n.title || n.excerpt || n.content))
  );

  if(!list){
    hideDbLoading();
    return;
  }

  if(!posts.length){
    list.innerHTML = '<div class="empty-news">Nenhuma notícia publicada.</div>';
  }else{
    list.innerHTML = posts.map(n => `
      <article class="post" id="noticia-${esc(n.key)}">
        <div class="post-meta-wrap">
          <div class="post-meta">${esc(n.category || "Notícia")}</div>
          <div class="post-date">${esc(n.date || "")}</div>
        </div>
        <div>
          ${n.imageUrl ? `
            <img
              src="${esc(n.imageUrl)}"
              alt="${esc(n.title || "Imagem da notícia")}"
              style="width:100%;max-height:360px;object-fit:contain;border-radius:14px;margin-bottom:18px;display:block"
            >
          ` : ""}
          <h2>${esc(n.title || "Sem título")}</h2>
          ${n.excerpt ? `<p class="post-excerpt">${esc(n.excerpt)}</p>` : ""}
          ${n.content ? `<div class="post-content">${richText(n.content)}</div>` : ""}
        </div>
      </article>
    `).join("");
  }

  firstResponseReceived = true;
  hideDbLoading();
}

function showError(error){
  console.error("Firebase notícias:", error);
  firstResponseReceived = true;
  hideDbLoading();
  if(list){
    list.innerHTML = `
      <div class="empty-news">
        Não foi possível carregar as notícias.
      </div>
    `;
  }
}

/*
 * Fonte única: site/noticias.
 * O listener permanece ativo, então publicar/editar/excluir no CPainel
 * atualiza esta página automaticamente.
 */
onValue(
  ref(db, "site/noticias"),
  renderNews,
  showError,
  { onlyOnce:false }
);

/* Failsafe: nunca deixar o overlay de carregamento preso. */
setTimeout(()=>{
  if(!firstResponseReceived){
    hideDbLoading();
    if(list && !list.children.length){
      list.innerHTML = '<div class="empty-news">Não foi possível conectar ao banco de notícias.</div>';
    }
  }
}, 8000);
