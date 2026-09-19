import { auth, db, persistenceReady } from '../firebase-init.js';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { get, ref, update } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';

export function normalizeUsername(value){
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9._-]/g,'');
}
export function authEmail(username){ return `${normalizeUsername(username)}@login.descendentesrpg.local`; }
export function waitForAuth(){ return new Promise(resolve => { const off=onAuthStateChanged(auth,user=>{off();resolve(user);}); }); }
export function watchAuth(callback){ return onAuthStateChanged(auth,callback); }
export async function registerPlayer({name,username,password}){
  const clean=normalizeUsername(username);
  if(clean.length < 3) throw new Error('O usuário precisa ter pelo menos 3 caracteres.');
  if(!/^[a-z0-9._-]+$/.test(clean)) throw new Error('O usuário deve usar apenas letras, números, ponto, hífen ou sublinhado.');
  if(password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const [existing,admins]=await Promise.all([get(ref(db,`site/usernames/${clean}`)),get(ref(db,'site/admins'))]);
  if(existing.exists()) throw new Error('Esse usuário já está cadastrado.');
  const adminUsed=Object.values(admins.val()||{}).some(a=>a&&normalizeUsername(a.username||a.login)===clean);
  if(adminUsed) throw new Error('Esse usuário já está reservado para a área administrativa. Escolha outro.');
  await persistenceReady;
  const cred=await createUserWithEmailAndPassword(auth,authEmail(clean),password);
  try{
    await updateProfile(cred.user,{displayName:name.trim()});
    const now=Date.now();
    await update(ref(db),{
      [`site/usernames/${clean}`]:cred.user.uid,
      [`site/profiles/${cred.user.uid}`]:{name:name.trim(),username:clean,createdAt:now,updatedAt:now}
    });
    return cred.user;
  }catch(error){
    try{ await deleteUser(cred.user); }catch(_){ }
    throw new Error('Não foi possível concluir o cadastro. Verifique as regras do Firebase e tente novamente.');
  }
}
export async function loginPlayer(username,password){
  const clean=normalizeUsername(username);
  if(!clean || !password) throw new Error('Informe usuário e senha.');
  await persistenceReady;
  return (await signInWithEmailAndPassword(auth,authEmail(clean),password)).user;
}
export async function logout(){ await signOut(auth); }
export async function isAdmin(user){
  if(!user) return false;
  const snap=await get(ref(db,`site/admins/${user.uid}`));
  return snap.exists() && snap.val()?.active === true;
}
export async function requireAuth({redirect='login.html'}={}){
  const user=await waitForAuth();
  if(!user){ location.replace(redirect); throw new Error('AUTH_REQUIRED'); }
  return user;
}
export async function requireAdmin({redirect='admin-acesso.html'}={}){
  const user=await requireAuth({redirect});
  if(!(await isAdmin(user))){ await logout(); location.replace(redirect); throw new Error('ADMIN_REQUIRED'); }
  return user;
}
