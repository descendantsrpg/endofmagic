/* Global maintenance guard. Firebase is the single source of truth. */
import { db } from './firebase-init.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';

const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
const isMaintenancePage = current === 'manutencao.html';
const isAdminPage = current === 'admin.html' || current === 'admin-acesso.html' || current === 'admin-cadastro.html';

async function checkMaintenance(){
  if(isMaintenancePage || isAdminPage){
    document.documentElement.classList.remove('maintenance-check-pending');
    return;
  }
  try{
    const snap = await Promise.race([
      get(ref(db,'site/manutencao/ativo')),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('MAINTENANCE_CHECK_TIMEOUT')),6000))
    ]);
    if(snap.val() === true){
      location.replace('manutencao.html');
      return;
    }
  }catch(err){
    // If Firebase is temporarily unavailable, do not lock the public site forever.
    console.warn('Verificação de manutenção indisponível:',err);
  }
  document.documentElement.classList.remove('maintenance-check-pending');
}

checkMaintenance();
