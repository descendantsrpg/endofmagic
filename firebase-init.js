import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig);
const db=getDatabase(app);
const auth=getAuth(app);
// Mantém a sessão do jogador entre páginas e após atualizar o navegador.
const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(()=>{});
export {app,db,auth,persistenceReady};
