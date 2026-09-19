import {db} from '../firebase-init.js';
import {requireAuth} from './auth.js';
import {get,ref,push,set,remove,update} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const params=new URLSearchParams(location.search);
let user=null,step=0,draftId=params.get('draft')||null,fichaId=params.get('ficha')||null,saveTimer=null,affiliations={},activities={},slotCounts={},loadedDraft=false,editingExisting=false;

const data={
  powers:['','','',''],characterName:'',characterAge:'',sexuality:'',
  affiliationStudio:'',affiliationStory:'',fairyTale:'',progenitors:'',royalRebel:'',
  personality:'',history:'',activityPrimary:'',activitySecondary:'',shape:'',avatarUrl:'',
  ownerUid:'',playerName:'',status:'rascunho',createdAt:0,updatedAt:0
};
const labels=['RGA','Progenitores','Características','Atividades','Shape','Foto'];

const steps=[
 {title:'Vamos Criar o Registro Geral de Auradon (RGA)',subtitle:'O RGA serve como identificação do seu personagem dentro de Auradon.',body:()=>`<div class="ficha-grid"><div class="field full"><label>*Nome do Personagem</label><input id="characterName" maxlength="80" value="${esc(data.characterName)}"></div><div class="field"><label>*Idade</label><input id="characterAge" type="number" min="14" max="22" value="${esc(data.characterAge)}"></div><div class="field"><label>*Sexualidade</label><input id="sexuality" maxlength="80" value="${esc(data.sexuality)}"></div></div><div class="help">A idade permitida para personagens é de 14 a 22 anos.</div>`},
 {title:'Progenitores',subtitle:'Aqui vamos escolher os progenitores do seu personagem.',body:()=>`<div class="ficha-grid"><div class="field"><label>*Estúdio</label><select id="studio"><option value="">Selecione o estúdio</option>${studioOptions()}</select></div><div class="field"><label>*Conto de Fadas / Propriedade</label><select id="story" ${data.affiliationStudio?'':'disabled'}><option value="">${data.affiliationStudio?'Selecione o conto':'Selecione primeiro o estúdio'}</option>${storyOptions()}</select></div><div class="field full"><label>*Progenitor</label><select id="progenitor" ${data.affiliationStory?'':'disabled'}><option value="">${data.affiliationStory?'Selecione o progenitor':'Selecione primeiro o conto'}</option>${progenitorOptions()}</select><div class="help">A lista é carregada do Firebase e segue Estúdio → Conto → Progenitor.</div></div></div><div class="notice" style="margin-top:14px"><strong>Royal ou Rebel?</strong><div class="choice-row" style="margin-top:10px"><div class="choice"><input id="royal" name="alignment" type="radio" value="Royal" ${data.royalRebel==='Royal'?'checked':''}><label for="royal">👑 <strong>Royal</strong><br><small>Descendentes de heróis.</small></label></div><div class="choice"><input id="rebel" name="alignment" type="radio" value="Rebel" ${data.royalRebel==='Rebel'?'checked':''}><label for="rebel">🖤 <strong>Rebel</strong><br><small>Descendentes de vilões.</small></label></div></div></div><div class="player-actions" style="margin-top:14px"><a class="player-button secondary" href="filiacoes.html">Ver catálogo de Filiações</a></div>`},
 {title:'Suas Características',subtitle:'Quem é você? É hora da gente descobrir.',body:()=>`<div class="field"><label>*Poderes</label><div class="power-grid">${data.powers.map((p,i)=>`<input id="power${i}" maxlength="100" placeholder="Poder ${i+1}" value="${esc(p)}">`).join('')}</div><div class="help">Cadastre até quatro poderes individualmente.</div></div><div class="field"><label>*Personalidade</label><textarea id="personality" rows="8" placeholder="Conte como seu personagem pensa, age e se relaciona...">${esc(data.personality)}</textarea><div class="help">Mínimo de 5 linhas.</div></div><div class="field"><label>*História</label><textarea id="history" class="big" rows="20" placeholder="Conte a história e o passado do personagem...">${esc(data.history)}</textarea><div class="help">Mínimo de 20 linhas.</div></div>`},
 {title:'Atividades Escolares',subtitle:'Escolha como seu personagem participa da vida de Auradon Prep.',body:()=>`<div class="ficha-grid"><div class="field"><label>*Atividade principal</label><select id="activityPrimary"><option value="">Selecione uma atividade</option>${activityOptions()}</select></div><div class="field"><label>Atividade secundária</label><select id="activitySecondary"><option value="">Nenhuma</option>${activitySecondaryOptions()}</select></div></div><div class="notice">As atividades são carregadas do Firebase. Administradores podem atualizar essa lista sem alterar o formulário.</div>`},
 {title:'Quem é seu Shape?',subtitle:'Coloque o nome do seu Avatar/Shape.',body:()=>`<div class="field"><label>*Nome do Avatar / Shape</label><input id="shape" maxlength="120" value="${esc(data.shape)}" placeholder="Ator, atriz, modelo ou pessoa usada como shape"></div>`},
 {title:'Hora da Foto',subtitle:'Selecione uma foto bonita para seu personagem, lembrando que ele vai aparecer na página alunos e no seu card de identificação então capriche.',body:()=>`<div class="field"><label>*Foto do personagem</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp"><div class="help">A foto será comprimida no navegador e armazenada diretamente no Realtime Database, vinculada à ficha. Nenhum Firebase Storage é usado.</div><div id="preview" class="preview-box" style="margin-top:14px">${data.avatarUrl?`<img src="${esc(data.avatarUrl)}" alt="Prévia">`:''}</div></div><div class="notice">Antes de criar a ficha, confira todas as etapas. Depois do envio, ela ficará <strong>Em análise</strong> até a avaliação administrativa.</div>`}
];

function studioOptions(){return [...new Set(Object.values(affiliations).map(a=>a?.studio).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(s=>`<option value="${esc(s)}" ${data.affiliationStudio===s?'selected':''}>${esc(s)}</option>`).join('')}
function storyOptions(){return [...new Set(Object.values(affiliations).filter(a=>a?.studio===data.affiliationStudio).map(a=>a?.story).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(s=>`<option value="${esc(s)}" ${data.affiliationStory===s?'selected':''}>${esc(s)}</option>`).join('')}
function progenitorOptions(){return Object.entries(affiliations).filter(([,a])=>a?.studio===data.affiliationStudio&&a?.story===data.affiliationStory).sort((a,b)=>String(a[1]?.name||'').localeCompare(String(b[1]?.name||''),'pt-BR')).map(([key,a])=>{const max=Number(a.maxChildren??a.maxFilhos??3)||3;const rawCount=Number(slotCounts[key]??a.currentChildren??0)||0;const isCurrent=editingExisting&&data.affiliationKey===key;const count=Math.max(0,rawCount-(isCurrent?1:0));const full=count>=max;const label=`${String(count).padStart(2,'0')}/${String(max).padStart(2,'0')} — ${full?'Indisponível':'Disponível'}`;return `<option value="${esc(a.name)}" data-key="${esc(key)}" ${full?'disabled':''} ${data.progenitors===a.name&&!full?'selected':''}>${esc(a.name)} · ${label}</option>`}).join('')}
function activityList(){return Object.values(activities).filter(a=>a!==false&&(a?.active!==false)).map(a=>typeof a==='string'?a:a?.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'))}
function activityOptions(){return activityList().map(a=>`<option value="${esc(a)}" ${data.activityPrimary===a?'selected':''}>${esc(a)}</option>`).join('')}
function activitySecondaryOptions(){return activityList().map(a=>`<option value="${esc(a)}" ${data.activitySecondary===a?'selected':''}>${esc(a)}</option>`).join('')}
function fieldError(id,message){const el=$(id);if(!el)return;if(message){el.closest('.field')?.classList.add('invalid');el.setAttribute('aria-invalid','true')}else{el.closest('.field')?.classList.remove('invalid');el.removeAttribute('aria-invalid')}}
function clearFieldErrors(){document.querySelectorAll('.field.invalid').forEach(x=>x.classList.remove('invalid'));document.querySelectorAll('[aria-invalid="true"]').forEach(x=>x.removeAttribute('aria-invalid'))}

function render(){const s=steps[step];$('stepper').innerHTML=labels.map((x,i)=>`<div class="step-dot ${i===step?'active':''} ${i<step?'done':''}" title="${x}"></div>`).join('');$('stepCard').innerHTML=`<div class="kicker">ETAPA ${step+1} DE 6 · ${labels[step]}</div><h1>${s.title}</h1><p class="subtitle">${s.subtitle}</p><div class="ficha-form">${s.body()}<div id="formError" class="ficha-error"></div><div id="savedNote" class="saved-note">${loadedDraft?'Rascunho carregado.':''}</div><div class="ficha-actions"><button id="backBtn" class="ficha-button secondary" type="button">${step?'← Voltar':'← Início'}</button><button id="nextBtn" class="ficha-button" type="button">${step===5?'Criar Ficha ✦':'Continuar →'}</button></div></div>`
  if(step===2){['personality','history'].forEach(id=>$(id)?.addEventListener('input',refreshStep2Validation));}
}


function collect(){const val=id=>$(id)?.value?.trim()||'';if(step===0){data.characterName=val('characterName');data.characterAge=val('characterAge');data.sexuality=val('sexuality')}if(step===1){data.affiliationStudio=val('studio');data.affiliationStory=val('story');data.progenitors=val('progenitor');data.royalRebel=document.querySelector('input[name="alignment"]:checked')?.value||'';const o=$('progenitor')?.selectedOptions?.[0];data.affiliationKey=o?.dataset?.key||data.affiliationKey||'';data.fairyTale=data.affiliationStory}if(step===2){data.powers=[0,1,2,3].map(i=>val('power'+i));data.personality=val('personality');data.history=val('history')}if(step===3){data.activityPrimary=val('activityPrimary');data.activitySecondary=val('activitySecondary')}if(step===4)data.shape=val('shape')}
function lines(v){
  const text=String(v||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  if(!text)return 0;
  return text.split('\n').map(x=>x.trim()).filter(Boolean).length;
}
function visualLines(el){
  if(!el)return 0;
  const text=String(el.value||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  if(!text)return 0;
  const cs=getComputedStyle(el);
  const mirror=document.createElement('div');
  mirror.setAttribute('aria-hidden','true');
  mirror.style.position='fixed';mirror.style.left='-100000px';mirror.style.top='0';mirror.style.visibility='hidden';
  mirror.style.boxSizing='border-box';mirror.style.width=el.clientWidth+'px';
  mirror.style.padding=cs.padding;mirror.style.border=cs.border;
  mirror.style.font=cs.font;mirror.style.fontFamily=cs.fontFamily;mirror.style.fontSize=cs.fontSize;mirror.style.fontWeight=cs.fontWeight;mirror.style.fontStyle=cs.fontStyle;mirror.style.letterSpacing=cs.letterSpacing;
  mirror.style.lineHeight=cs.lineHeight;mirror.style.whiteSpace='pre-wrap';mirror.style.overflowWrap='break-word';mirror.style.wordBreak=cs.wordBreak;mirror.style.tabSize=cs.tabSize;
  document.body.appendChild(mirror);
  let count=0;
  text.split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{
    const span=document.createElement('span');
    span.textContent=line;
    mirror.appendChild(span);
    count+=Math.max(1,span.getClientRects().length);
    mirror.appendChild(document.createElement('br'));
  });
  mirror.remove();
  return Math.max(lines(text),count);
}
function contentLines(id){const el=$(id);return Math.max(lines(el?.value),visualLines(el));}
function validate(){collect();const e=$('formError');clearFieldErrors();e.textContent='';let first=null;const fail=(id,msg)=>{fieldError(id,msg);if(!first)first=$(id);if(e&&!e.textContent)e.textContent=msg};
 if(step===0){if(!data.characterName)fail('characterName','Preencha o nome do personagem.');if(!data.characterAge)fail('characterAge','Preencha a idade do personagem.');else if(!Number.isInteger(Number(data.characterAge))||+data.characterAge<14||+data.characterAge>22)fail('characterAge','Idade permitida de 14 a 22 anos');if(!data.sexuality)fail('sexuality','Preencha a sexualidade.');}
 if(step===1){if(!data.affiliationStudio)fail('studio','Selecione um estúdio.');if(!data.affiliationStory)fail('story','Selecione um conto/propriedade.');if(!data.progenitors||!data.affiliationKey)fail('progenitor','Selecione um progenitor disponível.');if(!data.royalRebel){e.textContent=e.textContent||'Escolha Royal ou Rebel.';document.querySelector('.choice-row')?.classList.add('invalid-choice')}else document.querySelector('.choice-row')?.classList.remove('invalid-choice');const a=affiliations[data.affiliationKey];if(a){const max=Number(a.maxChildren??a.maxFilhos??3)||3;const rawCount=Number(slotCounts[data.affiliationKey]??a.currentChildren??0)||0;const count=Math.max(0,rawCount-(editingExisting?1:0));if(count>=max)fail('progenitor',`Filiação indisponível: ${count}/${max} vagas ocupadas.`)}}
 if(step===2){if(!data.powers.some(Boolean))fail('power0','Informe pelo menos um poder.');if(contentLines('personality')<5)fail('personality','A personalidade precisa ter no mínimo 5 linhas.');if(contentLines('history')<20)fail('history','A história precisa ter no mínimo 20 linhas.');}
 if(step===3){if(!data.activityPrimary)fail('activityPrimary','Escolha uma atividade principal.');if(data.activitySecondary&&data.activitySecondary===data.activityPrimary)fail('activitySecondary','A atividade secundária deve ser diferente da principal.');}
 if(step===4&&!data.shape)fail('shape','Informe o nome do Avatar/Shape.');if(step===5&&!data.avatarUrl){e.textContent=e.textContent||'Selecione uma foto do personagem.';fieldError('photo',e.textContent)}
 if(first)first.focus();return !first&&!(document.querySelector('.invalid-choice'))}

function refreshStep2Validation(){
  if(step!==2)return;
  collect();
  const e=$('formError');
  if(!e)return;
  const personalityOk=contentLines('personality')>=5;
  const historyOk=contentLines('history')>=20;
  fieldError('personality',personalityOk?'':'A personalidade precisa ter no mínimo 5 linhas.');
  fieldError('history',historyOk?'':'A história precisa ter no mínimo 20 linhas.');
  if(personalityOk&&historyOk)e.textContent='';
  else if(!personalityOk)e.textContent='A personalidade precisa ter no mínimo 5 linhas.';
  else e.textContent='A história precisa ter no mínimo 20 linhas.';
}

function payload(status='rascunho'){const now=Date.now();return {...data,ownerUid:user.uid,playerName:user.displayName||user.email?.split('@')[0]||'Jogador',status,step,stepLabel:labels[step],powersList:data.powers.filter(Boolean),powers:data.powers.filter(Boolean).join('\n'),createdAt:data.createdAt||now,updatedAt:now}}
async function ensureDraft(){if(!draftId)draftId=push(ref(db,`site/fichasRascunhos/${user.uid}`)).key;return draftId}
async function saveDraft(){
  if(!user)return;
  collect();
  if(fichaId&&editingExisting){
    const existingSnap=await get(ref(db,`site/fichas/${fichaId}`));
    if(!existingSnap.exists())throw Error('A ficha original não foi encontrada. Nenhum registro foi apagado.');
    const existing=existingSnap.val()||{};
    if(existing.ownerUid!==user.uid)throw Error('Esta ficha não pertence ao usuário atual.');
    if(existing.status!=='altere_sua_ficha')throw Error('Esta ficha não está disponível para revisão.');
    const p=payload('altere_sua_ficha');
    p.fichaId=fichaId;
    p.rejectionReason=existing.rejectionReason||data.rejectionReason||'';
    p.rejectionType=existing.rejectionType||data.rejectionType||'revisao';
    p.reviewedAt=existing.reviewedAt||data.reviewedAt||0;
    p.approvalHistory=existing.approvalHistory||data.approvalHistory||[];
    await update(ref(db,`site/fichas/${fichaId}`),p);
    await ensureDraft();
    await update(ref(db,`site/fichasRascunhos/${user.uid}/${draftId}`),{...p,status:'rascunho',sourceFichaId:fichaId,reviewMessage:p.rejectionReason});
  }else{
    await ensureDraft();
    const p=payload('rascunho');
    await set(ref(db,`site/fichasRascunhos/${user.uid}/${draftId}`),p);
  }
  const n=$('savedNote');if(n)n.textContent='Progresso salvo automaticamente.'
}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveDraft().catch(()=>{}),650)}

function compressImage(file){return new Promise((resolve,reject)=>{if(!file)return reject(Error('Anexe uma imagem.'));if(!file.type.startsWith('image/'))return reject(Error('Selecione uma imagem válida.'));if(file.size>8*1024*1024)return reject(Error('A imagem original deve ter no máximo 8 MB.'));const img=new Image(),reader=new FileReader();reader.onload=()=>{img.onload=()=>{const max=720,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);let quality=.76,url=c.toDataURL('image/jpeg',quality);while(url.length>900000&&quality>.45){quality-=.06;url=c.toDataURL('image/jpeg',quality)}if(url.length>1100000)return reject(Error('A foto ficou grande demais para o banco. Escolha uma imagem mais simples.'));resolve(url)};img.onerror=()=>reject(Error('Não foi possível ler a imagem.'));img.src=reader.result};reader.onerror=()=>reject(Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file)})}

async function load(){user=await requireAuth();const [a,b,c]=await Promise.all([get(ref(db,'site/filiacoes')),get(ref(db,'site/atividades')),get(ref(db,'site/alunos'))]);affiliations=a.val()||{};activities=b.val()||{};const students=c.val()||{};slotCounts={};Object.entries(students).forEach(([,s])=>{if(!s)return;const k=s.affiliationKey;if(k)slotCounts[k]=(slotCounts[k]||0)+1});
 if(!Object.keys(activities).length){try{const r=await fetch('atividades-iniciais.json');activities=await r.json()}catch(_){activities={}}}
 if(fichaId){
   const snap=await get(ref(db,`site/fichas/${fichaId}`));
   if(snap.exists()&&snap.val().ownerUid===user.uid){
     const saved=snap.val();
     if(saved.status==='aprovada'){location.replace('home.html');return}
     Object.assign(data,saved);
     data.powers=Array.isArray(saved.powersList)?saved.powersList.slice(0,4):String(saved.powers||'').split(/\r?\n/).slice(0,4);
     const draftSnap=await get(ref(db,`site/fichasRascunhos/${user.uid}/${fichaId}`));
     if(draftSnap.exists()&&draftSnap.val().sourceFichaId===fichaId&&Number(draftSnap.val().updatedAt||0)>Number(saved.updatedAt||0)){
       const newer=draftSnap.val();Object.assign(data,newer);data.powers=Array.isArray(newer.powersList)?newer.powersList.slice(0,4):String(newer.powers||'').split(/\r?\n/).slice(0,4);draftId=fichaId;
     }else{draftId=fichaId;}
     editingExisting=saved.status==='altere_sua_ficha';
     step=Math.min(Number(data.step)||0,5);loadedDraft=true;return;
   }
   const draftSnap=await get(ref(db,`site/fichasRascunhos/${user.uid}/${fichaId}`));
   if(draftSnap.exists()){const saved=draftSnap.val();Object.assign(data,saved);data.powers=Array.isArray(saved.powersList)?saved.powersList.slice(0,4):String(saved.powers||'').split(/\r?\n/).slice(0,4);draftId=fichaId;if(saved.sourceFichaId)fichaId=saved.sourceFichaId;editingExisting=!!fichaId;step=Math.min(Number(data.step)||0,5);loadedDraft=true;return}
   location.replace('home.html');return;
 }
 if(draftId){
   const s=await get(ref(db,`site/fichasRascunhos/${user.uid}/${draftId}`));
   if(s.exists()){
     const saved=s.val();Object.assign(data,saved);data.powers=Array.isArray(saved.powersList)?saved.powersList.slice(0,4):String(saved.powers||'').split(/\r?\n/).slice(0,4);
     if(saved.sourceFichaId){fichaId=saved.sourceFichaId;editingExisting=true;const original=await get(ref(db,`site/fichas/${fichaId}`));if(original.exists()&&original.val().ownerUid===user.uid&&original.val().status==='altere_sua_ficha'){const canonical=original.val();if(Number(canonical.updatedAt||0)>=Number(saved.updatedAt||0)){Object.assign(data,canonical);data.powers=Array.isArray(canonical.powersList)?canonical.powersList.slice(0,4):String(canonical.powers||'').split(/\r?\n/).slice(0,4);}}}
     step=Math.min(Number(data.step)||0,5);loadedDraft=true;
   }
 }
 if(!draftId){const s=await get(ref(db,`site/fichasRascunhos/${user.uid}`));const all=s.val()||{};const returned=Object.entries(all).find(([,v])=>v&&v.sourceFichaId&&v.status==='rascunho');if(returned){draftId=returned[0];const saved=returned[1];fichaId=saved.sourceFichaId;editingExisting=true;const original=await get(ref(db,`site/fichas/${fichaId}`));const source=original.exists()&&original.val().ownerUid===user.uid?original.val():saved;Object.assign(data,source);data.powers=Array.isArray(source.powersList)?source.powersList.slice(0,4):String(source.powers||'').split(/\r?\n/).slice(0,4);step=Math.min(Number(source.step)||0,5);loadedDraft=true}}}

$('startBtn').onclick=()=>{$('intro').hidden=true;$('formWrap').hidden=false;render()};
$('formWrap').addEventListener('click',async e=>{if(e.target.id==='backBtn'){collect();if(step===0){await saveDraft().catch(()=>{});$('formWrap').hidden=true;$('intro').hidden=false}else{step--;render();scheduleSave()}}if(e.target.id==='nextBtn'){if(!validate())return;if(step<5){await saveDraft();step++;render();}else{try{for(const target of [0,1,2,3,4,5]){step=target;render();if(!validate())throw Error('Revise os campos obrigatórios antes de enviar a ficha.')}step=5;render();await saveDraft();const id=fichaId||push(ref(db,'site/fichas')).key;const final=payload('em_analise');final.fichaId=id;final.submittedAt=Date.now();final.step=5;final.stepLabel='Foto';if(fichaId){const existingSnap=await get(ref(db,`site/fichas/${fichaId}`));if(!existingSnap.exists())throw Error('A ficha original não foi encontrada. Nenhum registro foi substituído.');const existing=existingSnap.val()||{};if(existing.ownerUid!==user.uid)throw Error('Esta ficha não pertence ao usuário atual.');final.createdAt=existing.createdAt||data.createdAt||Date.now();final.studentKey=existing.studentKey||data.studentKey||'';final.approvalHistory=existing.approvalHistory||[];final.rejectionReason='';final.rejectionType='';final.reviewedAt=existing.reviewedAt||data.reviewedAt||0;await update(ref(db,`site/fichas/${id}`),final)}else{await set(ref(db,`site/fichas/${id}`),final)}if(draftId)await remove(ref(db,`site/fichasRascunhos/${user.uid}/${draftId}`));location.replace('home.html')}catch(err){$('formError').textContent=err.message||'Não foi possível enviar a ficha.'}}}});
$('formWrap').addEventListener('input',e=>{if(e.target.id==='studio'){data.affiliationStudio=e.target.value;data.affiliationStory='';data.progenitors='';data.affiliationKey='';render()}else if(e.target.id==='story'){data.affiliationStory=e.target.value;data.progenitors='';data.affiliationKey='';render()}else {if(e.target.id==='characterAge'){const n=Number(e.target.value);if(Number.isInteger(n)&&n>=14&&n<=22)fieldError('characterAge','');else if(e.target.value)fieldError('characterAge','Idade permitida de 14 a 22 anos')}scheduleSave()}});
$('formWrap').addEventListener('change',async e=>{if(e.target.id==='photo'){try{data.avatarUrl=await compressImage(e.target.files[0]);render()}catch(err){$('formError').textContent=err.message}}else scheduleSave()});
window.addEventListener('pagehide',()=>{if(user)saveDraft().catch(()=>{})});
load().catch(e=>{if(e.message!=='AUTH_REQUIRED'){$('intro').innerHTML='<div class="ficha-error">Não foi possível carregar a criação da ficha. Verifique a conexão com o Firebase.</div>'}});
