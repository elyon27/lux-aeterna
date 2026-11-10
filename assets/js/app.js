/* Lux Aeterna prototype — local-only browser persistence. No remote requests. */
(()=>{'use strict';
const KEY='lux-aeterna-prototype-v1';const DAY=86400000;
const $=id=>document.getElementById(id);
const fresh=()=>({memorials:[],candles:[],prayers:[]});
let state=load(),confirmAction=null,toastTimer;
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
function renderMemorials(){const list=$('memorialList');list.replaceChildren();const q=$('searchMemorials').value.trim().toLocaleLowerCase();const results=state.memorials.filter(m=>m.name.toLocaleLowerCase().includes(q)).sort((a,b)=>b.createdAt-a.createdAt);$('memorialCount').textContent=`${results.length} memorial${results.length!==1?'s':''}`;if(!results.length){list.append(empty(q?'No matching memorials':'No names enrolled yet',q?'Try another name.':'Begin by enrolling a loved one in the memorial register.'));return;}for(const m of results){const card=el('article','memorial-card');if(m.photo){
  const photo=el('img','memorial-photo');
  photo.src=m.photo;
  photo.alt='';
  photo.loading='lazy';
  card.append(photo);
}else{
  card.append(el('div','card-cross','✝'));
}
card.append(el('h3','',m.name));const dates=[humanDate(m.birthDate),humanDate(m.deathDate)].filter(Boolean);if(dates.length)card.append(el('div','memorial-dates',dates.join(' — ')));if(m.tribute)card.append(el('p','memorial-tribute',m.tribute));const actions=el('div','card-actions');[['Light Candle','candle'],['Offer Prayer','prayer'],['Edit','edit'],['Delete','delete']].forEach(([label,action])=>{const btn=el('button','mini-btn'+(action==='delete'?' danger':''),label);btn.type='button';btn.addEventListener('click',()=>onMemorialAction(action,m.id));actions.append(btn);});card.append(actions);list.append(card);}}
function onMemorialAction(action,id){if(action==='edit'){const m=state.memorials.find(x=>x.id===id);if(!m)return;resetPhoto(m.photo);$('memorialId').value=m.id;$('fullName').value=m.name;$('birthDate').value=m.birthDate||'';$('deathDate').value=m.deathDate||'';$('tribute').value=m.tribute||'';$('memorialDialogTitle').textContent='Edit Memorial';openDialog('memorialDialog');return;}if(action==='delete'){confirmDialog('Delete this memorial?',`This will permanently remove ${getName(id)} and all linked prayers and candles from this browser.`,()=>{state.memorials=state.memorials.filter(m=>m.id!==id);state.prayers=state.prayers.filter(p=>p.memorialId!==id);state.candles=state.candles.filter(c=>c.memorialId!==id);save();render();notify('Memorial and linked offerings deleted.');});return;}openOffering(action,id);}
function fillSelect(id,selectedId){const select=$(id);select.replaceChildren();const option=el('option','','Choose a memorial…');option.value='';select.append(option);state.memorials.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(m=>{const o=el('option','',m.name);o.value=m.id;select.append(o);});select.value=selectedId||'';}
function openOffering(type,selectedId){if(!state.memorials.length){notify('First enroll a loved one in My Memorials.');navigate('memorials');openNewMemorial();return;}const isCandle=type==='candle';fillSelect(isCandle?'candleMemorial':'prayerMemorial',selectedId);openDialog(isCandle?'candleDialog':'prayerDialog');}
function candleVisual(){const wrap=el('div','candle-illustration');wrap.setAttribute('aria-hidden','true');wrap.append(el('div','wick'),el('div','candle-wax'),el('div','flame'));return wrap;}
function renderCandles(){const list=$('candleList');list.replaceChildren();const now=Date.now();const active=state.candles.filter(c=>c.createdAt+DAY>now&&state.memorials.some(m=>m.id===c.memorialId)).sort((a,b)=>b.createdAt-a.createdAt);if(!active.length){list.append(empty('No candles burning yet','Enrolling a loved one allows you to offer a candle in their memory.','♨'));return;}for(const c of active){const card=el('article','candle-card');card.append(candleVisual(),el('h3','',getName(c.memorialId)));const remain=Math.max(0,c.createdAt+DAY-now);const hrs=Math.floor(remain/3600000),mins=Math.ceil(remain%3600000/60000);card.append(el('p','',`About ${hrs}h ${mins}m remaining`));list.append(card);}}
function renderPrayers(){const list=$('prayerList');list.replaceChildren();const prayers=state.prayers.filter(p=>state.memorials.some(m=>m.id===p.memorialId)).sort((a,b)=>b.createdAt-a.createdAt);if(!prayers.length){list.append(empty('No personal prayers offered yet','Your personal prayers will appear here.'));return;}for(const p of prayers){const article=el('article','prayer-item');article.append(el('small','',humanTime(p.createdAt)),el('h3','',`For ${getName(p.memorialId)}`),el('p','',p.text));const del=el('button','mini-btn danger','Delete Prayer');del.type='button';del.addEventListener('click',()=>confirmDialog('Delete this prayer?','This personal prayer will be removed from this browser.',()=>{state.prayers=state.prayers.filter(x=>x.id!==p.id);save();render();notify('Prayer deleted.');}));article.append(del);list.append(article);}}
function render(){renderMemorials();renderCandles();renderPrayers();}
function openNewMemorial(){$('memorialForm').reset();resetPhoto();$('memorialId').value='';$('memorialDialogTitle').textContent='Enroll a Loved One';openDialog('memorialDialog');}
function confirmDialog(title,message,onConfirm){$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;confirmAction=onConfirm;openDialog('confirmDialog');}
document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();navigate(link.dataset.view);}));document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.goto)));document.querySelectorAll('[data-open="memorialDialog"]').forEach(btn=>btn.addEventListener('click',openNewMemorial));document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeDialogs));document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();}));
$('menuToggle').addEventListener('click',()=>{const expanded=$('menuToggle').getAttribute('aria-expanded')==='true';$('menuToggle').setAttribute('aria-expanded',String(!expanded));$('primaryNav').classList.toggle('open',!expanded);});
let draftPhoto='', photoSelection=0;

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
  if($('saveMemorial').disabled)return;
  const name=$('fullName').value.trim(),birthDate=$('birthDate').value,deathDate=$('deathDate').value,tribute=$('tribute').value.trim(),id=$('memorialId').value;
  if(!name){notify('Please enter a name.');return;}
  if(birthDate&&deathDate&&birthDate>deathDate){notify('Date of passing cannot be earlier than date of birth.');return;}
  if(deathDate&&deathDate>new Date().toISOString().slice(0,10)){notify('Date of passing cannot be in the future.');return;}
  const existing=state.memorials.find(m=>m.id===id);
  const record={id:existing?.id||uid(),name,birthDate,deathDate,tribute,createdAt:existing?.createdAt||Date.now()};
  if(draftPhoto)record.photo=draftPhoto;
  const memorials=existing?state.memorials.map(m=>m.id===id?record:m):[...state.memorials,record];
  const nextState={...state,memorials};
  if(!save(nextState)){
    $('memorialPhotoStatus').textContent='The memorial could not be saved. Check available browser storage and try again.';
    return;
  }
  state=nextState;
  closeDialogs();
  render();
  notify(existing?'Memorial updated.':'A name has been enrolled in remembrance.');
});
$('searchMemorials').addEventListener('input',renderMemorials);
$('lightCandleBtn').addEventListener('click',()=>openOffering('candle'));
$('offerPrayerBtn').addEventListener('click',()=>openOffering('prayer'));
$('candleForm').addEventListener('submit',e=>{e.preventDefault();const id=$('candleMemorial').value;if(!state.memorials.some(m=>m.id===id))return;state.candles.push({id:uid(),memorialId:id,createdAt:Date.now()});save();closeDialogs();render();notify('A candle has been lit in remembrance.');});
$('prayerForm').addEventListener('submit',e=>{e.preventDefault();const id=$('prayerMemorial').value,text=$('prayerText').value.trim();if(!text||!state.memorials.some(m=>m.id===id))return;state.prayers.push({id:uid(),memorialId:id,text,createdAt:Date.now()});save();$('prayerForm').reset();closeDialogs();render();notify('Your prayer has been recorded.');});
$('confirmAccept').addEventListener('click',()=>{const fn=confirmAction;confirmAction=null;closeDialogs();if(fn)fn();});$('confirmDialog').addEventListener('close',()=>{confirmAction=null;});
$('exportDataBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'lux-aeterna-local-backup-v1',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lux-aeterna-memorial-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Local data backup exported. Keep this file private.');});
$('clearDataBtn').addEventListener('click',()=>confirmDialog('Delete all local data?','This permanently erases every locally saved memorial, candle, and prayer in this browser. This cannot be undone.',()=>{state=fresh();localStorage.removeItem(KEY);render();notify('All Lux Aeterna local data deleted.');}));
$('year').textContent=new Date().getFullYear();window.addEventListener('hashchange',()=>navigate(location.hash.replace('#','')));navigate(location.hash.replace('#','')||'home');setInterval(()=>{if($('candles').classList.contains('active'))renderCandles();},60000);
})();
