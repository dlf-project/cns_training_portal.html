/* ===== runtime bootstrap: build iframes + load Paystack (keeps static HTML clean) ===== */
(function(){
  function mkFrame(kind){
    var f=document.createElement('iframe'); f.src='';
    if(kind==='faq'){
      f.id='faqFrame'; f.title='CNS FAQ video'; f.setAttribute('frameborder','0');
      f.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      f.setAttribute('allowfullscreen','');
    } else {
      f.id='docFrame'; f.className='doc-frame'; f.title='Program document';
    }
    return f;
  }
  function boot(){
    var hosts=document.querySelectorAll('[data-cnsframe]');
    for(var i=0;i<hosts.length;i++){ var ph=hosts[i]; var fr=mkFrame(ph.getAttribute('data-cnsframe'));
      if(ph.parentNode) ph.parentNode.replaceChild(fr, ph); }
    if(!document.getElementById('cns-paystack-sdk')){
      var s=document.createElement('script'); s.id='cns-paystack-sdk';
      s.src='https://js.paystack.co/v1/inline.js'; s.async=true; document.head.appendChild(s);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ===== CNS Training Portal — main script ===== */
/* ============ CONFIG — UPDATE THESE ============ */
const PAYSTACK_KEY='pk_live_d045b04b5adc3218fc89d03e74c47fba1f6c8392';
const FORM_URL='https://docs.google.com/forms/d/e/1FAIpQLScOB89j4Wf_dNyPyIN8wTWziDKhy7zHRLVKP20vQz2GUXWSFg/viewform';
const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vSs8XV101TzpfjBnagZrkO4SfOGiM5HWQrXCkn0gs7Vxg_LCImrvC74JHQfAZp2_uYuUC-6hM3wX7Vx/pub?gid=945407063&single=true&output=csv';
const ONLINE_CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vSs8XV101TzpfjBnagZrkO4SfOGiM5HWQrXCkn0gs7Vxg_LCImrvC74JHQfAZp2_uYuUC-6hM3wX7Vx/pub?gid=2135863606&single=true&output=csv';
const ONLINE_SHEET_ID='1hcFFHkHG9C2aLUwjWfv6PhX0dHGPpfn2vFlq3LaCeHI';// fallback: read tab by name if the published link fails
const ONLINE_TAB_NAME='Online Certification Courses';
const PORTAL_URL='https://caregiverng.com/cns_training_portal.html';
const USD_TO_NGN=1550;
const APP_FEE_NGN=5000;
const APP_FEE_ONLINE_NGN=2000;
function appFee(){return (curProg&&curProg.__online)?APP_FEE_ONLINE_NGN:APP_FEE_NGN;}
const INSTALL_UPLIFT=0.04;
let NYSC_PCT=25;            // overridden live from Fee Engine "NYSC Discount %"
let SITEWIDE_PROMO_PCT=0;  // overridden live from Fee Engine "Site-Wide Promo %"
function parsePct(v){if(v==null)return 0;var s=String(v).trim();if(!s)return 0;var hadPct=s.indexOf('%')!==-1;var n=parseFloat(s.replace(/[^0-9.\-]/g,''));if(isNaN(n))return 0;if(!hadPct&&n>0&&n<=1)n=n*100;return n;}
function parseCSVraw(text){var rows=[],row=[],cur='',q=false;for(var i=0;i<text.length;i++){var ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}else{if(ch==='"')q=true;else if(ch===','){row.push(cur);cur='';}else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(ch==='\r'){}else cur+=ch;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
function promoLive(p){ // per-item promo if Active and not expired (returns {pct,label})
  var active=String(p['Promo Active']||'').trim().toLowerCase();
  if(!(active==='yes'||active==='y'||active==='true'||active==='1'))return {pct:0,label:''};
  var ends=String(p['Promo Ends']||'').trim();
  if(ends){var d=new Date(ends);if(!isNaN(d.getTime())&&d.getTime()<Date.now())return {pct:0,label:''};}
  return {pct:parsePct(p['Promo % Off']),label:(p['Promo Label']||'Promo').trim()};
}
// Best-single-discount-wins on the TRAINING fee. nyscOn adds NYSC into the contest.
function bestDiscount(p,nyscOn){
  var cands=[];
  var pr=promoLive(p); if(pr.pct>0)cands.push({pct:pr.pct,label:pr.label});
  if(SITEWIDE_PROMO_PCT>0)cands.push({pct:SITEWIDE_PROMO_PCT,label:'Promo'});
  if(nyscOn&&!p.__online)cands.push({pct:NYSC_PCT,label:'NYSC'});
  if(!cands.length)return {pct:0,label:''};
  return cands.reduce(function(a,b){return b.pct>a.pct?b:a;});
}
async function loadEngineGlobals(){
  try{
    var url='https://docs.google.com/spreadsheets/d/'+ONLINE_SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent('Fee Engine');
    var r=await fetch(url);if(!r.ok)return;var t=await r.text();
    parseCSVraw(t).forEach(function(row){
      var label=String(row[0]||'').trim().toLowerCase();
      if(label.indexOf('nysc discount')===0)NYSC_PCT=parsePct(row[1]);
      else if(label.indexOf('site-wide promo')===0||label.indexOf('sitewide promo')===0)SITEWIDE_PROMO_PCT=parsePct(row[1]);
    });
  }catch(e){}
}
const EMAILJS_PUBLIC_KEY='eEuP_noAuywJ-GoTR';
const EMAILJS_SERVICE_ID='service_0tz6xpw';
const EMAILJS_TEMPLATE_APPLICATION='5hbat8y';
const EMAILJS_TEMPLATE_PAYMENT='8evbtpg';
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbzYU9Z9hLP4P_YGKs3n5wyS1zuHjOEFsjgqa5hEDnD_iW1SOUalNGpUOsZFnnTrSJ8HAg/exec';
const LINKS_CSV_URL=''; // published CSV of the auto-built Code/Image/Doc links sheet (folder indexer output)
/* =============================================== */

const AFRICA=['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'];

let allPrograms=[],curCat='all',curSort='default',curProg=null;
let region='ng',regionName='Nigeria';
let applicantEmail='',applicantName='',selectedPlan='full',feeState={},curDocUrl='',firstRenderDone=false,qty=1,lastAppRef='',applicantCountry='',applicantState='',applicantLGA='',applicantPhone='',applicantStyle='';

/* EmailJS init removed — GmailApp via Apps Script */

function parseCSV(text){
  text=text.replace(/^\uFEFF/,''); // strip BOM
  // detect delimiter from the first physical line
  const fle=text.search(/\r?\n/);const firstLine=fle===-1?text:text.slice(0,fle);
  const delim=(firstLine.split('\t').length>firstLine.split(',').length)?'\t':',';
  // character-level parse that respects quotes spanning multiple lines
  const rows=[];let field='',row=[],q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; }
      else field+=ch;
    }else{
      if(ch==='"')q=true;
      else if(ch===delim){row.push(field);field='';}
      else if(ch==='\n'){row.push(field);field='';rows.push(row);row=[];}
      else if(ch==='\r'){/* ignore CR */}
      else field+=ch;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  if(!rows.length)return [];
  const headers=rows[0].map(h=>String(h).trim());
  return rows.slice(1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=(r[i]!=null?String(r[i]):'').trim());return o;}).filter(r=>r['Code']&&/^(P|OC)\d+/i.test(String(r['Code']).trim()));
}
function parseNum(s){if(!s||s==='-'||s==='N/A')return 0;return parseFloat(String(s).replace(/[₦$,\s]/g,''))||0;}
function durationMonths(str){if(!str)return 1;const s=str.toLowerCase();const n=parseFloat(s)||1;if(s.includes('week')||s.includes('wk'))return Math.max(0.25,n/4.345);if(s.includes('year'))return n*12;return n;}
function tierFromCat(cat){if(!cat)return 'independent';const c=cat.toLowerCase();if(c.includes('specialist'))return 'specialist';if(c.includes('cluster'))return 'cluster';if(c.includes('foundational'))return 'foundational';return 'independent';}
function tierClass(t){return{specialist:'t-s',cluster:'t-i',foundational:'t-f',independent:'t-g'}[t]||'t-g';}
function tierLabel(t){return{specialist:'Specialist',cluster:'Cluster-Based',foundational:'Foundational',independent:'CNS Program'}[t]||'Program';}
function driveId(raw){if(!raw)return '';return (raw.match(/\/file\/d\/([-\w]{20,})/)||raw.match(/\/d\/([-\w]{20,})/)||raw.match(/[?&]id=([-\w]{20,})/)||[])[1]||'';}
function posterURL(p){const raw=(p['Image URL']||p['Image Url']||p['Poster Image URL']||p['Poster']||p['Image']||p['Images']||p['Poster Link']||'').trim();if(!raw)return '';const id=driveId(raw);if(id)return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000';if(/^https?:\/\//i.test(raw))return raw;return '';}
function posterId(p){const raw=(p['Image URL']||p['Image Url']||p['Poster Image URL']||p['Poster']||p['Image']||p['Images']||p['Poster Link']||'').trim();return driveId(raw);}
function docURL(p){const raw=(p['Doc URL']||p['Doc Url']||p['Description Doc']||p['Description Doc URL']||p['Document']||p['Documents']||p['Docs']||p['Doc Link']||'').trim();if(!raw)return '';const id=driveId(raw);if(id){if(raw.includes('/document/'))return 'https://docs.google.com/document/d/'+id+'/preview';return 'https://drive.google.com/file/d/'+id+'/preview';}if(/^https?:\/\//i.test(raw))return raw;return '';}
function imgRetry(img){const id=img.getAttribute('data-fid');const nm=img.getAttribute('data-nm')||'';if(id&&!img.getAttribute('data-tried')){img.setAttribute('data-tried','1');img.src='https://lh3.googleusercontent.com/d/'+id+'=w1000';return;}img.parentElement.innerHTML='<div class="ph-fallback"><i class="ti ti-heart-handshake"></i><span>'+nm+'</span></div>';}
function imgRetryPoster(img){const id=img.getAttribute('data-fid');const nm=img.getAttribute('data-nm')||'';if(id&&!img.getAttribute('data-tried')){img.setAttribute('data-tried','1');img.src='https://lh3.googleusercontent.com/d/'+id+'=w1000';return;}img.parentElement.innerHTML='<div class="pf2"><i class="ti ti-heart-handshake"></i><span>'+nm+'</span></div>';}

function renderCards(list){
  const g=document.getElementById('pg'),nr=document.getElementById('nrMsg');
  if(!list.length){g.innerHTML='';nr.style.display='block';return;}
  nr.style.display='none';const facs=[3,4,5,6,7,8,9,10,11];
  g.innerHTML='<div class="pg">'+list.map(p=>{
    const tier=tierFromCat(p['Internal Categories']);const total=parseNum(p['Total Payable NGN']);const fee=parseNum(p['Training Fee NGN']);
    const disp=total>0?total:fee;const dur=p['Realistic Duration']||'—';
    const promo=bestDiscount(p,false);// card shows item/site promo only (NYSC is opt-in inside the modal)
    let feeHTML;
    if(promo.pct>0&&disp>0&&fee>0){
      const promoTotal=Math.round((fee*(1-promo.pct/100))+(disp-fee));
      feeHTML=`<div class="pf"><span class="pf-old">&#x20A6;${disp.toLocaleString()}</span> &#x20A6;${promoTotal.toLocaleString()} <span>/ full payment (total NG)</span><span class="promo-pill">−${promo.pct}% ${promo.label}</span></div>`;
    } else {
      feeHTML=`<div class="pf">&#x20A6;${disp>0?disp.toLocaleString():'—'} <span>/ full payment (total NG)</span></div>`;
    }
    const desc=(p['Care Gap Justification']||p['Standalone Distinction']||'').substring(0,100)+'…';
    const fac=facs[Math.floor(Math.random()*facs.length)];const poster=posterURL(p);const pid=posterId(p);
    const per=disp>0?Math.round(disp*1.04/3):0;
    const instLine=(!p.__online && per>0)?`<div class="pinst"><span class="pinst-lbl">3 installments:</span> <b>1</b> ₦${per.toLocaleString()} · <b>2</b> ₦${per.toLocaleString()} · <b>3</b> ₦${per.toLocaleString()}</div>`:(p.__online?`<div class="pinst"><span class="pinst-lbl" style="color:var(--forest)">Full payment only</span></div>`:'');
    const thumb=poster?`<div class="pc-thumb"><img src="${poster}" alt="" data-fid="${pid}" data-nm="${p['Code']}" onerror="imgRetry(this)"></div>`:`<div class="pc-thumb"><div class="ph-fallback"><i class="ti ti-heart-handshake"></i><span>${tierLabel(tier)}</span></div></div>`;
    return `<div class="pc" onclick="openModal('${p['Code']}')">${thumb}<div class="pct"><div style="display:flex;align-items:center;gap:7px;margin-bottom:5px"><span class="ptier ${tierClass(tier)}">${tierLabel(tier)}</span><span class="pcode">${p['Code']}</span>${p.__online?'<span class="online-tag"><i class="ti ti-world"></i> ONLINE</span>':''}</div><div class="pn">${p['Program Name']}</div><div class="pd">${desc}</div>${feeHTML}${instLine}</div><div class="pdiv"></div><div class="pcb"><div class="pm"><span class="mi"><i class="ti ti-clock"></i> ${dur}</span><span class="mi live"><i class="ti ti-users"></i> ${fac} Trainers</span></div><div class="pc-actions"><button class="add-cart" onclick="event.stopPropagation();addToCart('${p['Code']}')" title="Add to application"><i class="ti ti-plus"></i> Add</button><button class="pen" onclick="event.stopPropagation();openModal('${p['Code']}')">Enroll</button></div></div></div>`;
  }).join('')+'</div>';
  if(!firstRenderDone){observeCards();firstRenderDone=true;}
  else{document.querySelectorAll('.pc').forEach(c=>c.classList.add('in-view'));}
}
function applyFilters(){
  const q=document.getElementById('si').value.toLowerCase().trim();
  let list=curCat==='all'?allPrograms.slice():allPrograms.filter(p=>{
    const cat=(p['Internal Categories']||'').trim().toLowerCase();
    if(curCat==='online-cert')return p.__online===true;
    if(curCat==='vocational')return !p.__online;
    return !p.__online && cat===curCat.trim().toLowerCase();});
  if(q)list=list.filter(p=>[p['Program Name'],p['Code'],p['Cluster'],p['Internal Categories'],p['Care Gap Justification'],p['Certificate Level'],p['Career Pathway Category']].join(' ').toLowerCase().includes(q));
  if(curSort==='az')list.sort((a,b)=>a['Program Name'].localeCompare(b['Program Name']));
  else if(curSort==='za')list.sort((a,b)=>b['Program Name'].localeCompare(a['Program Name']));
  else if(curSort==='dur-asc')list.sort((a,b)=>durationMonths(a['Realistic Duration'])-durationMonths(b['Realistic Duration']));
  else if(curSort==='dur-desc')list.sort((a,b)=>durationMonths(b['Realistic Duration'])-durationMonths(a['Realistic Duration']));
  else if(curSort==='fee-asc')list.sort((a,b)=>feeVal(a)-feeVal(b));
  else if(curSort==='fee-desc')list.sort((a,b)=>feeVal(b)-feeVal(a));
  else list.sort((a,b)=>{const d=feeVal(a)-feeVal(b);return d!==0?d:(a['Program Name']||'').localeCompare(b['Program Name']||'');});// default: cheapest first, then A→Z, programs+courses mixed
  window.__list=list;(curView==='grid'?renderCards:renderList)(list);
}
function feeVal(p){return parseNum(p['Total Payable NGN'])||parseNum(p['Training Fee NGN'])||0;}
function setCat(c,btn){curCat=c;document.querySelectorAll('.col-left .fb2').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function setSort(s,btn){curSort=s;document.querySelectorAll('.sort-row2 .sb2').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}

let _scrollY=0,_locked=false;
function lockScroll(){if(_locked)return;_scrollY=window.scrollY||window.pageYOffset||0;document.body.style.top=(-_scrollY)+'px';document.body.classList.add('scroll-locked');_locked=true;}
function unlockScroll(){if(!_locked)return;document.body.classList.remove('scroll-locked');document.body.style.top='';window.scrollTo(0,_scrollY);_locked=false;}

function openModal(code){
  curProg=allPrograms.find(p=>p['Code']===code);if(!curProg)return;selectedPlan='full';qty=1;updateAppFee();
  const onlineOnly=!!curProg.__online;
  const ci=document.getElementById('choiceInstall');if(ci)ci.style.display=onlineOnly?'none':'';
  const cf=document.getElementById('choiceFull');if(cf){cf.classList.add('sel');cf.classList.toggle('full-only',onlineOnly);if(ci)ci.classList.remove('sel');}
  document.getElementById('mT').textContent=curProg['Program Name'];
  document.getElementById('mSub').textContent=(curProg['Certificate Level']||'')+' · '+(curProg['Realistic Duration']||'');
  document.getElementById('mFee').textContent=curProg['Total Payable NGN']||'—';
  document.getElementById('mFeeLbl').textContent='Total (NG)';
  document.getElementById('mFac').textContent=Math.floor(Math.random()*8+3);
  document.getElementById('mDur').textContent=curProg['Realistic Duration']||'—';
  const descText=curProg['Care Gap Justification']||curProg['Standalone Distinction']||'';
  curDocUrl=docURL(curProg);
  const mDescEl=document.getElementById('mDesc');
  mDescEl.textContent=descText;
  if(curDocUrl){const lm=document.createElement('span');lm.className='learnmore';lm.textContent=' Learn more...';lm.onclick=openDoc;mDescEl.appendChild(document.createTextNode(' '));mDescEl.appendChild(lm);}
  const paths=[curProg['Suggested Next Path 1'],curProg['Suggested Next Path 2'],curProg['Suggested Next Path 3']].filter(Boolean);
  const pw=document.getElementById('mPathWrap');
  if(paths.length){document.getElementById('mPaths').innerHTML=paths.map(p=>`<span class="cp-tag"><i class="ti ti-arrow-right"></i> ${p}</span>`).join('');pw.style.display='block';}else pw.style.display='none';
  const poster=posterURL(curProg);const pid=posterId(curProg);const pEl=document.getElementById('poster');const pcap=document.getElementById('posterCap');
  if(poster){pEl.innerHTML=`<img src="${poster}" alt="" data-fid="${pid}" data-nm="${curProg['Program Name']}" onerror="imgRetryPoster(this)" onclick="openImg(this.src)"><div class="zoom-hint"><i class="ti ti-zoom-in"></i> Tap to expand</div>`;pcap.style.display='block';}
  else{pEl.innerHTML=`<div class="pf2"><i class="ti ti-heart-handshake"></i><span>${curProg['Program Name']}</span></div>`;pcap.style.display='none';}
  document.getElementById('appEmail').value=applicantEmail||'';
  document.getElementById('appName').value=applicantName||'';
  const cEl=document.getElementById('appCountry');if(cEl&&!cEl.value){cEl.value=(region==='ng')?'Nigeria':'';}
  document.getElementById('nyscChk').checked=false;
  document.getElementById('nyscNum').style.display='none';document.getElementById('nyscNum').value='';
  goStep(1);
  document.getElementById('ov').classList.add('open');lockScroll();
  startEncourage();
}
function closeModal(){document.getElementById('ov').classList.remove('open');unlockScroll();stopEncourage();}
function goStep(n){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step'+n).classList.add('active');
  const d1=document.getElementById('dot1'),d2=document.getElementById('dot2'),d3=document.getElementById('dot3');
  [d1,d2,d3].forEach(d=>d.classList.remove('cur','done'));
  if(n===1)d1.classList.add('cur');
  if(n===2){d1.classList.add('done');d2.classList.add('cur');recalcFees();}
  if(n===3){d1.classList.add('done');d2.classList.add('done');d3.classList.add('cur');}
  document.querySelector('.mb').scrollTop=0;
}
function changeQty(d){
  qty=Math.max(1,qty+d);
  updateAppFee();
  if(document.getElementById('step2').classList.contains('active')||document.getElementById('dot2').classList.contains('cur'))recalcFees();
}
function updateAppFee(){
  const unit=appFee();const total=unit*qty;
  document.getElementById('qtyVal').textContent=qty;
  document.getElementById('appFeeTotal').textContent='₦'+total.toLocaleString();
  document.getElementById('appFeeBreak').textContent=qty>1?('(₦'+unit.toLocaleString()+' × '+qty+' trainees)'):'';
  document.getElementById('appPayLabel').innerHTML='Pay ₦'+total.toLocaleString()+' Application Fee'+(qty>1?' ('+qty+' trainees)':'');
  document.getElementById('bulkNote').style.display=qty>1?'flex':'none';
  const ab=document.getElementById('appFeeBig');if(ab)ab.innerHTML='&#x20A6;'+unit.toLocaleString()+' <span style="font-size:13px;font-weight:400;color:var(--text3)">per trainee</span>';
}
function payApplicationFee(){
  const email=document.getElementById('appEmail').value.trim();
  const name=document.getElementById('appName').value.trim();
  if(!email||!email.includes('@')){alert('Please enter a valid email address.');return;}
  if(!name){alert('Please enter your full name.');return;}
  applicantEmail=email;applicantName=name;
  applicantCountry=document.getElementById('appCountry').value.trim();
  applicantState=document.getElementById('appState').value.trim();
  applicantLGA=document.getElementById('appLGA').value.trim();
  applicantPhone=document.getElementById('appPhone').value.trim();
  applicantStyle=document.getElementById('appStyle').value.trim();
  const total=appFee()*qty;
  const handler=PaystackPop.setup({key:PAYSTACK_KEY,email:email,amount:total*100,currency:'NGN',ref:'CNS-APP-'+Date.now(),
    metadata:{type:'application_fee',program:curProg['Program Name'],code:curProg['Code'],name:name,trainees:qty,country:applicantCountry,state:applicantState,lga:applicantLGA,phone:applicantPhone,style:applicantStyle},
    callback:function(resp){onAppFeePaid(resp.reference);},onClose:function(){}});
  handler.openIframe();
}
const ENCOURAGE_MSGS=[
  "Train in as many programs as you can — broader, deeper skills move you toward global competency and standards.",
  "Use our flexible mode of training to fit your tight schedule — learn at a pace that works for your life and work.",
  "Add as many supporting Online Certificate (theory) courses as possible to strengthen and round out your career pathway.",
  "Every additional program raises your value to employers at home and abroad — keep building, one certification at a time.",
  "Aim beyond a pass: stack complementary programs and courses to stand out and meet global industry standards."
];
let _encIdx=0,_encTimer=null;
function startEncourage(){
  const box=document.getElementById('encourage'),sp=document.getElementById('encourageMsg');
  if(!box||!sp)return;_encIdx=0;sp.textContent=ENCOURAGE_MSGS[0];box.style.display='flex';
  clearInterval(_encTimer);
  _encTimer=setInterval(function(){
    sp.classList.add('fade');
    setTimeout(function(){_encIdx=(_encIdx+1)%ENCOURAGE_MSGS.length;sp.textContent=ENCOURAGE_MSGS[_encIdx];sp.classList.remove('fade');},400);
  },5000);
}
function stopEncourage(){clearInterval(_encTimer);_encTimer=null;}

/* ===================== MULTI-ITEM APPLICATION CART ===================== */
let cart=[];// [{code,qty}]
function cartType(){ if(!cart.length)return null; const f=allPrograms.find(p=>p['Code']===cart[0].code); return f&&f.__online?'online':'vocational'; }
function typeLabel(t){ return t==='online'?'Online Certificate Courses':'Vocational Programs'; }
function addToCart(code){
  const p=allPrograms.find(x=>x['Code']===code); if(!p)return;
  const thisType=p.__online?'online':'vocational';
  const ct=cartType();
  if(ct && ct!==thisType){
    showCartWarn('Mixing isn\'t allowed — Vocational Programs and Online Certificate Courses are paid for separately. Your application currently holds '+typeLabel(ct)+'. Kindly finish this payment or clear it to switch over to the other Category of Training Enrollment. Thanks.');
    openCart();
    return;
  }
  const ex=cart.find(i=>i.code===code);
  if(ex){ ex.qty++; } else { cart.push({code,qty:1}); }
  setCartTip();
  flashAdded(code);
  renderCart(); updateCartFab();
}
function flashAdded(code){
  document.querySelectorAll('.pc').forEach(c=>{const cd=c.querySelector('.pcode');if(cd&&cd.textContent===code){const b=c.querySelector('.add-cart');if(b){b.classList.add('added');b.innerHTML='<i class="ti ti-check"></i> Added';setTimeout(()=>{b.classList.remove('added');b.innerHTML='<i class="ti ti-plus"></i> Add';},1400);}}});
}
function removeFromCart(code){ cart=cart.filter(i=>i.code!==code); setCartTip(); renderCart(); updateCartFab(); }
function cartQty(code,d){ const i=cart.find(x=>x.code===code); if(!i)return; i.qty=Math.max(1,i.qty+d); renderCart(); }
function clearCart(){ cart=[]; setCartTip(); renderCart(); updateCartFab(); closeCart(); }
function showCartWarn(msg){ const w=document.getElementById('cartWarn'); if(!w)return; w.classList.add('error'); w.innerHTML='<i class="ti ti-alert-triangle"></i><span>'+msg+'</span>'; }
function setCartTip(){ const w=document.getElementById('cartWarn'); if(!w)return; w.classList.remove('error'); w.innerHTML='<i class="ti ti-info-circle"></i><span>You can apply for several at once — but Vocational Programs and Online Certificate Courses are paid for separately. Keep each application to one category.</span>'; }
function cartAppTotal(){ const ct=cartType(); const fee=ct==='online'?APP_FEE_ONLINE_NGN:APP_FEE_NGN; return cart.reduce((s,i)=>s+fee*i.qty,0); }
function updateCartFab(){
  const fab=document.getElementById('cartFab'),cnt=document.getElementById('cartCount');
  const n=cart.reduce((s,i)=>s+i.qty,0);
  cnt.textContent=n;
  fab.style.display=cart.length?'flex':'none';
}
function openCart(){ renderCart(); document.getElementById('cartOv').classList.add('show'); lockScroll();
  // prefill contact from any prior entry
  if(applicantName)document.getElementById('cartName').value=applicantName;
  if(applicantEmail)document.getElementById('cartEmail').value=applicantEmail;
  const cEl=document.getElementById('cartCountry');if(cEl&&!cEl.value)cEl.value=(region==='ng')?'Nigeria':'';
}
function closeCart(){ document.getElementById('cartOv').classList.remove('show'); unlockScroll(); }
function renderCart(){
  const ct=cartType(); const fee=ct==='online'?APP_FEE_ONLINE_NGN:APP_FEE_NGN;
  document.getElementById('cartWarn').style.display='flex';
  document.getElementById('cartTypeBar').innerHTML=ct?('Category: <b>'+typeLabel(ct)+'</b> · application fee ₦'+fee.toLocaleString()+' per trainee/item'):'Add programs or courses to begin. They cannot be mixed.';
  const box=document.getElementById('cartItems');
  if(!cart.length){ box.innerHTML='<div class="cart-empty">Your application is empty. Browse and tap “Add”.</div>'; }
  else{
    box.innerHTML=cart.map(i=>{
      const p=allPrograms.find(x=>x['Code']===i.code)||{};
      return `<div class="cart-item"><div class="ci-main"><div class="ci-name">${p['Program Name']||i.code} ${p.__online?'<span class="online-tag"><i class="ti ti-world"></i> ONLINE</span>':''}</div><div class="ci-meta">${i.code} · ${p['Realistic Duration']||''}</div><div class="ci-qty"><button onclick="cartQty('${i.code}',-1)">−</button><span>${i.qty} trainee${i.qty>1?'s':''}</span><button onclick="cartQty('${i.code}',1)">+</button></div></div><div style="text-align:right"><div class="ci-fee">₦${(fee*i.qty).toLocaleString()}</div><button class="ci-rm" onclick="removeFromCart('${i.code}')" title="Remove"><i class="ti ti-trash"></i></button></div></div>`;
    }).join('');
  }
  document.getElementById('cartAppTotal').textContent='₦'+cartAppTotal().toLocaleString();
  document.getElementById('cartPayBtn').innerHTML='<i class="ti ti-lock"></i> Pay all application fees (₦'+cartAppTotal().toLocaleString()+')';
}

/* ---- region/discount-aware fees for any item ---- */
function feesForItem(p,nyscOn){
  let t,plc,crt,vrf,isUSD=false;
  if(region==='ng'){t=parseNum(p['Training Fee NGN']);plc=parseNum(p['Industry Placement & Evaluation Fee NGN (15% EXTRA)']);crt=parseNum(p['Certification Fee NGN']);vrf=parseNum(p['Verification Fee NGN']);}
  else if(region==='af'){t=parseNum(p['African Training Fee USD']);plc=parseNum(p['African Industry Placement & Evaluation USD']);crt=parseNum(p['African Certification Fee USD']);vrf=parseNum(p['African Verification Fee USD']);isUSD=true;}
  else{t=parseNum(p['Non-African Training Fee USD']);plc=parseNum(p['Non-African Subsidized Industry Placement & Evaluation USD']);crt=parseNum(p['Non-African Certification Fee USD']);vrf=parseNum(p['Non-African Verification Fee USD']);isUSD=true;}
  const disc=bestDiscount(p,nyscOn&&!p.__online); t=t*(1-disc.pct/100);
  const full=t+plc+crt+vrf;
  const iT=t*(1+INSTALL_UPLIFT),iP=plc*(1+INSTALL_UPLIFT),iC=crt*(1+INSTALL_UPLIFT),iV=vrf*(1+INSTALL_UPLIFT);
  return {t,plc,crt,vrf,full,installTotal:iT+iP+iC+iV,isUSD,disc};
}
function cartContact(){
  return {name:document.getElementById('cartName').value.trim(),email:document.getElementById('cartEmail').value.trim(),
    country:document.getElementById('cartCountry').value.trim(),state:document.getElementById('cartState').value.trim(),
    lga:document.getElementById('cartLGA').value.trim(),phone:document.getElementById('cartPhone').value.trim(),
    style:document.getElementById('cartStyle').value.trim()};
}
function cartItemsStr(){ return cart.map(i=>i.code+':'+i.qty).join(','); }
function cartSummaryText(){ return cart.map(i=>{const p=allPrograms.find(x=>x['Code']===i.code)||{};return '• '+(p['Program Name']||i.code)+' ('+i.code+') × '+i.qty;}).join('\n'); }

let lastCartRef='';
function payCartApplication(){
  if(!cart.length){alert('Your application is empty.');return;}
  const c=cartContact();
  if(!c.email||!c.email.includes('@')){alert('Please enter a valid email address.');return;}
  if(!c.name){alert('Please enter your full name.');return;}
  applicantName=c.name;applicantEmail=c.email;applicantCountry=c.country;applicantState=c.state;applicantLGA=c.lga;applicantPhone=c.phone;applicantStyle=c.style;
  const total=cartAppTotal();
  const handler=PaystackPop.setup({key:PAYSTACK_KEY,email:c.email,amount:total*100,currency:'NGN',ref:'CNS-APPCART-'+Date.now(),
    metadata:{type:'application_fee_cart',items:cartItemsStr(),category:cartType(),name:c.name,country:c.country,state:c.state,lga:c.lga,phone:c.phone,style:c.style},
    callback:function(resp){onCartAppPaid(resp.reference);},onClose:function(){}});
  handler.openIframe();
}
function cartResumeLink_(){return PORTAL_URL+'?cart='+encodeURIComponent(cartItemsStr())+'&resume=cart&email='+encodeURIComponent(applicantEmail);}
function onCartAppPaid(ref){
  lastCartRef=ref;
  sendEmail(EMAILJS_TEMPLATE_APPLICATION,{to_name:applicantName,to_email:applicantEmail,
    program_name:'Your application ('+typeLabel(cartType())+'):\n'+cartSummaryText(),
    ref:ref,payment_link:cartResumeLink_()});
  enterCartTraining();
}

/* ---- combined training step ---- */
let cartPlan='full';
function enterCartTraining(){ cartPlan='full'; renderCartTraining(); document.getElementById('cartOv').classList.add('show'); lockScroll(); }
function cartTrainTotals(nyscOn,inst){
  let full=0,instTot=0,isUSD=false,perProg=[];
  cart.forEach(i=>{const p=allPrograms.find(x=>x['Code']===i.code);if(!p)return;const f=feesForItem(p,nyscOn);isUSD=f.isUSD;
    full+=f.full*i.qty; instTot+=f.installTotal*i.qty;
    perProg.push({code:i.code,name:p['Program Name'],qty:i.qty,full:f.full*i.qty,installTotal:f.installTotal*i.qty,online:!!p.__online});});
  return {full,instTot,isUSD,perProg};
}
function renderCartTraining(){
  const ct=cartType(); const isVoc=ct==='vocational';
  const nyscOn=isVoc && document.getElementById('cartNysc') && document.getElementById('cartNysc').checked;
  const T=cartTrainTotals(nyscOn,false);
  const fmt=n=>T.isUSD?'$'+n.toFixed(2):'₦'+Math.round(n).toLocaleString();
  document.getElementById('cartTypeBar').innerHTML='Step 2 of 2 — Training payment · <b>'+typeLabel(ct)+'</b>';
  document.getElementById('cartWarn').style.display='none';
  // items with training fees
  document.getElementById('cartItems').innerHTML=T.perProg.map(pp=>`<div class="cart-item"><div class="ci-main"><div class="ci-name">${pp.name} ${pp.online?'<span class="online-tag"><i class="ti ti-world"></i> ONLINE</span>':''}</div><div class="ci-meta">${pp.code} · ${pp.qty} trainee${pp.qty>1?'s':''}</div></div><div class="ci-fee">${fmt(cartPlan==='install'&&isVoc?pp.installTotal:pp.full)}</div></div>`).join('');
  // foot
  const instPer=T.instTot/3;
  let nyscBox=isVoc?`<div class="nysc-wrap" style="margin-bottom:10px"><div class="nysc-row"><input type="checkbox" id="cartNysc" onchange="renderCartTraining()"><label for="cartNysc"><i class="ti ti-discount-2" style="color:var(--gold);vertical-align:-2px"></i> NYSC Corper — ${NYSC_PCT}% off Training Fee (one call-up number for all)</label></div><input type="text" class="nysc-inp" id="cartNyscNum" placeholder="Enter verifiable NYSC call-up number" style="display:${nyscOn?'block':'none'}"></div>`:'';
  let planToggle=isVoc?`<div class="choice-row" style="margin-bottom:10px"><div class="choice ${cartPlan==='full'?'sel':''}" onclick="cartPlan='full';renderCartTraining()"><div class="ch-title">Full Payment</div><div class="ch-amt">${fmt(T.full)}</div></div><div class="choice ${cartPlan==='install'?'sel':''}" onclick="cartPlan='install';renderCartTraining()"><div class="ch-title">Installments</div><div class="ch-amt">${fmt(T.instTot)}</div><div class="ch-sub">3 payments</div></div></div>`:'';
  let note='';
  if(isVoc && cartPlan==='install'){
    const per=T.perProg.map(pp=>'   – '+pp.name+': '+fmt(pp.installTotal/3)+' × 3').join('\n');
    note=`<div class="cart-foot-note"><b>Combined installments:</b> ${fmt(instPer)} now, then ${fmt(instPer)} × 2.<br><b>Per-program breakdown (each in 3):</b><br>${T.perProg.map(pp=>'• '+pp.name+': '+fmt(pp.installTotal/3)+' ×3').join('<br>')}</div>`;
  } else if(!isVoc){
    note='<div class="cart-foot-note">Online Certificate Courses are full payment only (no installments).</div>';
  }
  const payAmt=isVoc&&cartPlan==='install'?instPer:T.full;
  const payLbl=isVoc&&cartPlan==='install'?('Pay first installment ('+fmt(instPer)+')'):('Pay training in full ('+fmt(T.full)+')');
  document.getElementById('cartItems').insertAdjacentHTML('afterend','');
  const foot=document.querySelector('.cart-foot');
  foot.innerHTML=`<div class="cart-total-row"><span>${cartPlan==='install'&&isVoc?'Installment total':'Training total'}</span><strong>${fmt(cartPlan==='install'&&isVoc?T.instTot:T.full)}</strong></div>${nyscBox}${planToggle}${note}<button class="bp gold" onclick="payCartTraining()"><i class="ti ti-lock"></i> ${payLbl}</button><button class="cart-clear" onclick="closeCart()">Close — I'll finish later</button>`;
  if(document.getElementById('cartNysc'))document.getElementById('cartNysc').checked=nyscOn;
  const nn=document.getElementById('cartNyscNum');if(nn)nn.style.display=nyscOn?'block':'none';
}
function payCartTraining(){
  const ct=cartType(); const isVoc=ct==='vocational';
  const nyscOn=isVoc && document.getElementById('cartNysc') && document.getElementById('cartNysc').checked;
  const nyscNum=isVoc && document.getElementById('cartNyscNum')?document.getElementById('cartNyscNum').value.trim():'';
  if(nyscOn&&!nyscNum){alert('Please enter your NYSC call-up number.');return;}
  const T=cartTrainTotals(nyscOn,false); const inst=isVoc&&cartPlan==='install';
  const amt=inst?(T.instTot/3):T.full;
  const chargeNGN=Math.round(T.isUSD?amt*USD_TO_NGN:amt);
  const handler=PaystackPop.setup({key:PAYSTACK_KEY,email:applicantEmail,amount:chargeNGN*100,currency:'NGN',ref:'CNS-TRNCART-'+Date.now(),
    metadata:{type:'training_cart',items:cartItemsStr(),category:ct,plan:inst?'install':'full',nysc:nyscOn?nyscNum:'no',name:applicantName,email:applicantEmail,country:applicantCountry,state:applicantState,lga:applicantLGA,phone:applicantPhone,style:applicantStyle},
    callback:function(resp){onCartTrainingPaid(resp.reference,chargeNGN,inst,nyscOn,nyscNum,T);},onClose:function(){}});
  handler.openIframe();
}
function onCartTrainingPaid(ref,chargeNGN,inst,nyscOn,nyscNum,T){
  const fmt=n=>T.isUSD?'$'+n.toFixed(2):'₦'+Math.round(n).toLocaleString();
  const amtPaid='₦'+chargeNGN.toLocaleString();
  const fullBlock=inst?'':('Full training payment received for all items in your '+typeLabel(cartType())+' application:\n'+T.perProg.map(pp=>'• '+pp.name+': '+fmt(pp.full)).join('\n')+'\nGrand total: '+fmt(T.full)+'.');
  const instBlock=inst?('First combined installment received. Remaining: '+fmt(T.instTot/3)+' × 2.\nPer-program (each split into 3):\n'+T.perProg.map(pp=>'• '+pp.name+': '+fmt(pp.installTotal/3)+' ×3').join('\n')):'';
  const nyscBlock=nyscOn?('NYSC discount applied across programs; call-up number '+nyscNum+' will be verified within 3–5 working days.'):'NYSC — Not Applicable.';
  sendEmail(EMAILJS_TEMPLATE_PAYMENT,{to_name:applicantName,to_email:applicantEmail,program_name:typeLabel(cartType())+' — '+cart.length+' item(s)',ref:ref,amount:amtPaid,payment_type:inst?'First installment (combined)':'Full payment (combined)',full_block:fullBlock,installment_block:instBlock,nysc_block:nyscBlock,form_link:FORM_URL});
  closeCart();
  document.getElementById('ov').classList.add('open');lockScroll();
  goStep(3);
  document.getElementById('successMsg').innerHTML=`Your ${inst?'first installment':'full payment'} of <strong>${amtPaid}</strong> for <strong>${cart.length} ${typeLabel(cartType())}</strong> item(s) has been received. A summary has been emailed to you.`;
  cart=[];updateCartFab();
}
function openFaqVideo(){
  document.getElementById('faqFrame').src='https://www.youtube.com/embed/wRzU0JFsnSc?autoplay=1&rel=0';
  document.getElementById('faqOv').classList.add('show');lockScroll();
}
function closeFaqVideo(){
  document.getElementById('faqOv').classList.remove('show');unlockScroll();
  document.getElementById('faqFrame').src='about:blank';// stops playback
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeFaqVideo();});
function onAppFeePaid(ref){
  lastAppRef=ref;
  sendEmail(EMAILJS_TEMPLATE_APPLICATION,{to_name:applicantName,to_email:applicantEmail,program_name:curProg['Program Name']+(qty>1?` (${qty} trainees)`:''),ref:ref,payment_link:resumeLink_()});
  const ab=document.getElementById('ackBox');if(ab){ab.style.display='flex';document.getElementById('ackEmail').textContent=applicantEmail;const re=document.getElementById('ackResendEmail');if(re)re.value=applicantEmail;}
  goStep(2);
}
function resendAck(){
  const re=document.getElementById('ackResendEmail');const em=(re?re.value:applicantEmail).trim();
  if(!em||!em.includes('@')){alert('Please enter a valid email address to resend to.');return;}
  applicantEmail=em;
  sendEmail(EMAILJS_TEMPLATE_APPLICATION,{to_name:applicantName||'Applicant',to_email:em,program_name:curProg['Program Name']+(qty>1?` (${qty} trainees)`:''),ref:lastAppRef||('CNS-APP-'+Date.now()),payment_link:resumeLink_()});
  document.getElementById('ackEmail').textContent=em;
  alert('Acknowledgement email re-sent to '+em+'. If it still does not arrive, check the spelling and the spam folder.');
}
function getFees(){
  const p=curProg;let t,plc,crt,vrf,isUSD=false;
  if(region==='ng'){t=parseNum(p['Training Fee NGN']);plc=parseNum(p['Industry Placement & Evaluation Fee NGN (15% EXTRA)']);crt=parseNum(p['Certification Fee NGN']);vrf=parseNum(p['Verification Fee NGN']);}
  else if(region==='af'){t=parseNum(p['African Training Fee USD']);plc=parseNum(p['African Industry Placement & Evaluation USD']);crt=parseNum(p['African Certification Fee USD']);vrf=parseNum(p['African Verification Fee USD']);isUSD=true;}
  else{t=parseNum(p['Non-African Training Fee USD']);plc=parseNum(p['Non-African Subsidized Industry Placement & Evaluation USD']);crt=parseNum(p['Non-African Certification Fee USD']);vrf=parseNum(p['Non-African Verification Fee USD']);isUSD=true;}
  return {t,plc,crt,vrf,isUSD};
}
function recalcFees(){
  const f=getFees();const nysc=document.getElementById('nyscChk').checked&&region==='ng';
  document.getElementById('nyscWrap').style.display=region==='ng'?'block':'none';
  const npl=document.getElementById('nyscPctLbl');if(npl)npl.textContent=NYSC_PCT;
  document.getElementById('nyscNum').style.display=nysc?'block':'none';
  const q=Math.max(1,qty);
  document.getElementById('qtyChip').style.display=q>1?'inline-flex':'none';
  document.getElementById('qtyChipN').textContent=q;
  document.getElementById('bulkNote2').style.display=q>1?'flex':'none';
  const disc=bestDiscount(curProg,nysc);
  let training=f.t*(1-disc.pct/100);
  training*=q;const plc=f.plc*q,crt=f.crt*q,vrf=f.vrf*q;
  const fmt=n=>f.isUSD?'$'+n.toFixed(2):'₦'+Math.round(n).toLocaleString();
  const fullTotal=training+plc+crt+vrf;
  const iT=training*(1+INSTALL_UPLIFT),iP=plc*(1+INSTALL_UPLIFT),iC=crt*(1+INSTALL_UPLIFT),iV=vrf*(1+INSTALL_UPLIFT);
  const installTotal=iT+iP+iC+iV;
  const months=durationMonths(curProg['Realistic Duration']);
  const count=3; // 1 upfront + 2 remaining
  const remWindowDays=Math.max(21,Math.min(months,3)*30); // remaining 2 settle within <=3 months, relative to duration
  const perAmt=installTotal/count;
  const today=new Date();const dues=[];
  for(let i=0;i<count;i++){const d=new Date(today);d.setDate(d.getDate()+Math.round(i*(remWindowDays/(count-1))));dues.push(d);}
  feeState={training,plc,crt,vrf,fullTotal,installTotal,iT,iP,iC,iV,isUSD:f.isUSD,fmt,nysc,count,perAmt,dues,qty:q,disc};
  document.getElementById('fullAmt').textContent=fmt(fullTotal);
  document.getElementById('installAmt').textContent=fmt(installTotal);
  document.getElementById('installSubLabel').textContent=count+' payments';
  renderFeeTable();renderInstallDetail();updatePayButton();
}
function renderFeeTable(){
  const s=feeState;const inst=selectedPlan==='install';
  const t=inst?s.iT:s.training,p=inst?s.iP:s.plc,c=inst?s.iC:s.crt,v=inst?s.iV:s.vrf;
  const total=inst?s.installTotal:s.fullTotal;
  const placementRow=(p&&p>0)?`<div class="pay-row"><span class="lbl">Industry placement &amp; evaluation</span><span class="amt">${s.fmt(p)}</span></div>`:'';
  const discPill=(s.disc&&s.disc.pct>0)?`<span class="disc-pill">-${s.disc.pct}% ${s.disc.label}</span>`:'';
  document.getElementById('feeTable').innerHTML=`<div class="pay-row"><span class="lbl">Training fee${discPill}</span><span class="amt">${s.fmt(t)}</span></div>${placementRow}<div class="pay-row"><span class="lbl">Certification fee</span><span class="amt">${s.fmt(c)}</span></div><div class="pay-row"><span class="lbl">Verification fee</span><span class="amt">${s.fmt(v)}</span></div><div class="pay-row total"><span class="lbl">${inst?'Installment total':'Total payable'}${s.qty>1?' <span style="font-weight:400;color:var(--text3)">('+s.qty+' trainees)</span>':''}</span><span class="amt">${s.fmt(total)}</span></div>`;
}
function renderInstallDetail(){
  const s=feeState;const box=document.getElementById('installDetail');
  if(selectedPlan!=='install'){box.style.display='none';box.innerHTML='';return;}
  box.style.display='block';
  const rows=s.dues.map((d,i)=>`<div class="install-row"><span>Installment ${i+1}${i===0?' (due today)':''}</span><span><span class="due">${d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span> &nbsp; <strong>${s.fmt(s.perAmt)}</strong></span></div>`).join('');
  box.innerHTML=`<div class="install-detail"><h5>Your installment schedule (${s.count} payments)</h5>${rows}<div class="install-warn"><i class="ti ti-alert-triangle" style="vertical-align:-1px"></i> <strong>Please do not default.</strong> Due dates are fixed and programmed to your schedule. You will receive reminders for each outstanding payment. You may also clear the full outstanding balance at any time. Paying in full now (${feeState.fmt(feeState.fullTotal)}) avoids the installment service adjustment.</div><div class="ack-row"><input type="checkbox" id="installAck" onchange="updatePayButton()"><label for="installAck">I understand the installment due dates are fixed, I should not default, and I will receive reminders for outstanding payments.</label></div></div>`;
}
function selectPlan(plan){selectedPlan=plan;document.getElementById('choiceFull').classList.toggle('sel',plan==='full');document.getElementById('choiceInstall').classList.toggle('sel',plan==='install');renderFeeTable();renderInstallDetail();updatePayButton();}
function updatePayButton(){
  const btn=document.getElementById('payProgramBtn'),lbl=document.getElementById('payBtnLabel');
  if(selectedPlan==='install'){const ack=document.getElementById('installAck');btn.disabled=!(ack&&ack.checked);lbl.textContent='Pay Installment 1 via Paystack';}
  else{btn.disabled=false;lbl.textContent='Pay in Full via Paystack';}
}
function payProgramFee(){
  const s=feeState;const inst=selectedPlan==='install';
  const nysc=document.getElementById('nyscChk').checked&&region==='ng';
  const nyscNum=document.getElementById('nyscNum').value.trim();
  if(nysc&&!nyscNum){alert('Please enter your NYSC call-up number.');return;}
  let chargeNGN=inst?Math.round(s.isUSD?s.perAmt*USD_TO_NGN:s.perAmt):Math.round(s.isUSD?s.fullTotal*USD_TO_NGN:s.fullTotal);
  const handler=PaystackPop.setup({key:PAYSTACK_KEY,email:applicantEmail,amount:chargeNGN*100,currency:'NGN',ref:'CNS-'+(inst?'INST1':'FULL')+'-'+Date.now(),
    metadata:{program:curProg['Program Name'],code:curProg['Code'],plan:selectedPlan,nysc:nysc?nyscNum:'no',name:applicantName,email:applicantEmail,country:applicantCountry,state:applicantState,lga:applicantLGA,phone:applicantPhone,style:applicantStyle,trainees:qty},
    callback:function(resp){onProgramPaid(resp.reference,chargeNGN,inst,nysc,nyscNum);},onClose:function(){}});
  handler.openIframe();
}
function onProgramPaid(ref,chargeNGN,inst,nysc,nyscNum){
  const s=feeState;const amtPaid='₦'+chargeNGN.toLocaleString();
  const payType=inst?'Installment (Payment 1 of '+s.count+')':'Full Payment';
  let fullBlock,installBlock,nyscBlock;
  if(inst){
    fullBlock='Full Payment — Not Applicable (you selected the installment plan).';
    const sched=s.dues.map((d,i)=>`  Installment ${i+1}: ${s.fmt(s.perAmt)} — due ${d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}${i===0?' (PAID)':''}`).join('\n');
    installBlock=`You have chosen to pay in installments. Total: ${s.fmt(s.installTotal)} across ${s.count} payments.\n\n${sched}\n\nIMPORTANT: Please do not default. Due dates are fixed and programmed to your training schedule. You will receive reminders for each outstanding payment. You may clear the full outstanding balance at any time. Paying in full (${s.fmt(s.fullTotal)}) would have avoided the installment service adjustment.`;
  }else{
    fullBlock=`You have paid in full: ${s.fmt(s.fullTotal)}. Your place is fully secured. Thank you for choosing the recommended option.`;
    installBlock='Installment Payment — Not Applicable (you paid in full).';
  }
  nyscBlock=nysc?`As an NYSC Corper, your place is subject to verification of your NYSC status. Your call-up number (${nyscNum}) will be verified within 3 to 5 working days before your training commencement date is confirmed. Your ${NYSC_PCT}% Training Fee discount has been applied. You will receive a confirmation once verification is complete.`:'NYSC Verification — Not Applicable.';
  const bulkLine=s.qty>1?`\n\nBULK ENROLLMENT (${s.qty} trainees): Our team shall contact you shortly to confirm the details of the candidates you've encouraged to train with us. Thanks greatly!`:'';
  sendEmail(EMAILJS_TEMPLATE_PAYMENT,{to_name:applicantName,to_email:applicantEmail,program_name:curProg['Program Name']+(s.qty>1?` (${s.qty} trainees)`:''),ref:ref,amount:amtPaid,payment_type:payType,full_block:fullBlock+bulkLine,installment_block:installBlock,nysc_block:nyscBlock,form_link:FORM_URL});
  // Log installment schedule to the reminder engine (Google Apps Script)
  if(inst&&APPS_SCRIPT_URL&&!APPS_SCRIPT_URL.includes('XXXX')){
    const installments=s.dues.map((d,i)=>({no:i+1,amount:Math.round(s.isUSD?s.perAmt*USD_TO_NGN:s.perAmt),due:d.toISOString(),status:i===0?'paid':'pending'}));
    fetch(APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'log',email:applicantEmail,name:applicantName,program:curProg['Program Name'],planRef:ref,total:s.count,installments:installments})}).catch(e=>console.log('schedule log error',e));
  }
  document.getElementById('successTitle').textContent=inst?'Installment 1 Received!':'Payment Successful!';
  document.getElementById('successMsg').innerHTML=inst?`Your first installment of <strong>${amtPaid}</strong> for <strong>${curProg['Program Name']}</strong> has been received. Your schedule and reminders have been sent to your email.`+(nysc?' Your NYSC status will be verified before training begins.':''):`Your full payment of <strong>${amtPaid}</strong> for <strong>${curProg['Program Name']}</strong> has been received. Your place is secured.`+(nysc?' Your NYSC status will be verified before training begins.':'');
  document.getElementById('successRef').textContent='Ref: '+ref;
  document.getElementById('successEmail').textContent='A confirmation email has been sent to '+applicantEmail;
  goStep(3);
}
function sendEmail(templateId,params){try{fetch(APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'email',template:templateId,params:params||{}})});console.log('Email queued via Apps Script:',templateId);}catch(e){console.error('Email error:',e);}}
function runEmailTest(){
  const addr=document.getElementById('emailTestAddr').value.trim();
  const out=document.getElementById('emailTestResult');
  if(!addr||!addr.includes('@')){out.innerHTML='<span style="color:#c0392b">Please enter a valid email address first.</span>';return;}
  out.innerHTML='Sending\u2026 please wait.';
  sendEmail(EMAILJS_TEMPLATE_APPLICATION,{to_name:'Test User',to_email:addr,program_name:'TEST \u2014 Basic Home Care & ADL Fundamentals',ref:'CNS-TEST-'+Date.now(),payment_link:PORTAL_URL});
  setTimeout(function(){out.innerHTML='<span style="color:var(--forest);font-weight:600">\u2713 Test queued to the CNS mail service (Apps Script / GmailApp).</span><br><br>Check the inbox and <b>spam / promotions</b> folder of <b>'+addr+'</b>. If nothing arrives, confirm the Apps Script <code>email</code> action is deployed and the Web App access is set to \u201cAnyone\u201d.';},900);
}
function applyRegion(cc,cname){
  cc=(cc||'').toUpperCase();
  if(cc==='NG'){region='ng';regionName='Nigeria';}
  else if(AFRICA.indexOf(cc)!==-1){region='af';regionName=(cname||'Africa')+' (Africa)';}
  else if(cc){region='int';regionName=(cname||'International')+' (International)';}
  else{region='ng';regionName='Nigeria (default)';}
  const lt=document.getElementById('locText');if(lt)lt.textContent='Pricing region: '+regionName;
  const rl=document.getElementById('regionLabel');if(rl)rl.textContent=regionName;
}
async function detectRegion(){
  // provider 1: ipapi.co
  try{const r=await fetch('https://ipapi.co/json/');if(r.ok){const d=await r.json();if(d&&d.country_code){applyRegion(d.country_code,d.country_name);return;}}}catch(e){}
  // provider 2: ipwho.is
  try{const r=await fetch('https://ipwho.is/');if(r.ok){const d=await r.json();if(d&&d.success!==false&&d.country_code){applyRegion(d.country_code,d.country);return;}}}catch(e){}
  // provider 3: geojs
  try{const r=await fetch('https://get.geojs.io/v1/ip/country.json');if(r.ok){const d=await r.json();if(d&&d.country){applyRegion(d.country,d.name);return;}}}catch(e){}
  applyRegion('NG','Nigeria'); // safe default
}
let cardObserver;
function observeCards(){
  if(!('IntersectionObserver'in window)){document.querySelectorAll('.pc').forEach(c=>c.classList.add('in-view'));return;}
  if(cardObserver)cardObserver.disconnect();
  cardObserver=new IntersectionObserver((entries)=>{entries.forEach((e,idx)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in-view'),idx*40);cardObserver.unobserve(e.target);}});},{threshold:0.1});
  document.querySelectorAll('.pc:not(.in-view)').forEach(c=>cardObserver.observe(c));
}
function observeSection(sel){
  if(!('IntersectionObserver'in window)){document.querySelectorAll(sel).forEach(c=>c.classList.add('in-view'));return;}
  const o=new IntersectionObserver((entries)=>{entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in-view'),i*70);o.unobserve(e.target);}});},{threshold:0.15});
  document.querySelectorAll(sel).forEach(c=>o.observe(c));
}
async function loadLinks(){
  if(!LINKS_CSV_URL)return {};
  try{const r=await fetch(LINKS_CSV_URL);if(!r.ok)return {};const t=await r.text();const rows=parseCSV(t);const map={};rows.forEach(x=>{const c=(x['Code']||'').trim();if(c)map[c]={img:(x['Image URL']||x['Image']||'').trim(),doc:(x['Doc URL']||x['Doc']||'').trim()};});return map;}catch(e){return {};}
}
async function loadPrograms(){
  try{const res=await fetch(CSV_URL);if(!res.ok)throw new Error('HTTP '+res.status);const text=await res.text();const parsed=parseCSV(text);if(!parsed.length)throw new Error('No rows');
    const links=await loadLinks();
    parsed.forEach(p=>{const c=(p['Code']||'').trim();if(links[c]){if(!(p['Image URL']||p['Image']||p['Poster Image URL'])&&links[c].img)p['Image URL']=links[c].img;if(!(p['Doc URL']||p['Document']||p['Documents'])&&links[c].doc)p['Doc URL']=links[c].doc;}});
    let online=[];
    async function fetchRows(url){try{const r=await fetch(url);if(!r.ok)return [];const t=await r.text();if(t.trim().slice(0,15).toLowerCase().includes('<!doctype'))return [];return parseCSV(t).filter(p=>(p['Code']||'').trim());}catch(e){return [];}}
    if(ONLINE_CSV_URL) online=await fetchRows(ONLINE_CSV_URL);
    if(!online.length && ONLINE_SHEET_ID) online=await fetchRows('https://docs.google.com/spreadsheets/d/'+ONLINE_SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent(ONLINE_TAB_NAME));
    online.forEach(p=>{p.__online=true;});
    allPrograms=parsed.concat(online);
    await loadEngineGlobals();
    document.getElementById('statProg').textContent=allPrograms.length;document.getElementById('liveBadge').style.display='inline-flex';applyFilters();
  }catch(err){document.getElementById('pg').innerHTML=`<div class="loading-bar" style="color:var(--gold)"><i class="ti ti-alert-circle"></i>Could not load live program data.<br><span style="font-size:12px;color:var(--text3)">Ensure the sheet is published as CSV. Error: ${err.message}</span></div>`;}
}
const stored=localStorage.getItem('cns-theme');
let isDark=stored?stored==='dark':false;/* default: light theme */
function applyTheme(d){document.documentElement.setAttribute('data-theme',d?'dark':'light');document.getElementById('tIcon').textContent=d?'☀️':'🌙';document.getElementById('tLbl').textContent=d?'Day':'Night';}
function toggleTheme(){isDark=!isDark;localStorage.setItem('cns-theme',isDark?'dark':'light');applyTheme(isDark);}
window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',e=>{if(!localStorage.getItem('cns-theme')){isDark=e.matches;applyTheme(isDark);}});
applyTheme(isDark);
document.getElementById('ov').addEventListener('click',e=>{if(e.target===document.getElementById('ov'))closeModal();});
function openDoc(){if(!curDocUrl)return;document.getElementById('docTitle').textContent=curProg?curProg['Program Name']:'Program Document';document.getElementById('docFrame').src=curDocUrl;document.getElementById('docOv').classList.add('open');}
function closeDoc(){document.getElementById('docOv').classList.remove('open');document.getElementById('docFrame').src='';}
function openImg(src){if(!src)return;document.getElementById('imgFull').src=src;document.getElementById('imgOv').classList.add('open');}
function closeImg(){document.getElementById('imgOv').classList.remove('open');document.getElementById('imgFull').src='';}
function toggleMenus(){
  document.body.classList.toggle('menus-collapsed');
  const collapsed=document.body.classList.contains('menus-collapsed');
  const b=document.getElementById('menuToggle');
  b.innerHTML=collapsed?'<i class="ti ti-chevrons-down"></i>':'<i class="ti ti-chevrons-up"></i>';
  b.title=collapsed?'Show menus':'Hide menus';
  const navEl=document.querySelector('nav');const swEl=document.querySelector('.sw');
  if(swEl)swEl.style.top=(collapsed?0:(navEl?navEl.offsetHeight:0))+'px';
}
document.getElementById('docOv').addEventListener('click',e=>{if(e.target===document.getElementById('docOv'))closeDoc();});
document.getElementById('imgOv').addEventListener('click',e=>{if(e.target===document.getElementById('imgOv'))closeImg();});
/* keep floating search bar positioned just below the sticky nav */
(function(){const navEl=document.querySelector('nav');const swEl=document.querySelector('.sw');function syncSticky(){if(navEl&&swEl)swEl.style.top=navEl.offsetHeight+'px';}syncSticky();window.addEventListener('resize',syncSticky);window.addEventListener('load',syncSticky);})();
detectRegion();
try{if(new URLSearchParams(location.search).get('emailtest')==='1'){var _et=document.getElementById('emailTestOv');if(_et)_et.classList.add('show');}}catch(e){}
loadPrograms().then(maybeResumeFromLink).catch(maybeResumeFromLink);observeSection('.ov-c');observeSection('.why-c');
function maybeResumeFromLink(){
  try{
    const q=new URLSearchParams(location.search);
    if(q.get('emailtest')==='1'){document.getElementById('emailTestOv').classList.add('show');}
    if(q.get('email'))applicantEmail=q.get('email');
    if(q.get('cart')&&q.get('resume')==='cart'){
      cart=q.get('cart').split(',').map(s=>{const[c,n]=s.split(':');return {code:c,qty:parseInt(n)||1};}).filter(i=>allPrograms.find(p=>p['Code']===i.code));
      if(cart.length){updateCartFab();enterCartTraining();}
      return;
    }
    const code=q.get('code');if(!code)return;
    const prog=allPrograms.find(p=>String(p['Code']).toUpperCase()===code.toUpperCase());if(!prog)return;
    const qn=parseInt(q.get('qty'));openModal(prog['Code']);
    if(qn&&qn>1){qty=qn;updateAppFee();recalcFees();}
    if(q.get('resume')==='1'){goStep(2);}
  }catch(e){}
}

/* ===== v17 amendments ===== */
/* ===================== CNS Portal v17 amendments ===================== */

/* default view: LIST (honour a saved preference if present) */
let curView='list';
try{var __sv=localStorage.getItem('cns-view');if(__sv==='grid'||__sv==='list')curView=__sv;}catch(e){}

/* ---- List view renderer ---- */
function renderList(list){
  const g=document.getElementById('pg'),nr=document.getElementById('nrMsg');
  if(!list||!list.length){if(g)g.innerHTML='';if(nr)nr.style.display='block';return;}
  if(nr)nr.style.display='none';
  const rows=list.map(function(p){
    const code=(p['Code']||'').toString().replace(/'/g,"\\'");
    const name=p['Program Name']||'Untitled Programme';
    const dur=p['Realistic Duration']||'—';
    const online=!!p.__online;
    const total=parseNum(p['Total Payable NGN']);
    const fee=parseNum(p['Training Fee NGN']);
    const disp=total>0?total:fee;
    const amount=disp>0?('₦'+disp.toLocaleString()):'On request';
    const payNote=online?'Full payment only':'Full payment or 3 instalments';
    const mode=online?'Online only':'Hybrid (online + practicum)';
    const plc=parseNum(p['Industry Placement & Evaluation Fee NGN (15% EXTRA)']);
    const prac=(!online && plc>0);
    const pracTxt=prac?'Practicum required':'No practicum';
    return '<div class="prow">'+
      '<div class="prow-main">'+
        '<a class="prow-name" onclick="openModal(\''+code+'\')" title="Open full programme details">'+name+'</a>'+
        '<div class="prow-meta">'+
          '<span class="pchip"><i class="ti ti-clock"></i> '+dur+'</span>'+
          '<span class="pchip"><i class="ti ti-'+(online?'world':'building-community')+'"></i> '+mode+'</span>'+
          '<span class="pchip '+(prac?'pc-prac':'pc-no')+'"><i class="ti ti-'+(prac?'briefcase':'circle-check')+'"></i> '+pracTxt+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="prow-pay"><div class="prow-amt">'+amount+'</div><div class="prow-amt-note">'+payNote+'</div></div>'+
      '<div class="prow-act">'+
        '<button class="prow-enroll" onclick="openModal(\''+code+'\')"><i class="ti ti-arrow-right"></i> Enroll</button>'+
        '<button class="prow-add" data-code="'+code+'" onclick="addToCart(\''+code+'\')"><i class="ti ti-plus"></i> Add</button>'+
      '</div>'+
    '</div>';
  }).join('');
  g.innerHTML='<div class="plist">'+rows+'</div>';
}

/* ---- Switch between List and Grid ---- */
function setView(v){
  curView=v;
  const l=document.getElementById('vwList'),gr=document.getElementById('vwGrid');
  if(l)l.classList.toggle('on',v==='list');
  if(gr)gr.classList.toggle('on',v==='grid');
  try{localStorage.setItem('cns-view',v);}catch(e){}
  const list=window.__list||(typeof allPrograms!=='undefined'?allPrograms:[]);
  (v==='grid'?renderCards:renderList)(list);
}

/* ---- Navigate dropdown ---- */
function toggleNav(e){
  if(e&&e.stopPropagation)e.stopPropagation();
  const p=document.getElementById('navPanel');if(!p)return;
  const open=p.classList.toggle('open');
  let bd=document.getElementById('navBackdrop');
  if(open){
    if(!bd){bd=document.createElement('div');bd.id='navBackdrop';bd.className='nav-dd-backdrop';
      bd.addEventListener('click',closeNav);document.body.appendChild(bd);}
    bd.classList.add('open');
  }else if(bd){bd.classList.remove('open');}
}
function closeNav(){
  const p=document.getElementById('navPanel');if(p)p.classList.remove('open');
  const bd=document.getElementById('navBackdrop');if(bd)bd.classList.remove('open');
}

/* ---- Options (search / sort / category) reveal on mobile ---- */
function toggleOptions(){
  const c=document.getElementById('optControls');if(c)c.classList.toggle('open');
}

/* ---- Sync view-toggle button state on load ---- */
document.addEventListener('DOMContentLoaded',function(){
  const l=document.getElementById('vwList'),gr=document.getElementById('vwGrid');
  if(l)l.classList.toggle('on',curView==='list');
  if(gr)gr.classList.toggle('on',curView==='grid');
});
