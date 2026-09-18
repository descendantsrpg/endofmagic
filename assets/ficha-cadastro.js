const {db}=await import('../firebase-init.js');
const {ref,get,push,set,update,onValue}=await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js');
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const checked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value);
const activities=['Clube de Esgrima','Clube de Magia','Clube de Alquimia','Clube de Criaturas Mágicas','Clube de Teatro','Clube de Música','Clube de Dança','Clube de Artes','Clube de Investigação','Clube de Estratégia','Clube de História','Clube de Exploração','Clube de Arqueologia Mágica','Clube de Poções e Remédios','Clube de Herbologia','Clube de Arco e Flecha','Clube de Combate','Clube de Voo','Clube de Moda e Design','Clube de Culinária','Clube de Jardinagem','Clube de Literatura','Clube de Escrita','Jornal da Auradon Prep','Clube de Debate','Clube de Diplomacia','Clube de Voluntariado','Clube de Tecnologia','Clube de Invenções','Clube de Jogos','Clube de Esportes','Grêmio Estudantil','Clube da Coroa'];
let affiliations={},students={},accountId='',accountData={};
const accessKey='descendentes_ficha_access';
async function hashPassword(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function showStep(n){document.querySelectorAll('.ficha-step').forEach(x=>x.classList.toggle('active',x.dataset.panel===String(n)));document.querySelectorAll('.progress-step').forEach(x=>x.classList.toggle('active',x.dataset.step===String(n)));window.scrollTo({top:0,behavior:'smooth'})}
function fillActivities(){for(const id of ['activityPrimary','activitySecondary']){const s=$(id);for(const a of activities){const o=document.createElement('option');o.value=a;o.textContent=a;s.appendChild(o)}}}
function countLines(id,out,min,label){const n=lines($(id).value).length;$(out).textContent=`${n}/${min} ${label}`;return n>=min}
function countPowers(){const n=lines($('powers').value).length; $('powersCount').textContent=`${n}/4 poderes`; return n<=4}
function currentCount(key,a){return Object.values(students||{}).filter(Boolean).filter(s=>s.affiliationKey===key || (norm(s.filiation||s.progenitors)===norm(a?.name)&&norm(s.affiliationStudio||s.studio)===norm(a?.studio)&&norm(s.affiliationStory||s.story)===norm(a?.story))).length}
function renderAffiliations(){
  const studio=$('studio'), story=$('fairyTale'), progenitor=$('progenitor');
  studio.innerHTML='<option value="">Selecione o estúdio...</option>';
  story.innerHTML='<option value="">Selecione primeiro o estúdio...</option>';
  progenitor.innerHTML='<option value="">Selecione primeiro o conto de fadas...</option>';
  story.disabled=true; progenitor.disabled=true;
  const studios={};
  Object.entries(affiliations||{}).forEach(([key,a])=>{
    if(!a)return;
    const st=a.studio||a.franquia||'Outros';
    const storyName=a.story||a.conto||a.fairyTale||'Outros';
    (studios[st]??={})[storyName]??=[];
    studios[st][storyName].push({key,a});
  });
  Object.keys(studios).sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(st=>{
    const o=document.createElement('option'); o.value=st; o.textContent=st; studio.appendChild(o);
  });
}
function renderStories(){
  const st=$('studio').value, story=$('fairyTale'), progenitor=$('progenitor');
  story.innerHTML='<option value="">Selecione o conto de fadas...</option>';
  progenitor.innerHTML='<option value="">Selecione primeiro o conto de fadas...</option>';
  progenitor.disabled=true; story.disabled=!st;
  if(!st)return;
  const stories={};
  Object.entries(affiliations||{}).forEach(([key,a])=>{
    if(!a)return; const aStudio=a.studio||a.franquia||'Outros';
    const name=a.story||a.conto||a.fairyTale||'Outros';
    if(aStudio===st)(stories[name]??=[]).push({key,a});
  });
  Object.keys(stories).sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(name=>{
    const o=document.createElement('option'); o.value=name; o.textContent=name; story.appendChild(o);
  });
}
function selectAffiliation(){
  const st=$('studio').value, storyName=$('fairyTale').value, s=$('progenitor'), status=$('progenitorStatus');
  s.innerHTML='<option value="">Selecione o progenitor...</option>'; s.disabled=true;
  status.className='filiation-status wait'; status.textContent='Aguardando seleção.';
  if(!st||!storyName)return;
  const items=Object.entries(affiliations||{}).filter(([key,a])=>a && (a.studio||a.franquia||'Outros')===st && (a.story||a.conto||a.fairyTale||'Outros')===storyName);
  if(!items.length){status.textContent='Nenhum progenitor encontrado no banco.';return;}
  items.sort((x,y)=>String(x[1].name||'').localeCompare(String(y[1].name||''),'pt-BR'));
  for(const [key,a] of items){
    const max=Number(a.maxChildren??a.maxFilhos??3)||3, current=currentCount(key,a);
    const o=document.createElement('option'); o.value=key; o.textContent=`${a.name||'Sem nome'} (${current}/${max})`; o.disabled=current>=max; s.appendChild(o);
  }
  s.disabled=false;
}
function updateProgenitorStatus(){
  const key=$('progenitor').value, status=$('progenitorStatus');
  if(!key||!affiliations[key]){status.className='filiation-status wait';status.textContent='Selecione um progenitor.';return;}
  const a=affiliations[key], max=Number(a.maxChildren??a.maxFilhos??3)||3, current=currentCount(key,a);
  status.className=current>=max?'filiation-status full':'filiation-status ready';
  status.textContent=current>=max?`🔴 Progenitor indisponível — ${current}/${max}`:`✓ ${current}/${max} vagas utilizadas — ${Math.max(0,max-current)} vaga(s) disponível(is)`;
}

function refreshCounts(){const st=$('studio').value, story=$('fairyTale').value, key=$('progenitor').value;renderAffiliations();if(st){$('studio').value=st;renderStories();if(story){$('fairyTale').value=story;selectAffiliation();if(key&&affiliations[key]){$('progenitor').value=key;updateProgenitorStatus()}}}}

fillActivities();
['history','personality'].forEach(id=>$(id).addEventListener('input',()=>countLines(id,id+'Count',20,'linhas')));$('powers').addEventListener('input',countPowers);
$('startBtn').onclick=()=>{ $('welcome').classList.remove('active');$('formArea').classList.add('active');showStep(1)};
$('backTo1').onclick=()=>showStep(1);$('backTo2').onclick=()=>showStep(2);$('studio').onchange=renderStories;$('fairyTale').onchange=selectAffiliation;$('progenitor').onchange=updateProgenitorStatus;
$('activityPrimary').onchange=()=>{[...$('activitySecondary').options].forEach(o=>o.hidden=o.value===$('activityPrimary').value)};
$('avatarFile').onchange=()=>{const f=$('avatarFile').files[0];$('avatarPreview').innerHTML=f?`<img src="${URL.createObjectURL(f)}" alt="Prévia do avatar">`:''};

onValue(ref(db,'site/filiacoes'),snap=>{affiliations=snap.val()||{};renderAffiliations()},err=>{console.error(err);$('fairyTale').innerHTML='<option value="">Não foi possível carregar as filiações</option>'});
onValue(ref(db,'site/alunos'),snap=>{students=snap.val()||{};refreshCounts()},err=>console.error(err));

$('accountForm').onsubmit=async e=>{e.preventDefault();const err=$('accountError');err.textContent='';const login=$('login').value.trim();const pass=$('password').value;if(login.length<3)return err.textContent='O login deve ter pelo menos 3 caracteres.';if(!/^[A-Za-z0-9._-]+$/.test(login))return err.textContent='Use apenas letras, números, ponto, hífen ou sublinhado no login.';if(pass.length<6)return err.textContent='A senha deve ter pelo menos 6 caracteres.';if(pass!==$('passwordConfirm').value)return err.textContent='As senhas não coincidem.';try{const snap=await get(ref(db,'site/contas'));const contas=snap.val()||{};if(Object.values(contas).some(x=>x&&norm(x.login)===norm(login)))throw Error('Esse login já está em uso.');accountId=push(ref(db,'site/contas')).key;const passwordHash=await hashPassword(pass);accountData={login,loginLower:norm(login),passwordHash,status:'cadastro_iniciado',createdAt:Date.now(),updatedAt:Date.now()};await set(ref(db,'site/contas/'+accountId),accountData);showStep(2)}catch(x){err.textContent=x.message||'Não foi possível criar sua conta.'}};
$('aboutForm').onsubmit=async e=>{e.preventDefault();const err=$('aboutError');err.textContent='';const age=Number($('playerAge').value),av=checked('availability');if(age<16)return err.textContent='Idade não permitida. Este RPG é recomendado para maiores de 16 anos.';if(!age)return err.textContent='Informe sua idade.';if(!av.length)return err.textContent='Selecione pelo menos uma disponibilidade para cena.';if(!$('playerName').value.trim())return err.textContent='Informe seu nome.';try{await update(ref(db,'site/contas/'+accountId),{playerName:$('playerName').value.trim(),playerAge:age,availability:av,status:'criando_ficha',updatedAt:Date.now()});showStep(3)}catch(x){err.textContent='Não foi possível sincronizar seus dados com o banco de dados.'}};
$('characterForm').onsubmit=async e=>{e.preventDefault();const err=$('characterError');err.textContent='';const powers=lines($('powers').value),history=lines($('history').value),personality=lines($('personality').value),primary=$('activityPrimary').value,secondary=$('activitySecondary').value,key=$('progenitor').value,a=affiliations[key];if(!key||!a)return err.textContent='Selecione um progenitor disponível.';const max=Number(a.maxChildren??a.maxFilhos??3)||3;if(currentCount(key,a)>=max)return err.textContent='Esta filiação acabou de ficar sem vagas. Escolha outra.';if(!primary)return err.textContent='Selecione a atividade extracurricular principal.';if(secondary===primary)return err.textContent='A atividade secundária deve ser diferente da principal.';if(powers.length<1||powers.length>4)return err.textContent='Informe entre 1 e 4 poderes.';if(history.length<20)return err.textContent='A história precisa ter no mínimo 20 linhas.';if(personality.length<20)return err.textContent='A personalidade precisa ter no mínimo 20 linhas.';const file=$('avatarFile').files[0],url=$('avatar').value.trim();if(!url&&!file)return err.textContent='Informe o link do avatar ou faça upload de uma foto.';const btn=$('characterForm').querySelector('button[type=submit]');btn.disabled=true;try{let avatarUrl=url;if(file){if(file.size>6*1024*1024)throw Error('A foto deve ter no máximo 6 MB.');avatarUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Não foi possível ler a foto.'));r.readAsDataURL(file)})}const id=push(ref(db,'site/fichas')).key,token=crypto.randomUUID();const data={accountId,playerName:$('playerName').value.trim(),login:accountData.login,loginLower:norm(accountData.login),passwordHash:accountData.passwordHash,playerAge:Number($('playerAge').value),availability:checked('availability'),characterName:$('characterName').value.trim(),characterAge:Number($('characterAge').value),sexuality:$('sexuality').value.trim(),affiliationKey:key,affiliationStudio:a.studio||a.franquia||'',affiliationStory:a.story||a.conto||a.fairyTale||'',fairyTale:a.story||a.conto||a.fairyTale||'',progenitors:a.name||'',filiation:a.name||'',royalRebel:$('royalRebel').value,extracurriculars:[primary,...(secondary?[secondary]:[])],extracurricularPrimary:primary,extracurricularSecondary:secondary||'',powers:powers.join('\n'),history:history.join('\n'),personality:personality.join('\n'),avatarUrl,status:'em_analise',accessToken:token,createdAt:Date.now(),submittedAt:Date.now(),updatedAt:Date.now()};await set(ref(db,'site/fichas/'+id),data);await update(ref(db,'site/contas/'+accountId),{status:'ficha_em_analise',fichaId:id,updatedAt:Date.now()});localStorage.setItem(accessKey,JSON.stringify({id,token,accountId}));location.href='ficha-concluida.html'}catch(x){err.textContent=x.message||'Não foi possível enviar sua ficha.'}finally{btn.disabled=false}};
