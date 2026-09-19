
import {db} from "./firebase-init.js";
import {ref,onValue} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

let maintenanceActive=false;
window.__maintenanceActive=false;

function setMaintenance(active){
  maintenanceActive=!!active;
  window.__maintenanceActive=maintenanceActive;
  document.documentElement.dataset.maintenanceActive=maintenanceActive?"true":"false";
  document.body?.classList.toggle("maintenance-active",maintenanceActive);
  const overlay=document.getElementById("siteMaintenanceOverlay");
  if(overlay) overlay.classList.toggle("is-active",maintenanceActive);
  if(maintenanceActive){
    document.documentElement.classList.add("maintenance-mode");
    document.body?.classList.add("maintenance-mode");
  }else{
    document.documentElement.classList.remove("maintenance-mode");
    document.body?.classList.remove("maintenance-mode");
  }
}

function ensureOverlay(){
  if(document.getElementById("siteMaintenanceOverlay")) return;
  const overlay=document.createElement("div");
  overlay.id="siteMaintenanceOverlay";
  overlay.setAttribute("role","alert");
  overlay.setAttribute("aria-label","Site em manutenção");
  overlay.innerHTML='<img src="./site-maintenance.png" alt="Site em manutenção">';
  document.body.appendChild(overlay);
}
ensureOverlay();

onValue(ref(db,"site/manutencao/ativo"),snap=>{
  setMaintenance(snap.val()===true);
},err=>{
  console.error("Firebase manutenção:",err);
  setMaintenance(false);
});
