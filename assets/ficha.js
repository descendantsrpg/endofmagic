const dbmod=await import('./firebase-init.js');
const rtdb=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js');
const {db}=dbmod;
const {ref,push,set,get,update,onValue}=rtdb;
const $=id=>document.getElementById(id);
const accessKey='descendentes_ficha_access';
const normLogin=v=>norm(v);
async function hashPassword(value){const data=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}

let editingId=new URLSearchParams(location.search).get('id')||'';
let editingData=null;
let affiliations={};
let students={};
let selectedAffiliation=null;

const fairyTales=[
  ['DISNEY','Aladdin'],['DISNEY','Anastácia'],['DISNEY','Alice no País das Maravilhas'],['DISNEY','A Bela e a Fera'],['DISNEY','Bela Adormecida'],['DISNEY','Branca de Neve e os Sete Anões'],['DISNEY','Cinderella'],['DISNEY','Chapeuzinho Vermelho'],['DISNEY','Detona Ralph'],['DISNEY','Enrolados'],['DISNEY','Fantasia'],['DISNEY','Frozen'],['DISNEY','Hércules'],['DISNEY','O Livro da Selva'],['DISNEY','Moana'],['DISNEY','Mulan'],['DISNEY','Peter Pan'],['DISNEY','A Pequena Sereia'],['DISNEY','Pinóquio'],['DISNEY','A Princesa e o Sapo'],['DISNEY','Pocahontas'],['DISNEY','O Quebra-Nozes e os Quatro Reinos'],['DISNEY','O Rei Leão'],['DISNEY','Robin Hood'],['DISNEY','Segredo das Fadas'],['DISNEY','101 Dálmatas'],
  ['DREAMWORKS','Como Treinar o Seu Dragão'],['DREAMWORKS','Kung Fu Panda'],['DREAMWORKS','Madagascar'],['DREAMWORKS','A Origem dos Guardiões'],['DREAMWORKS','Shrek'],
  ['SONY','Hotel Transilvânia'],
  ['UNIVERSAL STUDIOS','Pica-Pau'],
  ['WARNER','Looney Tunes'],
  ['NICKELODEON','Bob Esponja'],
  ['MATTEL','Barbie: Life in the Dreamhouse']
];

const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const chosen=name=>[...document.querySelectorAll('input[name="'+name+'"]:checked')].map(x=>x.value);

function imageData(file){return new Promise((resolve,reject)=>{if(!file)return reject(Error('Anexe uma imagem.'));if(file.size>8*1024*1024)return reject(Error('A imagem deve ter no máximo 8 MB.'));const im=new Image();const rd=new FileReader();rd.onload=()=>{im.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.78))};im.onerror=()=>reject(Error('Não foi possível ler a imagem.'));im.src=rd.result};rd.onerror=()=>reject(Error('Não foi possível ler a imagem.'));rd.readAsDataURL(file)})}
function count(id,out,min,label){const n=lines($(id).value).length;$(out).textContent=n+'/'+min+' '+label;return n>=min}

function renderFairyTales(){
  const select=$('fairyTale');
  const previous=select.value;
  const studios={};
  for(const [studio,story] of fairyTales){(studios[studio]??=[]).push(story)}
  select.innerHTML='<option value="">Selecione o estúdio e o conto de fada...</option>';
  for(const [studio,stories] of Object.entries(studios)){
    const group=document.createElement('optgroup');group.label=studio;
    for(const story of stories){const o=document.createElement('option');o.value=studio+'::'+story;o.textContent=studio+' — '+story;group.appendChild(o)}
    select.appendChild(group)
  }
  if(previous)select.value=previous;
}
function currentCount(key,a){
  const arr=Object.values(students||{}).filter(Boolean);
  return arr.filter(s=>s.affiliationKey===key || (norm(s.filiation||s.progenitors)===norm(a.name||'')&&norm(s.affiliationStudio||s.studio)===norm(a.studio||'')&&norm(s.affiliationStory||s.story)===norm(a.story||''))).length;
}
function refreshProgenitors(preferredKey=''){
  const storyValue=$('fairyTale').value;
  const sel=$('progenitors');
  const status=$('progenitorStatus');
  const summary=$('fairyTaleSummary');
  selectedAffiliation=null;
  sel.innerHTML='';
  if(!storyValue){sel.disabled=true;sel.innerHTML='<option value="">Primeiro selecione um conto de fada...</option>';status.className='filiation-status wait';status.textContent='Selecione um conto de fada para consultar as filiações disponíveis.';summary.className='selection-summary';summary.innerHTML='';return}
  const [studio,story]=storyValue.split('::');
  summary.className='selection-summary show';summary.innerHTML='<span class="selection-chip">Estúdio: <b>'+esc(studio)+'</b></span><span class="selection-chip">Conto: <b>'+esc(story)+'</b></span>';
  const matches=Object.entries(affiliations||{}).map(([key,a])=>({key,a:a||{}})).filter(x=>norm(x.a.studio||x.a.franquia)===norm(studio)&&norm(x.a.story||x.a.conto||x.a.fairyTale)===norm(story));
  matches.sort((a,b)=>String(a.a.name||'').localeCompare(String(b.a.name||''),'pt-BR',{sensitivity:'base'}));
  if(!matches.length){sel.disabled=true;sel.innerHTML='<option value="">Nenhuma filiação cadastrada para este conto</option>';status.className='filiation-status full';status.textContent='Nenhuma filiação cadastrada no banco de dados para este conto. Consulte a administração para verificar a disponibilidade.';return}
  sel.disabled=false;sel.innerHTML='<option value="">Selecione sua filiação / progenitores...</option>';
  for(const x of matches){
    const max=Number(x.a.maxChildren??x.a.maxFilhos??3)||3;
    const current=currentCount(x.key,x.a);
    const full=current>=max;
    const o=document.createElement('option');o.value=x.key;o.disabled=full;o.textContent=full?'🔴 Filiação Temporariamente Indisponível — '+(x.a.name||'Sem nome')+' ('+current+'/'+max+')':(x.a.name||'Sem nome')+' — '+current+'/'+max+' disponíveis';
    sel.appendChild(o);
  }
  if(preferredKey&&matches.some(x=>x.key===preferredKey)){sel.value=preferredKey;selectedAffiliation=matches.find(x=>x.key===preferredKey);showAffiliationStatus()}
  else{status.className='filiation-status';status.textContent='Escolha uma filiação disponível. As opções em vermelho estão lotadas e não podem ser selecionadas.'}
}
function showAffiliationStatus(){
  const key=$('progenitors').value;const status=$('progenitorStatus');
  if(!key){status.className='filiation-status';status.textContent='Escolha uma filiação disponível. As opções em vermelho estão lotadas e não podem ser selecionadas.';selectedAffiliation=null;return}
  const a=affiliations[key];if(!a){status.className='filiation-status full';status.textContent='Filiação não encontrada no banco de dados. Selecione outra opção.';selectedAffiliation=null;return}
  const max=Number(a.maxChildren??a.maxFilhos??3)||3,current=currentCount(key,a);selectedAffiliation={key,a,current,max};
  if(current>=max){status.className='filiation-status full';status.textContent='🔴 Filiação Temporariamente Indisponível — '+(a.name||'Sem nome')+' ('+current+'/'+max+'). Esta filiação atingiu o limite de filhos.';return}
  status.className='filiation-status ready';status.textContent='✓ Filiação disponível — '+(a.name||'Sem nome')+' ('+current+'/'+max+'). Vagas sincronizadas com o banco de dados.';
}

renderFairyTales();
for(const [id,out,min,label] of [['powers','powersCount',4,'poderes'],['personality','personalityCount',5,'linhas'],['history','historyCount',10,'linhas']])$(id).addEventListener('input',()=>count(id,out,min,label));
$('avatar').onchange=()=>{const f=$('avatar').files[0];$('avatarPreview').innerHTML=f?'<img src="'+URL.createObjectURL(f)+'" alt="Prévia do avatar">':''};
$('fairyTale').onchange=()=>refreshProgenitors();
$('progenitors').onchange=()=>showAffiliationStatus();

onValue(ref(db,'site/filiacoes'),snap=>{affiliations=snap.val()||{};refreshProgenitors($('progenitors').value);},err=>{console.error(err);$('progenitorStatus').className='filiation-status full';$('progenitorStatus').textContent='Não foi possível sincronizar as filiações com o banco de dados.'});
onValue(ref(db,'site/alunos'),snap=>{students=snap.val()||{};refreshProgenitors($('progenitors').value)},err=>console.error(err));

$('accountForm').onsubmit=async e=>{e.preventDefault();const err=$('aboutError');err.textContent='';const btn=$('accountForm').querySelector('button[type=submit]');btn.disabled=true;const login=$('playerName').value.trim();const pass=$('playerPassword').value;const confirm=$('playerPasswordConfirm').value;const av=chosen('availability');try{if(login.length<3)throw Error('O login deve ter pelo menos 3 caracteres.');if(!/^[A-Za-z0-9._-]+$/.test(login))throw Error('Use apenas letras, números, ponto, hífen ou sublinhado no login.');if(!editingId&&pass.length<6)throw Error('A senha deve ter pelo menos 6 caracteres.');if(pass&&pass.length<6)throw Error('A senha deve ter pelo menos 6 caracteres.');if(pass!==confirm)throw Error('As senhas não coincidem.');if(!av.length)throw Error('Escolha pelo menos uma disponibilidade para cena.');const contasSnap=await get(ref(db,'site/contas'));const contas=contasSnap.val()||{};const wanted=normLogin(login);const existing=Object.entries(contas).find(([id,x])=>x&&normLogin(x.login||x.playerName)===''+wanted);if(existing&&existing[0]!==editingData?.accountId)throw Error('Esse login já está em uso. Escolha outro.');let accountId=editingData?.accountId||existing?.[0]||push(ref(db,'site/contas')).key;const passwordHash=pass?await hashPassword(pass):(existing?.[1]?.passwordHash||editingData?.passwordHash||'');if(!passwordHash)throw Error('Crie uma senha para sua conta.');const accountData={login,loginLower:wanted,passwordHash,playerAge:Number($('playerAge').value),availability:av,status:'criando_ficha',fichaId:editingId||existing?.[1]?.fichaId||'',updatedAt:Date.now(),createdAt:existing?.[1]?.createdAt||editingData?.createdAt||Date.now()};await set(ref(db,'site/contas/'+accountId),accountData);editingData={...(editingData||{}),accountId,passwordHash};$('accountForm').dataset.accountId=accountId;err.textContent='';$('screen1').classList.remove('active');$('screen2').classList.add('active');$('step1').classList.remove('active');$('step2').classList.add('active');scrollTo({top:0,behavior:'smooth'})}catch(e){console.error(e);err.textContent=e.message||'Não foi possível criar/sincronizar sua conta. Verifique sua conexão com o banco de dados.'}finally{btn.disabled=false}};
$('backBtn').onclick=()=>{$('screen2').classList.remove('active');$('screen1').classList.add('active');$('step2').classList.remove('active');$('step1').classList.add('active');scrollTo({top:0,behavior:'smooth'})};

async function loadEdit(){
  if(!editingId)return;
  try{
    const token=JSON.parse(localStorage.getItem(accessKey)||'null')?.token;const s=await get(ref(db,'site/fichas/'+editingId));const x=s.val();
    if(!x||x.accessToken!==token||x.status==='aprovada'){editingId='';return}
    editingData=x;
    if(x.accountId)$('accountForm').dataset.accountId=x.accountId;
    $('playerName').value=x.login||x.playerName||'';$('playerAge').value=x.playerAge||'';$('playerPassword').placeholder='Deixe em branco para manter a senha atual';$('playerPasswordConfirm').placeholder='Repita somente se quiser trocar a senha';
    for(const v of x.availability||[]){const el=[...document.querySelectorAll('input[name="availability"]')].find(i=>i.value===v);if(el)el.checked=true}
    $('charName').value=x.characterName||'';$('charAge').value=x.characterAge||'';$('sexuality').value=x.sexuality||'';
    const savedStudio=x.affiliationStudio||x.studio||'';const savedStory=x.fairyTale||x.affiliationStory||x.story||'';
    if(savedStudio&&savedStory){const target=savedStudio+'::'+savedStory;if(![...$('fairyTale').options].some(o=>o.value===target)){const o=document.createElement('option');o.value=target;o.textContent=savedStudio+' — '+savedStory;$('fairyTale').appendChild(o)}$('fairyTale').value=target;refreshProgenitors(x.affiliationKey||'')}
    else refreshProgenitors(x.affiliationKey||'');
    $('royalRebel').value=x.royalRebel||'';
    for(const v of x.extracurriculars||[]){const el=[...document.querySelectorAll('input[name="extracurricular"]')].find(i=>i.value===v);if(el)el.checked=true}
    $('powers').value=x.powers||'';$('personality').value=x.personality||'';$('history').value=x.history||'';
    count('powers','powersCount',4,'poderes');count('personality','personalityCount',5,'linhas');count('history','historyCount',10,'linhas');$('avatarConfirm').checked=true;
    if(x.avatarUrl)$('avatarPreview').innerHTML='<img src="'+esc(x.avatarUrl)+'" alt="Avatar atual">';
    $('screen1').classList.add('active');$('screen2').classList.remove('active');
  }catch(e){editingId=''}
}

$('characterForm').onsubmit=async e=>{
  e.preventDefault();const err=$('charError');err.textContent='';
  const av=chosen('availability'),extra=chosen('extracurricular'),p=lines($('powers').value),pers=lines($('personality').value),hist=lines($('history').value);
  if(!av.length){err.textContent='Informe sua disponibilidade para cena.';return}if(Number($('charAge').value)<14||Number($('charAge').value)>22){err.textContent='A idade do personagem deve estar entre 14 e 22 anos.';return}
  if(!extra.length||extra.length>2){err.textContent='Escolha 1 atividade principal e, no máximo, 1 secundária.';return}
  if(!$('fairyTale').value){err.textContent='Selecione o estúdio e o conto de fada do seu personagem.';return}
  if(!$('progenitors').value){err.textContent='Selecione uma filiação / progenitor disponível.';return}
  const a=affiliations[$('progenitors').value];
  if(!a){err.textContent='A filiação selecionada não está mais disponível no banco de dados. Atualize a página e escolha outra.';return}
  const max=Number(a.maxChildren??a.maxFilhos??3)||3,current=currentCount($('progenitors').value,a);
  if(current>=max){showAffiliationStatus();err.textContent='Esta filiação acabou de atingir o limite de filhos. Escolha outra filiação disponível.';return}
  if(p.length<4){err.textContent='Informe pelo menos 4 poderes/habilidades, um por linha.';return}
  if(pers.length<5){err.textContent='A personalidade precisa ter pelo menos 5 linhas.';return}
  if(hist.length<10){err.textContent='A história precisa ter pelo menos 10 linhas.';return}
  if(!$('avatarConfirm').checked){err.textContent='Confirme a regra do avatar.';return}
  const f=$('avatar').files[0];$('characterForm').querySelector('button[type="submit"]').disabled=true;
  try{
    let avatar=editingData?.avatarUrl||'';if(f)avatar=await imageData(f);if(!avatar)throw Error('Anexe o avatar do personagem.');
    const token=editingData?.accessToken||crypto.randomUUID();const id=editingId||push(ref(db,'site/fichas')).key;const [studio,story]=$('fairyTale').value.split('::');
    const login=$('playerName').value.trim();const accountId=$('accountForm').dataset.accountId||editingData?.accountId||'';const password=$('playerPassword').value;let passwordHash=editingData?.passwordHash||'';if(password)passwordHash=await hashPassword(password);if(!passwordHash)throw Error('Crie uma senha para sua conta.');
    const data={playerName:login,login,loginLower:normLogin(login),passwordHash,accountId,playerAge:Number($('playerAge').value),availability:av,characterName:$('charName').value.trim(),characterAge:Number($('charAge').value),sexuality:$('sexuality').value.trim(),fairyTale:story,affiliationStudio:studio,affiliationStory:story,affiliationKey:$('progenitors').value,progenitors:a.name||'',filiation:a.name||'',royalRebel:$('royalRebel').value,extracurriculars:extra,powers:p.join('\n'),personality:pers.join('\n'),history:hist.join('\n'),avatarUrl:avatar,accessToken:token,status:'em_analise',rejectionReason:'',updatedAt:Date.now(),submittedAt:editingData?.submittedAt||Date.now()};
    if(editingId)await update(ref(db,'site/fichas/'+id),data);else await set(ref(db,'site/fichas/'+id),{...data,createdAt:Date.now()});
    if(accountId)await update(ref(db,'site/contas/'+accountId),{login,loginLower:normLogin(login),passwordHash,playerAge:Number($('playerAge').value),availability:av,status:'ficha_em_analise',fichaId:id,updatedAt:Date.now()});
    localStorage.setItem(accessKey,JSON.stringify({id,token}));$('screen2').classList.remove('active');$('done').classList.add('active');$('statusLink').href='ficha-status.html?id='+encodeURIComponent(id);scrollTo({top:0,behavior:'smooth'})
  }catch(e){err.textContent=e.message||'Não foi possível enviar a ficha.'}finally{$('characterForm').querySelector('button[type="submit"]').disabled=false}
};
loadEdit();
