const SUPABASE_URL="https://qjsqgujcsjxhvjumpbtd.supabase.co";
const SUPABASE_KEY="sb_publishable_pxLDAve7JSVg-R0Pv5hPWQ__X33phlf";
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,c)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:(c||"BRL").trim()}).format(v);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const num=s=>{s=s.trim();return s.includes(",")?parseFloat(s.replace(/\./g,"").replace(",",".")):parseFloat(s)};
const TYPES={checking:"Conta corrente",cash:"Dinheiro",credit_card:"Cartão de crédito",investment:"Investimento",loan:"Empréstimo",financing:"Financiamento",fgts:"FGTS",pension:"Previdência",other:"Outra",benefit:"Benefício (vale)"};
let S={tr:null,qs:[],qa:{},pre:null,uid:null,hs:[],hid:null,accounts:[],cats:[],kind:"expense",tab:"dash",rt:false,lastAcc:null,ed:null,par:null,fAcc:null,lim:50,trFrom:"acc",catsAll:[],ce:null,me:null,catFrom:"acc",cmsg:"",loans:[],parFrom:"list",pmsg:"",antId:null,cards:[],lper:"mon",lmon:null,fatAcc:null,fatMon:null,cloAcc:null,cloMon:null,acmId:null,holders:[],fatH:null,wallets:[],wbal:{},intl:{},dper:"mon",dfrom:null,dto:null,splashDone:false,vid:null};
const show=v=>{["login","onboard","app"].forEach(x=>$(x).hidden=x!==v);$("hb").hidden=v!=="app";};

$("lf").onsubmit=async e=>{e.preventDefault();
  const {error}=await sb.auth.signInWithPassword({email:$("em").value,password:$("pw").value});
  error?$("lmsg").textContent="E-mail ou senha incorretos.":start();};
sb.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT"){S.hid=null;S.splashDone=false;show("login");}});

async function loadHouseholds(){
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return null;
  S.uid=user.id;
  const {data}=await sb.from("household_members").select("household_id,households(name)").eq("user_id",user.id);
  S.hs=(data||[]).map(m=>({id:m.household_id,name:m.households?.name||"Família"}));
  return user;
}
async function start(prevIds){
  const user=await loadHouseholds();
  if(!user)return show("login");
  if(!S.hs.length)return show("onboard");
  const novo=prevIds&&S.hs.find(h=>!prevIds.includes(h.id));
  let saved=null;try{saved=localStorage.getItem("hid")}catch(e){}
  const h=novo||S.hs.find(h=>h.id===S.hid)||S.hs.find(h=>h.id===saved)||S.hs[0];
  await pick(h.id,true);subscribe();
}
async function pick(id,keep){
  S.hid=id;S.lastAcc=null;S.pre=null;S.ed=null;S.par=null;S.fAcc=null;S.lim=50;S.parFrom="list";S.antId=null;S.fatAcc=null;S.fatMon=null;S.lmon=null;S.cloAcc=null;S.cloMon=null;S.acmId=null;S.fatH=null;
  try{localStorage.setItem("hid",id)}catch(e){}
  $("hb").textContent="⇄ "+S.hs.find(x=>x.id===id).name;
  show("app");const first=!S.splashDone;S.splashDone=true;const rp=loadRef();if(first)await splash();await rp;go(keep&&["dash","add","list","acc"].includes(S.tab)?S.tab:"dash");
}
async function loadRef(){
  const [a]=await Promise.all([
    sb.from("accounts").select("*").eq("household_id",S.hid).eq("is_active",true).order("name"),loadCats()]);
  S.accounts=a.data||[];await Promise.all([loadQs(),loadLoans(),loadCards(),loadWallets()]);
}
async function loadLoans(){
  const {data}=await sb.from("loan_contracts").select("*").eq("household_id",S.hid);
  S.loans=data||[];
}
async function loadCards(){
  const [c,h]=await Promise.all([sb.from("credit_cards").select("*").eq("household_id",S.hid),sb.from("card_holders").select("*").eq("household_id",S.hid).order("name")]);
  S.cards=c.data||[];S.holders=h.data||[];
}
async function loadWallets(){
  const [w,b]=await Promise.all([sb.from("wallets").select("*").eq("household_id",S.hid).order("name"),sb.from("wallet_balances").select("wallet_id,balance").eq("household_id",S.hid)]);
  S.wallets=w.data||[];S.wbal={};(b.data||[]).forEach(r=>{S.wbal[r.wallet_id]=Number(r.balance);});
}
const walletsOf=id=>S.wallets.filter(w=>w.account_id===id&&w.is_active);
const walletName=id=>(S.wallets.find(w=>w.id===id)||{}).name||"";
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const walWhen=w=>w.credit_month?"em "+MESES[w.credit_month-1]:"todo mês";
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
// modo do cartão nos resumos: "stm" = pelo mês da fatura (padrão) | "buy" = pela data da compra
const cm=()=>lsGet("cardmode")==="buy"?"buy":"stm";
// Lançamentos, Todas as contas: "date" = por data (padrão) | "acc" = agrupado por conta
const lg=()=>lsGet("listgrp")==="acc"?"acc":"date";
const holdersOf=id=>S.holders.filter(h=>h.account_id===id&&h.is_active);
const holderName=id=>(S.holders.find(h=>h.id===id)||{}).name||"";
async function loadCats(){
  const {data}=await sb.from("categories").select("*").eq("household_id",S.hid).order("name");
  S.catsAll=data||[];S.cats=S.catsAll.filter(c=>c.is_active);
}
const catById=id=>S.catsAll.find(c=>c.id===id);
const catLabel=c=>{const p=c.parent_id&&catById(c.parent_id);return p?p.name+" › "+c.name:c.name;};
const catName=id=>{const c=catById(id);return c?catLabel(c):"—";};
const catSort=list=>list.slice().sort((a,b)=>{
  const pa=a.parent_id&&catById(a.parent_id),pb=b.parent_id&&catById(b.parent_id);
  return (pa?pa.name:a.name).localeCompare(pb?pb.name:b.name,"pt-BR")||((pa?1:0)-(pb?1:0))||a.name.localeCompare(b.name,"pt-BR");});
function catOpts(kind,sel,empty){
  let list=S.cats.filter(c=>c.kind===kind);
  const cur=sel&&catById(sel);
  if(cur&&cur.kind===kind&&!cur.is_active)list=list.concat(cur);
  return (empty?'<option value="">(sem categoria)</option>':"")+catSort(list).map(c=>`<option value="${c.id}" ${c.id===sel?"selected":""}>${esc(catLabel(c))}${c.is_active?"":" (arquivada)"}</option>`).join("");
}
const fa=v=>v==null?"":String(v).replace(".",",");
const mAdd=(m,n)=>{const d=new Date(m+"T12:00:00");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";};
/* soma n meses (pode ser negativo) a uma data aaaa-mm-dd, ajustando o dia ao fim do mês (como o date + interval do banco) */
const dAdd=(d,n)=>{const [y,m,dd]=d.split("-").map(Number),t=new Date(Date.UTC(y,m-1+n,1)),Y=t.getUTCFullYear(),M=t.getUTCMonth(),dim=new Date(Date.UTC(Y,M+1,0)).getUTCDate();
  return Y+"-"+String(M+1).padStart(2,"0")+"-"+String(Math.min(dd,dim)).padStart(2,"0");};
const uid4=()=>window.crypto&&crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16);});
const mlab=m=>new Date(m+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
/* mês da fatura = mês do vencimento (espelha card_statement_month do banco) */
const stm=(c,d)=>{const [y,mo,dd]=d.split("-").map(Number),dim=new Date(y,mo,0).getDate(),x=new Date(y,mo-1,1);
  if(dd>Math.min(c.closing_day,dim))x.setMonth(x.getMonth()+1);
  if(c.due_day<=c.closing_day)x.setMonth(x.getMonth()+1);
  return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-01";};
async function loadQs(){
  const q=await sb.from("quick_entries").select("*").eq("household_id",S.hid).eq("user_id",S.uid).eq("is_active",true);
  S.qs=(q.data||[]).sort((a,b)=>(b.is_favorite-a.is_favorite)||(b.use_count-a.use_count)||a.name.localeCompare(b.name));
}
function subscribe(){if(S.rt)return;S.rt=true;
  sb.channel("rt").on("postgres_changes",{event:"*",schema:"public",table:"transactions"},()=>{if(S.tab==="list")viewList();}).subscribe();}

async function onb(fn,args,msgId){
  const prev=S.hs.map(h=>h.id);
  const {error}=await sb.rpc(fn,args);
  error?$(msgId).textContent=error.message:start(prev);}
$("mk").onclick=()=>onb("create_household",{p_name:$("hn").value,p_display_name:$("mn").value},"omsg");
$("jn").onclick=()=>onb("join_household",{p_code:$("cd").value.trim(),p_display_name:$("mn2").value},"omsg");
$("hb").onclick=()=>go("fam");

document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{if(b.dataset.t==="list")S.lim=50;go(b.dataset.t);});
const NAVOF=t=>({qs:"add",ed:"list",par:S.parFrom==="loans"?"dash":"list",loans:"dash",ant:"dash",metas:"dash",cat:S.catFrom==="metas"?"dash":"acc",cated:S.catFrom==="metas"?"dash":"acc",tr:S.trFrom==="add"?"add":"acc",fat:"acc",clo:"acc",acm:"acc",ver:"acc",inv:"acc",intl:"acc",ir:"acc",rent:"acc"})[t]||t;
function go(t){S.tab=t;
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===NAVOF(t)));
  ({dash:viewDash,add:viewAdd,list:viewList,acc:viewAcc,fam:viewFam,qs:viewQs,tr:viewTr,ed:viewEdit,par:viewPar,loans:viewLoans,ant:viewAnt,cat:viewCat,cated:viewCatEdit,metas:viewMetas,fat:viewFat,clo:viewClo,acm:viewAcm,ver:viewVer,inv:viewInv,intl:viewIntl,ir:viewIr,rent:viewRent})[t]();}

function viewFam(){
  $("main").innerHTML=`<div class="card"><b>Minhas famílias</b>${S.hs.map(h=>`<div class="row"><div>${esc(h.name)}${h.id===S.hid?' <span class="mu">(atual)</span>':""}</div>${h.id===S.hid?"":`<button data-sw="${h.id}">Trocar</button>`}</div>`).join("")}</div>
  <div class="card"><b>Criar nova família</b><div class="mu">Ex.: uma família de testes/demonstração</div>
   <label>Nome da família<input id="fn" value="Família de teste"></label>
   <label>Seu nome nela<input id="fm"></label>
   <button class="pri" id="fk">Criar e entrar</button></div>
  <div class="card"><b>Entrar com código de convite</b>
   <label>Código<input id="fc"></label>
   <label>Seu nome nela<input id="fm2"></label>
   <button class="pri" id="fj">Entrar</button></div>
  <p id="fmsg" class="neg"></p>`;
  document.querySelectorAll("[data-sw]").forEach(b=>b.onclick=()=>pick(b.dataset.sw));
  $("fk").onclick=()=>onb("create_household",{p_name:$("fn").value,p_display_name:$("fm").value},"fmsg");
  $("fj").onclick=()=>onb("join_household",{p_code:$("fc").value.trim(),p_display_name:$("fm2").value},"fmsg");
}

