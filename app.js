import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, getDocs, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = (id) => document.getElementById(id);
const state = { user:null, selected:null, unsubscribeMessages:null, unsubscribeUsers:null, authMode:'login', call:null, localStream:null, pc:null };

function toast(text){ const el=$('toast'); el.textContent=text; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2600); }
function initials(name='A'){ return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'A'; }
function statusText(s){ return ({online:'Онлайн',away:'Отошёл',dnd:'Не беспокоить',invisible:'Невидимый'})[s] || 'Оффлайн'; }
function conversationId(a,b){ return [a,b].sort().join('_'); }
function formatTime(ts){ if(!ts?.toDate) return ''; return ts.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
function esc(v=''){ const d=document.createElement('div'); d.textContent=v; return d.innerHTML; }

function showAuth(){ $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); }
function showApp(){ $('authView').classList.add('hidden'); $('appView').classList.remove('hidden'); }

$('toggleAuth').onclick=()=>{ state.authMode=state.authMode==='login'?'register':'login'; document.querySelectorAll('.register-only').forEach(x=>x.style.display=state.authMode==='register'?'block':'none'); $('authSubmitText').textContent=state.authMode==='register'?'Создать аккаунт':'Войти'; $('toggleAuth').textContent=state.authMode==='register'?'Уже есть аккаунт? Войти':'Нет аккаунта? Зарегистрироваться'; };
document.querySelectorAll('.register-only').forEach(x=>x.style.display='none');

$('authForm').onsubmit=async(e)=>{ e.preventDefault(); $('authError').textContent=''; try{
  const email=$('email').value.trim(), password=$('password').value;
  if(state.authMode==='login') await signInWithEmailAndPassword(auth,email,password);
  else { const cred=await createUserWithEmailAndPassword(auth,email,password); const name=$('displayName').value.trim()||email.split('@')[0]; await updateProfile(cred.user,{displayName:name}); await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email,displayName:name,displayNameLower:name.toLowerCase(),status:'online',createdAt:serverTimestamp(),lastSeen:serverTimestamp()}); }
 }catch(err){ $('authError').textContent=translateError(err.code); }};
function translateError(code){ const m={'auth/invalid-credential':'Неверный email или пароль','auth/email-already-in-use':'Email уже используется','auth/weak-password':'Пароль слишком короткий','auth/invalid-email':'Некорректный email','auth/network-request-failed':'Ошибка сети'}; return m[code]||'Ошибка: '+code; }

onAuthStateChanged(auth, async(user)=>{ if(!user){state.user=null;showAuth();return;} state.user=user; showApp(); await ensureUser(); loadProfile(); loadUsers(); });
async function ensureUser(){ const r=doc(db,'users',state.user.uid), snap=await getDoc(r); if(!snap.exists()) await setDoc(r,{uid:state.user.uid,email:state.user.email,displayName:state.user.displayName||state.user.email.split('@')[0],displayNameLower:(state.user.displayName||'').toLowerCase(),status:'online',createdAt:serverTimestamp(),lastSeen:serverTimestamp()},{merge:true}); else await updateDoc(r,{lastSeen:serverTimestamp(),status:'online'}); }

async function loadProfile(){ const snap=await getDoc(doc(db,'users',state.user.uid)); const u=snap.data()||{}; $('myName').textContent=u.displayName||state.user.displayName||'Пользователь'; $('myAvatar').textContent=initials(u.displayName); $('myStatus').textContent=statusText(u.status); $('settingsName').value=u.displayName||''; $('settingsStatus').value=u.status||'online'; }

function loadUsers(){ if(state.unsubscribeUsers) state.unsubscribeUsers(); const q=query(collection(db,'users'),orderBy('displayNameLower'),limit(100)); state.unsubscribeUsers=onSnapshot(q,snap=>renderUsers(snap.docs.map(d=>d.data()))); }
function renderUsers(users){ const term=$('userSearch').value.trim().toLowerCase(); const list=users.filter(u=>u.uid!==state.user.uid && (!term || (u.displayNameLower||u.displayName||'').includes(term) || (u.email||'').toLowerCase().includes(term))); $('contactList').innerHTML=''; list.forEach(u=>{ const row=document.createElement('div'); row.className='list-item'+(state.selected?.uid===u.uid?' active':''); row.dataset.uid=u.uid; row.innerHTML=`<div class="avatar">${esc(initials(u.displayName))}</div><div class="list-text"><strong>${esc(u.displayName||u.email)}</strong><span>${esc(statusText(u.status))}</span></div><i class="online-dot" style="display:${u.status==='online'?'block':'none'}"></i>`; row.onclick=()=>selectUser(u); $('contactList').appendChild(row); }); if(!list.length) $('contactList').innerHTML='<div class="muted" style="padding:20px">Пользователи не найдены</div>'; }
$('userSearch').oninput=()=>{ if(state.unsubscribeUsers) loadUsers(); };

async function selectUser(user){ state.selected=user; $('detailsPanel').classList.remove('hidden'); $('detailsName').textContent=user.displayName||user.email; $('detailsAvatar').textContent=initials(user.displayName); $('detailsStatus').textContent=statusText(user.status); $('chatHeader').className='chat-head'; $('chatHeader').innerHTML=`<div class="chat-title"><div class="avatar">${esc(initials(user.displayName))}</div><div><strong>${esc(user.displayName||user.email)}</strong><div class="muted">${esc(statusText(user.status))}</div></div></div>`; $('messageForm').classList.remove('hidden'); subscribeMessages(); renderUsersSnapshotActive(); }
function renderUsersSnapshotActive(){ const rows=document.querySelectorAll('.list-item'); rows.forEach(r=>r.classList.toggle('active',r.dataset.uid===state.selected?.uid)); }
function subscribeMessages(){ if(state.unsubscribeMessages) state.unsubscribeMessages(); const cid=conversationId(state.user.uid,state.selected.uid); const q=query(collection(db,'conversations',cid,'messages'),orderBy('createdAt','asc'),limit(500)); state.unsubscribeMessages=onSnapshot(q,snap=>{ const box=$('messages'); box.innerHTML=''; if(snap.empty){box.innerHTML='<div class="empty-state"><div class="empty-icon">👋</div><p>Напишите первое сообщение</p></div>';return;} snap.docs.forEach(d=>renderMessage(box,{id:d.id,...d.data()})); box.scrollTop=box.scrollHeight; }); }
function renderMessage(box,m){ const mine=m.senderId===state.user.uid; const row=document.createElement('div'); row.className='bubble-row '+(mine?'mine':''); let content=esc(m.text||''); if(m.type==='image'&&m.url) content=`<img src="${esc(m.url)}" style="max-width:260px;border-radius:10px;display:block">`; else if(m.type==='file'&&m.url) content=`<a class="file-card" href="${esc(m.url)}" target="_blank" rel="noopener">📎 ${esc(m.fileName||'Файл')}</a>`; row.innerHTML=`<div class="bubble">${content}<span class="time">${formatTime(m.createdAt)}</span>${mine?`<span class="status">${m.readBy?.includes(state.selected?.uid)?'✓✓':'✓'}</span>`:''}</div>`; box.appendChild(row); }

$('messageForm').onsubmit=async(e)=>{e.preventDefault(); const text=$('messageInput').value.trim(); if(!text||!state.selected)return; await sendMessage({text,type:'text'}); $('messageInput').value='';};
async function sendMessage(payload){ const cid=conversationId(state.user.uid,state.selected.uid); const conv=doc(db,'conversations',cid); await setDoc(conv,{id:cid,members:[state.user.uid,state.selected.uid],updatedAt:serverTimestamp(),lastMessage:payload.text||payload.fileName||'Файл'},{merge:true}); await addDoc(collection(conv,'messages'),{...payload,senderId:state.user.uid,createdAt:serverTimestamp(),readBy:[state.user.uid]}); }
$('attachButton').onclick=()=>$('fileInput').click();
$('fileInput').onchange=async()=>{ for(const file of $('fileInput').files){ try{toast('Загрузка '+file.name+'...'); const path=`chat-files/${conversationId(state.user.uid,state.selected.uid)}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const r=ref(storage,path); await uploadBytes(r,file); const url=await getDownloadURL(r); await sendMessage({type:file.type.startsWith('image/')?'image':'file',url,fileName:file.name,text:''}); toast('Файл отправлен'); }catch(err){toast('Ошибка загрузки: '+err.message);} } $('fileInput').value=''; };
$('emojiButton').onclick=()=>{ const input=$('messageInput'); input.value+=' 😊'; input.focus(); };

$('profileButton').onclick=()=>$('settingsModal').classList.remove('hidden'); $('settingsButton').onclick=()=>$('settingsModal').classList.remove('hidden'); $('closeSettings').onclick=()=>$('settingsModal').classList.add('hidden');
$('saveSettings').onclick=async()=>{ const name=$('settingsName').value.trim()||'Пользователь', status=$('settingsStatus').value; await updateProfile(state.user,{displayName:name}); await updateDoc(doc(db,'users',state.user.uid),{displayName:name,displayNameLower:name.toLowerCase(),status,lastSeen:serverTimestamp()}); await loadProfile(); $('settingsModal').classList.add('hidden'); toast('Настройки сохранены'); };
$('logoutButton').onclick=()=>signOut(auth);
$('darkMode').onchange=e=>document.body.classList.toggle('dark',e.target.checked);

// Lightweight WebRTC signaling over Firestore. This provides the foundation for one-to-one calls; TURN should be added for difficult networks.
$('callAudio').onclick=()=>startCall(false); $('callVideo').onclick=()=>startCall(true); $('hangupButton').onclick=hangup;
async function startCall(video){ if(!state.selected)return; try{ state.call={id:crypto.randomUUID(),video}; $('callModal').classList.remove('hidden'); $('callTitle').textContent=(video?'Видеозвонок: ':'Аудиозвонок: ')+(state.selected.displayName||state.selected.email); $('callState').textContent='Подключение...'; $('callAvatar').textContent=initials(state.selected.displayName); state.localStream=await navigator.mediaDevices.getUserMedia({audio:true,video}); $('localVideo').srcObject=state.localStream; state.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]}); state.localStream.getTracks().forEach(t=>state.pc.addTrack(t,state.localStream)); state.pc.ontrack=e=>$('remoteVideo').srcObject=e.streams[0]; state.pc.onicecandidate=async e=>{if(e.candidate)await addDoc(collection(db,'calls',state.call.id,'signals'),{type:'candidate',from:state.user.uid,candidate:e.candidate.toJSON(),createdAt:serverTimestamp()});}; const offer=await state.pc.createOffer(); await state.pc.setLocalDescription(offer); await setDoc(doc(db,'calls',state.call.id),{callerId:state.user.uid,calleeId:state.selected.uid,video,offer:{type:offer.type,sdp:offer.sdp},status:'ringing',createdAt:serverTimestamp()}); $('callState').textContent='Ожидание ответа...'; }catch(e){toast('Не удалось начать звонок: '+e.message);hangup();} }
async function hangup(){ if(state.localStream)state.localStream.getTracks().forEach(t=>t.stop()); if(state.pc)state.pc.close(); state.localStream=null;state.pc=null;$('callModal').classList.add('hidden'); }

window.addEventListener('beforeunload',()=>{ if(state.user) updateDoc(doc(db,'users',state.user.uid),{status:'offline',lastSeen:serverTimestamp()}).catch(()=>{}); });
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
