
let maintenanceKnown=false;
let maintenanceActive=false;
let maintenancePromise=null;

async function readMaintenanceState(){
  if(maintenancePromise) return maintenancePromise;
  maintenancePromise=(async()=>{
    try{
      const {db}=await import("./firebase-init.js");
      const {ref,get}=await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js");
      const snap=await Promise.race([get(ref(db,"site/manutencao/ativo")),new Promise((_,reject)=>setTimeout(()=>reject(new Error("MAINTENANCE_TIMEOUT")),5000))]);
      maintenanceActive=snap.val()===true;
      maintenanceKnown=true;
      window.__maintenanceActive=maintenanceActive;
    }catch(e){
      maintenanceKnown=true;
      maintenanceActive=window.__maintenanceActive===true;
    }
    return maintenanceActive;
  })();
  return maintenancePromise;
}

export async function showDbLoading(){
  const active=await readMaintenanceState();
  if(active)return;
  const el=document.getElementById("dbLoadingOverlay");
  if(el) el.classList.add("is-loading");
}
export function hideDbLoading(){
  const el=document.getElementById("dbLoadingOverlay");
  if(el) el.classList.remove("is-loading");
}
export async function dbOnValue(onValueFn,query,callback,onError){
  const active=await readMaintenanceState();
  if(active)return;
  showDbLoading();
  return onValueFn(query,value=>{
    try{callback(value);}
    finally{hideDbLoading();}
  },error=>{
    hideDbLoading();
    if(onError)onError(error);
  });
}
