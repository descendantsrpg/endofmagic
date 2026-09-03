import {dbOnValue} from "./db-loader.js";
import { db } from "./firebase-init.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const list = document.getElementById("newsList");

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
  return holder.innerHTML.replace(/<div>/gi,"").replace(/<\/div>/gi,"<br>").replace(/(<br>\s*){3,}/gi,"<br><br>");
}

function renderNews(snapshot){
  const data = snapshot.val() || {};

  const posts = Object.entries(data)
    .map(([key, value]) => ({key, ...(value || {})}))
    .filter(n => n.title || n.excerpt || n.content)
    .sort((a,b) => {
      const oa = Number(a.order || 999999);
      const ob = Number(b.order || 999999);
      if (oa !== ob) return oa - ob;
      return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    });

  if (!posts.length){
    list.innerHTML = '<div class="empty-news">Nenhuma notícia publicada.</div>';
    return;
  }

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
            style="width:100%;max-height:360px;object-fit:cover;border-radius:14px;margin-bottom:18px;display:block"
          >
        ` : ""}
        <h2>${esc(n.title || "Sem título")}</h2>
        ${n.excerpt ? `<p class="post-excerpt">${esc(n.excerpt)}</p>` : ""}
        ${n.content ? `<p class="post-content">${richText(n.content)}</p>` : ""}
      </div>
    </article>
  `).join("");
}

function showError(error){
  console.error("Firebase notícias:", error);
  list.innerHTML = `
    <div class="empty-news">
      Não foi possível carregar as notícias.
    </div>
  `;
}

/*
 * IMPORTANTE:
 * onValue mantém esta página conectada ao Firebase Realtime Database.
 * Qualquer publicação, edição ou exclusão feita pelo painel admin em
 * site/noticias será refletida automaticamente aqui.
 */
dbOnValue(onValue, 
  ref(db, "site/noticias"),
  renderNews,
  showError
);
