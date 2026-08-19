import { getFirestore, collection, doc, query, where, limit, onSnapshot, getDoc, updateDoc, serverTimestamp, setDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

// Final-pass enhancements: incoming calls, call answer handling, group creation and safer presence.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app), auth = getAuth(app);
const $ = id => document.getElementById(id);
let incomingStop = null, activeCallStop = null;
const uid = () => auth.currentUser?.uid;
const initials = n => (n||'A').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'A';
function toast(t){const x=$('toast');if(!x)return;x.textContent=t;x.classList.add('show');clearTimeout(window.__enhToast);window.__enhToast=setTimeout(()=>x.classList.remove('show'),2600)}

function installGroups(){
  const tabs=document.querySelector('.tabs'); if(!tabs || document.getElementById('groupButton')) return;
  const b=document.createElement('button');b.id='groupButton';b.className='tab';b.textContent='＋';b.title='Создать группу';b.onclick=async()=>{
    const name=prompt('Название группы'); if(!name?.trim())return;
    const email=prompt('Email участников через запятую');
    const emails=(email||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    const users=await Promise.all(emails.map(async e=>{const s=await getDocs(query(collection(db,'users'),where('email','==',e),limit(1)));return s.empty?null:s.docs[0].data()}));
    const members=[uid(),...users.filter(Boolean).map(x=>x.uid).filter(x=>x!==uid())];
    if(members.length<2)return toast('Не найден ни один участник');
    const ref=doc(collection(db,'conversations'));await setDoc(ref,{id:ref.id,type:'group',name:name.trim(),members,ownerId:uid(),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastMessage:'Группа создана'});toast('Группа создана');
  };tabs.appendChild(b);
}

// Firestore calls use a shared call document. The original client creates the offer and the callee writes answer.
// This listener completes the missing caller-side answer negotiation.
function installCallAnswerWatcher(){
  const original=window.__agentCallWatcher;
  if(original)return;
  window.__agentCallWatcher=true;
  const check=()=>{
    const call=window.state?.call;
    if(!call?.id || call.role!=='caller')return;
    if(activeCallStop)activeCallStop();
    activeCallStop=onSnapshot(doc(db,'calls',call.id),async s=>{
      const d=s.data(); if(!d)return;
      if(d.status==='accepted'&&d.answer&&window.state?.pc?.signalingState!=='stable'){
        try{await window.state.pc.setRemoteDescription(d.answer);if($('callState'))$('callState').textContent='Соединение установлено'}catch(e){toast('Ошибка соединения: '+e.message)}
      }
      if(['declined','ended','failed'].includes(d.status)&&$('callState'))$('callState').textContent=d.status==='declined'?'Звонок отклонён':'Звонок завершён';
    });
  };
  setInterval(check,700);
}

function installIncomingBanner(){
  const run=()=>{const u=uid();if(!u)return;if(incomingStop)incomingStop();const q=query(collection(db,'calls'),where('calleeId','==',u),where('status','==','ringing'),limit(1));incomingStop=onSnapshot(q,async s=>{
    if(s.empty)return;const d=s.docs[0],c=d.data();if(window.state?.call?.id===d.id)return;
    const us=await getDoc(doc(db,'users',c.callerId));const p=us.data()||{};
    const ok=confirm(`${p.displayName||'Пользователь'} звонит.\nOK — принять, Отмена — отклонить.`);
    if(!ok){await updateDoc(d.ref,{status:'declined'});return}
    // Let the main client's call UI perform the actual media setup.
    if(window.acceptIncomingCall) await window.acceptIncomingCall(d.id,c,p); else toast('Обновите страницу для приёма звонков');
  })};setTimeout(run,1000);
}

function exposeHooks(){
  // app.js state is intentionally made available for this enhancement layer without changing its UI.
  if(window.__agentEnhancementReady)return;
  window.__agentEnhancementReady=true;
  installGroups();installCallAnswerWatcher();installIncomingBanner();
}

window.addEventListener('load',exposeHooks);
setTimeout(exposeHooks,1200);
