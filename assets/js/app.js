/* Lux Aeterna prototype — local storage and private Crown-Articles accounts. */
(()=>{'use strict';
const KEY='lux-aeterna-prototype-v1';const DAY=86400000;
const $=id=>document.getElementById(id);
const fresh=()=>({memorials:[],candles:[],prayers:[]});
let state=load(),confirmAction=null,toastTimer;
const cloud=window.luxCloud;
let accountId=null, accountVersion=0, busy=false, cloudReady=false;

function result(response){
  if(response.error)throw response.error;
  return response.data;
}

async function readRows(table, owner, columns, order, pageSize=100){
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    const page=result(await cloud.from(table).select(columns).eq('owner_id',owner)
      .order(order).range(offset,offset+pageSize-1));
    rows.push(...page);
    if(page.length<pageSize)return rows;
  }
}

function photoDataUrl(hex){
  if(!hex)return '';
  let bytes='';
  for(let i=2;i<hex.length;i+=2)bytes+=String.fromCharCode(parseInt(hex.slice(i,i+2),16));
  return 'data:image/jpeg;base64,'+btoa(bytes);
}

async function readAccount(owner){
  const [memorials,photos,prayers,candles]=await Promise.all([
    readRows('lux_memorials',owner,'id,full_name,birth_date,death_date,tribute,created_at','id'),
    readRows('lux_memorial_photos',owner,'memorial_id,jpeg_data','memorial_id',10),
    readRows('lux_prayers',owner,'id,memorial_id,prayer_text,created_at','id'),
    readRows('lux_candles',owner,'id,memorial_id,created_at,expires_at','id')
  ]);
  const photoByMemorial=new Map(photos.map(row=>[row.memorial_id,photoDataUrl(row.jpeg_data)]));
  return {
    memorials:memorials.map(row=>({id:row.id,name:row.full_name,birthDate:row.birth_date,deathDate:row.death_date,
      tribute:row.tribute,createdAt:Date.parse(row.created_at),photo:photoByMemorial.get(row.id)})),
    prayers:prayers.map(row=>({id:row.id,memorialId:row.memorial_id,text:row.prayer_text,createdAt:Date.parse(row.created_at)})),
    candles:candles.map(candleFromRow)
  };
}

function candleFromRow(row){
  return {id:row.id,memorialId:row.memorial_id,createdAt:Date.parse(row.created_at),expiresAt:Date.parse(row.expires_at)};
}

async function switchAccount(user){
  const owner=user?.id??null;
  if(owner===accountId&&cloudReady)return;
  const version=++accountVersion;
  accountId=owner;
  cloudReady=!owner;
  closeDialogs();
  state=owner?fresh():load();
  $('accountButton').textContent=owner?'Sign Out':'Sign In';
  $('clearDataBtn').hidden=Boolean(owner);
  $('prayerText').maxLength=owner?1200:1500;
  $('accountStatus').textContent=owner?'Loading your private online records…':'Browser-only mode · Sign in to save online.';
  render();
  if(!owner)return;
  try{
    const data=await readAccount(owner);
    if(version!==accountVersion)return;
    state=data;
    cloudReady=true;
    $('accountStatus').textContent='Signed in · Saving to your private online account.';
    render();
  }catch{
    if(version===accountVersion)$('accountStatus').textContent='Online records could not load. Sign out and sign in to retry.';
  }
}

function canChange(){
  if(busy)return false;
  if(!cloudReady){notify('Wait for your account records to load.');return false;}
  return true;
}

async function changeRecords(localChange, onlineChange, message, onError=()=>{}){
  if(!canChange())return;
  const version=accountVersion;
  busy=true;
  try{
    const next=accountId?await onlineChange(accountId):localChange();
    if(version!==accountVersion)return;
    if(!accountId&&!save(next))throw new Error('Browser storage is unavailable.');
    state=next;
    closeDialogs();
    render();
    notify(message);
  }catch{
    if(version!==accountVersion)return;
    const error=accountId?'The change could not be saved online. Try again.':'Browser storage is unavailable. Your change was not saved.';
    onError(error);
    notify(error);
  }finally{
    busy=false;
  }
}

function withoutMemorial(id){
  return {memorials:state.memorials.filter(m=>m.id!==id),
    prayers:state.prayers.filter(p=>p.memorialId!==id),
    candles:state.candles.filter(c=>c.memorialId!==id)};
}

function removeRecord(table,id,update,message){
  return changeRecords(update,async owner=>{
    result(await cloud.from(table).delete().eq('owner_id',owner).eq('id',id));
    return update();
  },message);
}
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.memorials)&&Array.isArray(saved.candles)&&Array.isArray(saved.prayers))return saved;}catch(e){console.warn('Stored Lux Aeterna data could not be read.');}return fresh();}
function save(nextState=state){try{localStorage.setItem(KEY,JSON.stringify(nextState));return true;}catch(e){notify('Browser storage is unavailable. Your changes may not persist.');return false;}}
function uid(){return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3700);}
function humanDate(date){if(!date)return '';const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(d);}
function humanTime(ts){return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts));}
function getName(id){return state.memorials.find(m=>m.id===id)?.name||'Removed memorial';}
function openDialog(id){const dialog=$(id);if(dialog&&typeof dialog.showModal==='function')dialog.showModal();else notify('This browser does not support dialog windows.');}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function navigate(page){if(!$(page)?.classList.contains('view'))page='home';document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===page));document.querySelectorAll('[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===page));$('primaryNav').classList.remove('open');$('menuToggle').setAttribute('aria-expanded','false');if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);window.scrollTo(0,0);render();}
function empty(heading,description,symbol='✝'){const div=el('div','empty-state');div.append(el('div','empty-symbol',symbol),el('h2','',heading),el('p','',description));return div;}
let memorialCandleTimer;

function candleExpiry(candle){
  return candle.expiresAt??candle.createdAt+DAY;
}

function activeMemorialCandles(now){
  const active=new Map();
  for(const candle of state.candles){
    const current=active.get(candle.memorialId);
    if(candleExpiry(candle)>now&&(!current||candle.createdAt>current.createdAt)){
      active.set(candle.memorialId,candle);
    }
  }
  return active;
}

function memorialCandle(candle,now){
  const remaining=candleExpiry(candle)-now;
  const waxHeight=4+56*Math.min(1,remaining/(candleExpiry(candle)-candle.createdAt));
  const candleHolder=el('div','memorial-candle');
  const illustration=el('div','memorial-candle-illustration');
  illustration.setAttribute('aria-hidden','true');
  const top=el('div','memorial-candle-top');
  top.append(el('span','memorial-candle-wick'),el('span','flame'));
  const wax=el('div','memorial-candle-wax');
  wax.style.setProperty('--wax-height',waxHeight+'px');
  wax.style.setProperty('--burn-time',remaining+'ms');
  illustration.append(top,wax);
  candleHolder.append(illustration,el('span','memorial-candle-label','Candle lit'));
  return candleHolder;
}

function renderMemorials(){
  clearTimeout(memorialCandleTimer);
  const now=Date.now();
  const activeCandles=activeMemorialCandles(now);
  let nextExpiry=Infinity;
  const list=$('memorialList');list.replaceChildren();const q=$('searchMemorials').value.trim().toLocaleLowerCase();const results=state.memorials.filter(m=>m.name.toLocaleLowerCase().includes(q)).sort((a,b)=>b.createdAt-a.createdAt);$('memorialCount').textContent=`${results.length} memorial${results.length!==1?'s':''}`;if(!results.length){list.append(empty(q?'No matching memorials':'No names enrolled yet',q?'Try another name.':'Begin by enrolling a loved one in the memorial register.'));return;}for(const m of results){const card=el('article','memorial-card');if(m.photo){
  const photo=el('img','memorial-photo');
  photo.src=m.photo;
  photo.alt='';
  photo.loading='lazy';
  const portrait=el('div','memorial-portrait');
  const leftCross=el('span','memorial-cross','✝');
  const rightCross=el('span','memorial-cross','✝');
  leftCross.setAttribute('aria-hidden','true');
  rightCross.setAttribute('aria-hidden','true');
  portrait.append(leftCross,photo,rightCross);
  card.append(portrait);
}else{
  card.append(el('div','card-cross','✝'));
}
card.append(el('h3','',m.name));const dates=[humanDate(m.birthDate),humanDate(m.deathDate)].filter(Boolean);if(dates.length)card.append(el('div','memorial-dates',dates.join(' — ')));if(m.tribute)card.append(el('p','memorial-tribute',m.tribute));const actions=el('div','card-actions');[['Light Candle','candle'],['Offer Prayer','prayer'],['Edit','edit'],['Delete','delete']].forEach(([label,action])=>{const btn=el('button','mini-btn'+(action==='delete'?' danger':''),label);btn.type='button';btn.addEventListener('click',()=>onMemorialAction(action,m.id));actions.append(btn);});card.append(actions);
  const candle=activeCandles.get(m.id);
  if(!candle){
    list.append(card);
    continue;
  }
  const entry=el('div','memorial-with-candle');
  entry.append(card,memorialCandle(candle,now));
  list.append(entry);
  nextExpiry=Math.min(nextExpiry,candleExpiry(candle));
  }
  if(Number.isFinite(nextExpiry)){
    memorialCandleTimer=setTimeout(renderMemorials,Math.max(0,nextExpiry-Date.now()));
  }
}
function onMemorialAction(action,id){if(action==='edit'){const m=state.memorials.find(x=>x.id===id);if(!m)return;if(!canChange())return;pendingMemorialId=null;resetPhoto(m.photo);$('memorialId').value=m.id;$('fullName').value=m.name;$('birthDate').value=m.birthDate||'';$('deathDate').value=m.deathDate||'';$('tribute').value=m.tribute||'';$('memorialDialogTitle').textContent='Edit Memorial';openDialog('memorialDialog');return;}if(action==='delete'){confirmDialog('Delete this memorial?',`This will permanently remove ${getName(id)} and all linked prayers and candles from your current storage.`,()=>removeRecord('lux_memorials',id,()=>withoutMemorial(id),'Memorial and linked offerings deleted.'));return;}openOffering(action,id);}
function fillSelect(id,selectedId){const select=$(id);select.replaceChildren();const option=el('option','','Choose a memorial…');option.value='';select.append(option);state.memorials.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(m=>{const o=el('option','',m.name);o.value=m.id;select.append(o);});select.value=selectedId||'';}
function openOffering(type,selectedId){if(!canChange())return;if(!state.memorials.length){notify('First enroll a loved one in My Memorials.');navigate('memorials');openNewMemorial();return;}const isCandle=type==='candle';fillSelect(isCandle?'candleMemorial':'prayerMemorial',selectedId);openDialog(isCandle?'candleDialog':'prayerDialog');}
function candleVisual(){const wrap=el('div','candle-illustration');wrap.setAttribute('aria-hidden','true');wrap.append(el('div','wick'),el('div','candle-wax'),el('div','flame'));return wrap;}
function renderCandles(){const list=$('candleList');list.replaceChildren();const now=Date.now();const active=state.candles.filter(c=>candleExpiry(c)>now&&state.memorials.some(m=>m.id===c.memorialId)).sort((a,b)=>b.createdAt-a.createdAt);if(!active.length){list.append(empty('No candles burning yet','Enrolling a loved one allows you to offer a candle in their memory.','♨'));return;}for(const c of active){const card=el('article','candle-card');card.append(candleVisual(),el('h3','',getName(c.memorialId)));const remain=Math.max(0,candleExpiry(c)-now);const totalMinutes=Math.ceil(remain/60000),hrs=Math.floor(totalMinutes/60),mins=totalMinutes%60;card.append(el('p','',`About ${hrs}h ${mins}m remaining`));list.append(card);}}
function renderPrayers(){const list=$('prayerList');list.replaceChildren();const prayers=state.prayers.filter(p=>state.memorials.some(m=>m.id===p.memorialId)).sort((a,b)=>b.createdAt-a.createdAt);if(!prayers.length){list.append(empty('No personal prayers offered yet','Your personal prayers will appear here.'));return;}for(const p of prayers){const article=el('article','prayer-item');article.append(el('small','',humanTime(p.createdAt)),el('h3','',`For ${getName(p.memorialId)}`),el('p','',p.text));const del=el('button','mini-btn danger','Delete Prayer');del.type='button';del.addEventListener('click',()=>confirmDialog('Delete this prayer?','This personal prayer will be removed from your current storage.',()=>removeRecord('lux_prayers',p.id,()=>({...state,prayers:state.prayers.filter(x=>x.id!==p.id)}),'Prayer deleted.')));article.append(del);list.append(article);}}
function render(){renderMemorials();renderCandles();renderPrayers();}
function openNewMemorial(){if(!canChange())return;pendingMemorialId=null;$('memorialForm').reset();resetPhoto();$('memorialId').value='';$('memorialDialogTitle').textContent='Enroll a Loved One';openDialog('memorialDialog');}
function confirmDialog(title,message,onConfirm){$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;confirmAction=onConfirm;openDialog('confirmDialog');}
document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();navigate(link.dataset.view);}));document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.goto)));document.querySelectorAll('[data-open="memorialDialog"]').forEach(btn=>btn.addEventListener('click',openNewMemorial));document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeDialogs));document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();}));
$('menuToggle').addEventListener('click',()=>{const expanded=$('menuToggle').getAttribute('aria-expanded')==='true';$('menuToggle').setAttribute('aria-expanded',String(!expanded));$('primaryNav').classList.toggle('open',!expanded);});
let draftPhoto='', photoSelection=0, pendingMemorialId=null;

function showPhoto(){
  const preview=$('memorialPhotoPreview');
  if(draftPhoto)preview.src=draftPhoto;
  else preview.removeAttribute('src');
  preview.hidden=!draftPhoto;
  $('removeMemorialPhoto').hidden=!draftPhoto;
}

function resetPhoto(photo=''){
  photoSelection++;
  draftPhoto=photo;
  $('memorialPhoto').value='';
  $('memorialPhotoStatus').textContent='';
  $('saveMemorial').disabled=false;
  showPhoto();
}

async function preparePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024){
    throw new Error('Choose a JPEG, PNG, or WebP image up to 10 MB.');
  }
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,480/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d',{alpha:false});
    context.fillStyle='#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',0.78);
  }finally{
    bitmap.close();
  }
}

$('memorialPhoto').addEventListener('change',async()=>{
  const input=$('memorialPhoto');
  const file=input.files[0];
  if(!file)return;
  const selection=++photoSelection;
  const status=$('memorialPhotoStatus');
  $('saveMemorial').disabled=true;
  status.textContent='Preparing photo…';
  try{
    const photo=await preparePhoto(file);
    if(selection!==photoSelection)return;
    draftPhoto=photo;
    showPhoto();
    status.textContent='Photo ready to save.';
  }catch{
    if(selection!==photoSelection)return;
    input.value='';
    status.textContent=draftPhoto
      ? 'That image could not be used. Your previous photo is still selected.'
      : 'That image could not be used. Choose a readable JPEG, PNG, or WebP image up to 10 MB.';
  }finally{
    if(selection===photoSelection)$('saveMemorial').disabled=false;
  }
});
$('removeMemorialPhoto').addEventListener('click',()=>resetPhoto());
$('memorialForm').addEventListener('submit',e=>{
  e.preventDefault();
  if($('saveMemorial').disabled||!canChange())return;
  const name=$('fullName').value.trim(),birthDate=$('birthDate').value,deathDate=$('deathDate').value,tribute=$('tribute').value.trim(),id=$('memorialId').value;
  if(!name){notify('Please enter a name.');return;}
  if(birthDate&&deathDate&&birthDate>deathDate){notify('Date of passing cannot be earlier than date of birth.');return;}
  if(deathDate&&deathDate>new Date().toISOString().slice(0,10)){notify('Date of passing cannot be in the future.');return;}
  const existing=state.memorials.find(m=>m.id===id);
  const record={id:existing?.id||(pendingMemorialId??=uid()),name,birthDate,deathDate,tribute,
    createdAt:existing?.createdAt||Date.now(),photo:draftPhoto||undefined};
  const updated=()=>({...state,memorials:existing
    ?state.memorials.map(m=>m.id===id?record:m)
    :[...state.memorials,record]});
  changeRecords(updated,async()=>{
    const saved=result(await cloud.rpc('lux_save_memorial',{
      memorial_uuid:record.id,memorial_name:name,born:birthDate||null,passed:deathDate||null,
      remembrance:tribute,photo_base64:record.photo?.split(',')[1]??null
    }).single());
    record.createdAt=Date.parse(saved.created_at);
    return updated();
  },existing?'Memorial updated.':'A name has been enrolled in remembrance.',error=>{
    $('memorialPhotoStatus').textContent=error;
  });
});
$('searchMemorials').addEventListener('input',renderMemorials);
$('lightCandleBtn').addEventListener('click',()=>openOffering('candle'));
$('offerPrayerBtn').addEventListener('click',()=>openOffering('prayer'));
$('candleForm').addEventListener('submit',e=>{
  e.preventDefault();
  const memorialId=$('candleMemorial').value;
  if(!state.memorials.some(m=>m.id===memorialId))return;
  const candle={id:uid(),memorialId,createdAt:Date.now()};
  changeRecords(()=>({...state,candles:[...state.candles,candle]}),async owner=>{
    const row=result(await cloud.from('lux_candles').insert({id:candle.id,owner_id:owner,memorial_id:memorialId})
      .select('id,memorial_id,created_at,expires_at').single());
    return {...state,candles:[...state.candles,candleFromRow(row)]};
  },'A candle has been lit in remembrance.');
});
$('prayerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const memorialId=$('prayerMemorial').value,text=$('prayerText').value.trim();
  if(!text||!state.memorials.some(m=>m.id===memorialId))return;
  const prayer={id:uid(),memorialId,text,createdAt:Date.now()};
  const updated=()=>({...state,prayers:[...state.prayers,prayer]});
  await changeRecords(updated,async owner=>{
    const row=result(await cloud.from('lux_prayers').insert({id:prayer.id,owner_id:owner,memorial_id:memorialId,prayer_text:text})
      .select('created_at').single());
    prayer.createdAt=Date.parse(row.created_at);
    return updated();
  },'Your prayer has been recorded.');
  if(!$('prayerDialog').open)$('prayerForm').reset();
});
$('confirmAccept').addEventListener('click',()=>{const fn=confirmAction;confirmAction=null;closeDialogs();if(fn)fn();});$('confirmDialog').addEventListener('close',()=>{confirmAction=null;});
$('exportDataBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'lux-aeterna-local-backup-v1',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lux-aeterna-memorial-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Local data backup exported. Keep this file private.');});
$('clearDataBtn').addEventListener('click',()=>confirmDialog('Delete all local data?','This permanently erases every locally saved memorial, candle, and prayer in this browser. This cannot be undone.',()=>{if(accountId||!canChange())return;localStorage.removeItem(KEY);state=fresh();render();notify('All Lux Aeterna local data deleted.');}));
$('accountButton').addEventListener('click',async()=>{
  if(busy)return;
  if(!cloud){notify('Online sign-in is unavailable. Browser-only mode is still available.');return;}
  if(!accountId){
    $('accountForm').reset();
    $('accountMessage').textContent='';
    openDialog('accountDialog');
    return;
  }
  busy=true;
  try{
    result(await cloud.auth.signOut({scope:'local'}));
    await switchAccount(null);
  }catch{notify('Sign-out failed. Please try again.');}
  finally{busy=false;}
});
$('accountForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(busy)return;
  const signup=e.submitter?.value==='signup';
  const email=$('accountEmail').value.trim(), password=$('accountPassword').value;
  const message=$('accountMessage');
  if(signup&&password.length<8){message.textContent='Choose a password of at least 8 characters.';return;}
  busy=true;
  message.textContent=signup?'Creating your account…':'Signing in…';
  try{
    const data=result(signup
      ?await cloud.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}})
      :await cloud.auth.signInWithPassword({email,password}));
    $('accountPassword').value='';
    if(!data.session)message.textContent='Check your email for a confirmation link before signing in.';
  }catch(error){
    message.textContent=error.message||'Sign-in failed. Please try again.';
  }finally{
    busy=false;
  }
});

$('year').textContent=new Date().getFullYear();
if(cloud){
  cloud.auth.onAuthStateChange((event,session)=>{
    if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='SIGNED_OUT'){
      setTimeout(()=>switchAccount(session?.user),0);
    }
  });
  // Wait for PKCE to read the confirmation code before normalizing the URL.
  cloud.auth.getSession().finally(()=>startNavigation());
}else{
  switchAccount(null);
  $('accountStatus').textContent='Browser-only mode · Online sign-in is unavailable.';
  startNavigation();
}
function startNavigation(){
  window.addEventListener('hashchange',()=>navigate(location.hash.replace('#','')));
  navigate(location.hash.replace('#','')||'home');
}setInterval(()=>{if($('candles').classList.contains('active'))renderCandles();},60000);
})();
