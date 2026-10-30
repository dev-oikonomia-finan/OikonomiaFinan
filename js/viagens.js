/* ================= VIAGENS E PASSEIOS ================= */
const TRIP_ICON={viagem:"✈️",passeio:"🚶"};
const tripsOf=()=>S.trips||[];
const tripById=id=>tripsOf().find(t=>t.id===id);
const tripName=id=>{const t=tripById(id);return t?TRIP_ICON[t.kind]+" "+t.name:"";};
/* viagem que cobre a data (a mais recente, se houver mais de uma) */
const tripDefault=dt=>{const L=tripsOf().filter(t=>dt>=t.start_date&&dt<=t.end_date).sort((a,b)=>b.start_date.localeCompare(a.start_date));return L.length?L[0].id:"";};
const tripOpts=sel=>'<option value="">(nenhuma)</option>'+tripsOf().map(t=>`<option value="${t.id}" ${t.id===sel?"selected":""}>${TRIP_ICON[t.kind]} ${esc(t.name)} · ${fdt(t.start_date).slice(0,5)}</option>`).join("");
const tripPeriod=t=>t.start_date===t.end_date?fdt(t.start_date):fdt(t.start_date)+" a "+fdt(t.end_date);
const tmoney=v=>fmt(Number(v)||0,"BRL");
const tbrl=x=>Number(x.amount)*Number(x.fx_rate_to_base||1);
async function loadTrips(){
  const {data,error}=await sb.from("trips").select("*").eq("household_id",S.hid).order("start_date",{ascending:false});
  S.trips=error?[]:(data||[]);
}
/* troca a viagem de um lançamento (ou de todas as parcelas da compra); só trip_id muda, então passa até em mês fechado */
const tripSet=(t,id)=>{const q=sb.from("transactions").update({trip_id:id||null});return t.installment_group_id?q.eq("installment_group_id",t.installment_group_id):q.eq("id",t.id);};
/* liga o seletor de viagem ao campo de data: sugere a viagem da data enquanto a pessoa não mexeu no seletor */
function tripWire(dtEl,tpEl,noEl,fixed){
  const hint=()=>{const t=tripById(tpEl.value);noEl.textContent=t&&(dtEl.value<t.start_date||dtEl.value>t.end_date)?`⚠️ A data está fora do período (${fdt(t.start_date)} a ${fdt(t.end_date)}). Pode salvar mesmo assim.`:"";};
  if(fixed)tpEl.dataset.m="1";
  tpEl.onchange=()=>{tpEl.dataset.m="1";hint();};
  dtEl.addEventListener("input",()=>{if(!tpEl.dataset.m)tpEl.value=tripDefault(dtEl.value);hint();});
  hint();
}

async function viewTrips(){
  const [,s]=await Promise.all([loadTrips(),sb.from("trip_summary").select("*").eq("household_id",S.hid)]);
  const SM={};(s.data||[]).forEach(x=>{SM[x.trip_id]=x;});
  const hj=today(),L=tripsOf();
  const now=L.filter(t=>t.start_date<=hj&&t.end_date>=hj),nx=L.filter(t=>t.start_date>hj).sort((a,b)=>a.start_date.localeCompare(b.start_date)),pa=L.filter(t=>t.end_date<hj);
  const card=t=>{const m=SM[t.id]||{n:0,net:0},net=Number(m.net)||0,b=Number(t.budget)||0,p=b>0?Math.min(100,Math.round(net/b*100)):0;
    return `<div class="row" data-tp="${t.id}" style="cursor:pointer;display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${TRIP_ICON[t.kind]} ${esc(t.name)}</b><b>${tmoney(net)}</b></div>
    <div class="mu">${t.scope==="internacional"?"🌎 internacional":"🇧🇷 nacional"} · ${tripPeriod(t)} · ${m.n} lanç.${b>0?" · orçamento "+tmoney(b):""}</div>
    ${b>0?`<div style="height:6px;background:var(--bd);border-radius:3px;margin-top:6px;overflow:hidden"><div style="width:${p}%;height:100%;background:${net>b?"var(--red)":"var(--ac)"}"></div></div>`:""}</div>`;};
  const sec=(title,arr)=>arr.length?`<div class="card"><b>${title}</b>${arr.map(card).join("")}</div>`:"";
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Viagens e passeios</b> <button class="x" id="nw">＋ Nova</button>
   <p class="mu" style="margin:6px 0">Marque lançamentos com uma viagem para acompanhar o custo total em R$. A marca não muda saldo, metas nem resultado.</p></div>
   ${L.length?sec("Em andamento",now)+sec("Próximas",nx)+sec("Passadas",pa):'<div class="card mu">Nenhuma viagem ainda. Toque em ＋ Nova.</div>'}`;
  $("bk").onclick=()=>go("acc");$("nw").onclick=()=>{S.tripEd=null;go("tripe");};
  document.querySelectorAll("[data-tp]").forEach(b=>b.onclick=()=>{S.tripId=b.dataset.tp;go("trip");});
}

async function viewTrip(){
  if(!tripById(S.tripId))await loadTrips();
  const t=tripById(S.tripId);
  if(!t){S.tripId=null;return go("trips");}
  const {data,error}=await sb.from("transactions")
    .select("id,date,amount,currency,fx_rate_to_base,description,original_amount,original_currency,installment_group_id,installment_number,installment_total,categories(name),accounts(name)")
    .eq("trip_id",t.id).order("date",{ascending:false}).limit(2000);
  if(error){$("main").innerHTML=`<div class="card neg">${esc(error.message)}</div>`;return;}
  const X=data||[],hj=today();
  let sp=0,rf=0,fut=0;const C={},M={},O={};
  X.forEach(x=>{const v=tbrl(x);
    if(v<0){sp-=v;if(x.date>hj)fut-=v;const k=(x.categories&&x.categories.name)||"Sem categoria";C[k]=(C[k]||0)-v;
      const cu=x.currency.trim(),o=M[cu]||(M[cu]={q:0,b:0});o.q-=Number(x.amount);o.b-=v;
      if(x.original_amount&&x.original_currency){const oc=x.original_currency.trim();O[oc]=(O[oc]||0)+Number(x.original_amount);}}
    else rf+=v;});
  const net=sp-rf,b=Number(t.budget)||0;
  const d0=new Date(t.start_date+"T12:00:00"),d1=new Date(t.end_date+"T12:00:00"),days=Math.round((d1-d0)/864e5)+1;
  const el=hj<t.start_date?0:hj>t.end_date?days:Math.round((new Date(hj+"T12:00:00")-d0)/864e5)+1;
  const cats=Object.entries(C).sort((a,b)=>b[1]-a[1]);
  const fgn=Object.entries(M).filter(([c])=>c!=="BRL");
  const bar=b>0?`<div style="height:8px;background:var(--bd);border-radius:4px;margin:6px 0;overflow:hidden"><div style="width:${Math.min(100,Math.round(net/b*100))}%;height:100%;background:${net>b?"var(--red)":"var(--ac)"}"></div></div>`:"";
  const rowH=x=>`<div class="row"><div><div>${esc(x.description||(x.categories&&x.categories.name)||"Sem descrição")}${x.installment_total?` <span class="mu">${x.installment_number}/${x.installment_total}</span>`:""}</div>
    <div class="mu">${fdt(x.date)} · ${esc((x.categories&&x.categories.name)||"—")} · ${esc(x.accounts&&x.accounts.name)}${x.currency.trim()!=="BRL"?" · ≈ "+tmoney(tbrl(x)):""}${x.original_amount?" · original "+fmt(x.original_amount,x.original_currency):""}${x.date>hj?" · previsto":""}</div></div>
    <div style="text-align:right;white-space:nowrap"><span class="${x.amount<0?"neg":"pos"}">${fmt(x.amount,x.currency)}</span><button class="x" data-ed="${x.id}">✏️</button><button class="x" data-un="${x.id}" title="Tirar da viagem">↩︎</button></div></div>`;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>${TRIP_ICON[t.kind]} ${esc(t.name)}</b> <button class="x" id="te">✏️ Editar</button>
    <div class="mu">${t.scope==="internacional"?"🌎 internacional":"🇧🇷 nacional"} · ${tripPeriod(t)} · ${days} ${days===1?"dia":"dias"}${t.notes?" · "+esc(t.notes):""}</div>
    <div class="row" style="margin-top:8px"><b>Custo da viagem</b><b>${tmoney(net)}</b></div>
    <div class="row"><span class="mu">Despesas</span><span class="neg">${tmoney(sp)}</span></div>
    ${rf>0?`<div class="row"><span class="mu">Reembolsos</span><span class="pos">${tmoney(rf)}</span></div>`:""}
    ${fut>0?`<div class="mu">Inclui ${tmoney(fut)} previstos (data futura, como parcelas a vencer).</div>`:""}
    ${b>0?`<div class="row"><span class="mu">Orçamento</span><span>${tmoney(b)}</span></div>${bar}<div class="row"><span class="mu">${net>b?"Acima do orçamento":"Ainda disponível"}</span><b class="${net>b?"neg":"pos"}">${tmoney(Math.abs(b-net))}</b></div>`:""}
    ${el>0&&X.length?`<div class="row"><span class="mu">Média por dia (${el} ${el===1?"dia":"dias"})</span><span>${tmoney(net/el)}</span></div>`:""}</div>
  ${fgn.length||Object.keys(O).length?`<div class="card"><b>Moedas</b>${fgn.map(([c,o])=>`<div class="row"><span>${fmt(o.q,c)} pagos em ${esc(c)}</span><span class="mu">≈ ${tmoney(o.b)} · custo médio ${fx4(o.q?o.b/o.q:0)}</span></div>`).join("")}${Object.entries(O).map(([c,v])=>`<div class="row"><span class="mu">Valor original informado</span><span>${fmt(v,c)}</span></div>`).join("")}</div>`:""}
  ${cats.length?`<div class="card"><b>Despesas por categoria</b>${cats.map(([k,v])=>`<div class="row"><span>${esc(k)} <span class="mu">${sp?Math.round(v/sp*100):0}%</span></span><span class="neg">${tmoney(v)}</span></div>`).join("")}</div>`:""}
  <div class="card"><b>Lançamentos da viagem</b> <span class="mu">${X.length}</span>${X.length?X.map(rowH).join(""):'<p class="mu">Nenhum lançamento vinculado ainda. Ao lançar, escolha a viagem no campo "Viagem ou passeio", ou vincule os já feitos abaixo.</p>'}</div>
  <div class="card"><button class="sec" id="vl" style="margin-top:0">＋ Vincular lançamentos já feitos</button><div id="vlw"></div></div>`;
  $("bk").onclick=()=>go("trips");
  $("te").onclick=()=>{S.tripEd=t.id;go("tripe");};
  document.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>{S.ed=b.dataset.ed;S.edBack="trip";go("ed");});
  document.querySelectorAll("[data-un]").forEach(b=>b.onclick=async()=>{
    const x=X.find(r=>r.id===b.dataset.un),{error:e}=await tripSet(x,null);
    if(e)return alert("Erro: "+e.message);viewTrip();});
  $("vl").onclick=()=>{$("vl").hidden=true;
    $("vlw").innerHTML=`<label>De<input id="va" type="date" value="${t.start_date}"></label><label>Até<input id="vb" type="date" value="${t.end_date}"></label><button class="pri" id="vs">Buscar lançamentos sem viagem</button><div id="vr"></div>`;
    $("vs").onclick=()=>tripSearch(t);};
}

async function tripSearch(t){
  const a=$("va").value,b=$("vb").value;
  if(!a||!b||b<a){$("vr").innerHTML='<p class="neg">Informe um período válido.</p>';return;}
  const {data,error}=await sb.from("transactions")
    .select("id,date,amount,currency,fx_rate_to_base,description,installment_group_id,installment_number,installment_total,categories(name),accounts!inner(name,household_id)")
    .eq("accounts.household_id",S.hid).is("trip_id",null).is("transfer_group_id",null).gte("date",a).lte("date",b).order("date").limit(500);
  if(error){$("vr").innerHTML=`<p class="neg">${esc(error.message)}</p>`;return;}
  const R=data||[];
  if(!R.length){$("vr").innerHTML='<p class="mu">Nenhum lançamento sem viagem neste período.</p>';return;}
  $("vr").innerHTML=`<div class="row"><label class="ck" style="margin:0"><input type="checkbox" id="vall"> Marcar todos (${R.length})</label></div>`
    +R.map(x=>`<div class="row"><label class="ck" style="margin:0;flex:1"><input type="checkbox" data-v="${x.id}"> <span>${esc(x.description||(x.categories&&x.categories.name)||"Sem descrição")}${x.installment_total?` <span class="mu">${x.installment_number}/${x.installment_total}</span>`:""}<div class="mu">${fdt(x.date)} · ${esc(x.accounts&&x.accounts.name)}</div></span></label><span class="${x.amount<0?"neg":"pos"}">${fmt(x.amount,x.currency)}</span></div>`).join("")
    +'<button class="pri" id="vgo">Vincular selecionados</button><p class="mu">Em compras parceladas, todas as parcelas entram na viagem.</p><p id="vm" class="neg"></p>';
  $("vall").onchange=()=>document.querySelectorAll("[data-v]").forEach(c=>{c.checked=$("vall").checked;});
  $("vgo").onclick=async()=>{
    const sel=[...document.querySelectorAll("[data-v]:checked")].map(c=>R.find(x=>x.id===c.dataset.v));
    if(!sel.length){$("vm").textContent="Marque ao menos um lançamento.";return;}
    $("vgo").disabled=true;
    const ids=sel.filter(x=>!x.installment_group_id).map(x=>x.id),gs=[...new Set(sel.filter(x=>x.installment_group_id).map(x=>x.installment_group_id))];
    let err=null;
    for(let i=0;i<ids.length&&!err;i+=100){const r=await sb.from("transactions").update({trip_id:t.id}).in("id",ids.slice(i,i+100));err=r.error;}
    for(let i=0;i<gs.length&&!err;i+=50){const r=await sb.from("transactions").update({trip_id:t.id}).in("installment_group_id",gs.slice(i,i+50));err=r.error;}
    if(err){$("vgo").disabled=false;$("vm").textContent="Erro: "+err.message;return;}
    viewTrip();};
}

function viewTripEdit(){
  const t=S.tripEd?tripById(S.tripEd):null;
  const D=t||{name:"",kind:"viagem",scope:"nacional",start_date:today(),end_date:today(),budget:null,notes:""};
  const sel=(v,x)=>v===x?"selected":"";
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>${t?"Editar":"Nova"} viagem ou passeio</b>
   <label>Nome<input id="tn" value="${esc(D.name)}" placeholder="Ex.: Lisboa 2027"></label>
   <label>Tipo<select id="tk"><option value="viagem" ${sel(D.kind,"viagem")}>✈️ Viagem</option><option value="passeio" ${sel(D.kind,"passeio")}>🚶 Passeio</option></select></label>
   <label>Onde<select id="ts"><option value="nacional" ${sel(D.scope,"nacional")}>Nacional</option><option value="internacional" ${sel(D.scope,"internacional")}>Internacional</option></select></label>
   <label>Início<input id="t1" type="date" value="${esc(D.start_date)}"></label>
   <label>Fim<input id="t2" type="date" value="${esc(D.end_date)}"></label>
   <label>Orçamento em R$ (opcional)<input id="tb" inputmode="decimal" placeholder="0,00" value="${fa(D.budget)}"></label>
   <label>Observações (opcional)<input id="tt" value="${esc(D.notes||"")}"></label>
   <button class="pri" id="tsv">Salvar</button><p id="tmsg" class="neg"></p>
   ${t?'<button class="sec" id="tdl">🗑 Excluir viagem</button>':""}</div>`;
  $("bk").onclick=()=>go(t?"trip":"trips");
  $("tsv").onclick=async()=>{
    const name=$("tn").value.trim(),a=$("t1").value,b=$("t2").value,bs=$("tb").value.trim(),bv=bs?num(bs):null;
    if(!name)return $("tmsg").textContent="Informe o nome.";
    if(!a||!b)return $("tmsg").textContent="Informe o início e o fim.";
    if(b<a)return $("tmsg").textContent="O fim não pode ser antes do início.";
    if(bs&&!(bv>=0))return $("tmsg").textContent="Orçamento inválido.";
    const row={name,kind:$("tk").value,scope:$("ts").value,start_date:a,end_date:b,budget:bv,notes:$("tt").value.trim()||null};
    $("tsv").disabled=true;
    const r=t?await sb.from("trips").update(row).eq("id",t.id).select("id").single()
      :await sb.from("trips").insert({...row,household_id:S.hid}).select("id").single();
    if(r.error){$("tsv").disabled=false;return $("tmsg").textContent="Erro: "+r.error.message;}
    await loadTrips();S.tripId=r.data.id;go("trip");};
  if($("tdl"))$("tdl").onclick=async()=>{
    const c=await sb.from("transactions").select("id",{count:"exact",head:true}).eq("trip_id",t.id),n=c.count||0;
    if(!confirm(`Excluir "${t.name}"? ${n?`Os ${n} lançamentos vinculados NÃO serão apagados, só deixam de ter viagem.`:"Nenhum lançamento está vinculado."} Isso não pode ser desfeito.`))return;
    const {data:d,error}=await sb.from("trips").delete().eq("id",t.id).select("id");
    if(error)return $("tmsg").textContent="Erro: "+error.message;
    if(!d||!d.length)return $("tmsg").textContent="Não consegui excluir esta viagem (talvez ela já tenha sido excluída).";
    await loadTrips();S.tripId=null;go("trips");};
}
