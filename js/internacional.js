async function loadIntl(){
  const {data}=await sb.from("intl_summary").select("*").eq("household_id",S.hid);
  const m={};(data||[]).forEach(x=>{m[x.account_id]={qty:Number(x.qty)||0,cost:Number(x.cost_base)||0,avg:x.avg_cost==null?null:Number(x.avg_cost),name:x.name,cur:x.currency.trim()};});
  S.intl=m;return m;}
const fx4=v=>"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:4});
const gk=a=>a&&a.group_name?String(a.group_name).trim().toLowerCase():"";
const brlSib=a=>{const g=gk(a);return g?S.accounts.find(x=>x.id!==a.id&&gk(x)===g&&x.currency.trim()==="BRL")||null:null;};
const grpNames=()=>[...new Set(S.accounts.map(a=>a.group_name&&a.group_name.trim()).filter(Boolean))];
const r6=v=>Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:6});
const rIn=v=>String(Number(v)).replace(".",",");
const dtq=ts=>{try{return new Date(ts).toLocaleDateString("pt-BR");}catch(e){return "";}};
const kq=(acc,f,t)=>(acc?"e|"+acc:"q")+"|"+f+"|"+t;
async function viewIntl(){
  $("main").innerHTML='<div class="card mu">Carregando…</div>';
  const hid=S.hid;
  const [m,sl,cv,ab,fq,hs,mb]=await Promise.all([loadIntl(),sb.from("fx_sales").select("*").eq("household_id",hid).order("date",{ascending:false}).limit(20),
    sb.from("fx_conversions").select("*").eq("household_id",hid).order("date",{ascending:false}).limit(20),
    sb.from("account_balances").select("account_id,balance").eq("household_id",hid),
    sb.from("fx_quotes").select("*").eq("household_id",hid),
    sb.from("transactions").select("account_id,amount,original_amount,original_currency").eq("household_id",hid).not("original_amount","is",null).lt("amount",0).order("date",{ascending:false}).order("created_at",{ascending:false}).limit(1000),
    sb.from("household_members").select("user_id,display_name").eq("household_id",hid)]);
  const BB={};(ab.data||[]).forEach(r=>{BB[r.account_id]=Number(r.balance)||0;});
  const cvs=(cv.data||[]).filter(x=>S.accounts.some(a=>a.id===x.account_id)),cvB=cvs.reduce((t,x)=>t+Number(x.brl_paid),0),cvQ=cvs.reduce((t,x)=>t+Number(x.foreign_qty),0);
  if(S.tab!=="intl"||S.hid!==hid)return;
  if(sl.error){$("main").innerHTML=`<div class="card neg">${esc(sl.error.message)}</div>`;return;}
  /* cotações da família (fx_quotes): "q|USD|BRL" = cotação de hoje; "e|conta|EUR|USD" = taxa estimada manual da conta */
  const Q={};(fq.data||[]).forEach(r=>{Q[kq(r.account_id,String(r.from_cur).trim(),String(r.to_cur).trim())]=r;});
  const NAMES={};(mb.data||[]).forEach(r=>{if(r.display_name)NAMES[r.user_id]=r.display_name;});
  const nm=u=>NAMES[u]||(u===S.uid?"você":"outro membro");
  const qTxt=r=>r?`atualizada em ${dtq(r.updated_at)} por ${esc(nm(r.updated_by))}`:"";
  /* histórico: compras com valor original, da mais recente para a mais antiga, por conta e moeda original */
  const H={},LASTC={};
  (hs.data||[]).forEach(r=>{const A=m[r.account_id];if(!A)return;const c=String(r.original_currency||"").trim().toUpperCase();if(!c||c===A.cur)return;
    if(!H[r.account_id])H[r.account_id]={};if(!H[r.account_id][c])H[r.account_id][c]=[];H[r.account_id][c].push(r);if(!LASTC[r.account_id])LASTC[r.account_id]=c;});
  const L=Object.entries(m).filter(([id])=>S.accounts.some(a=>a.id===id)).map(([id,x])=>({id,...x}));
  const brl=S.accounts.find(a=>a.currency.trim()==="BRL"&&!["benefit","credit_card","investment"].includes(a.type));
  const totC=L.reduce((t,x)=>t+x.cost,0),sales=(sl.data||[]).filter(x=>S.accounts.some(a=>a.id===x.account_id)),totR=sales.reduce((t,x)=>t+Number(x.result),0);
  const curList=x=>{const s=new Set([x.cur]);Object.keys(H[x.id]||{}).forEach(c=>s.add(c));Object.keys(Q).forEach(k=>{const p=k.split("|");if(p[0]==="e"&&p[1]===x.id)s.add(p[2]);});return [...s];};
  const defCur=x=>LASTC[x.id]||x.cur;
  const box=x=>{const A=S.accounts.find(a=>a.id===x.id),sb2=A&&brlSib(A),qr=Q[kq(null,x.cur,"BRL")],dc=defCur(x);return `<div class="card"><b>${esc(x.name)}</b> <span class="mu">${esc(x.cur)}${A&&A.group_name?" · "+esc(A.group_name.trim()):""}</span>
    ${sb2?`<div class="row"><span class="mu">Reais para converter (${esc(sb2.name)})</span><b>${fmt(BB[sb2.id]||0,"BRL")}</b></div>`:""}
    <div class="row"><span class="mu">Saldo</span><b>${fmt(x.qty,x.cur)}</b></div>
    <div class="row"><span class="mu">Custo em reais</span><span>${fmt(x.cost,"BRL")}</span></div>
    <div class="row"><span class="mu">Custo médio</span><span>${x.avg?fx4(x.avg)+" por 1 "+esc(x.cur):"—"}</span></div>
    <label>Cotação de hoje (R$ por 1 ${esc(x.cur)}), compartilhada com a família<input class="iq" data-a="${x.id}" inputmode="decimal" placeholder="Ex.: 5,20" value="${esc(qr?rIn(qr.rate):(lsGet("fxq_"+x.id)||""))}"></label>
    <div class="seg" style="margin-top:8px"><button data-qs="${x.id}">Salvar cotação</button><button data-qc="${x.id}">Apagar</button></div>
    <div class="mu iqi" data-a="${x.id}"></div>
    <div class="ir" data-a="${x.id}"></div>
    <label>Posso comprar? Moeda da compra<select class="pc" data-a="${x.id}">${curList(x).map(c=>`<option value="${esc(c)}" ${c===dc?"selected":""}>${esc(c)}${c===x.cur?" (moeda da conta)":""}</option>`).join("")}<option value="__o">Outra moeda…</option></select></label>
    <input class="po" data-a="${x.id}" maxlength="3" placeholder="Ex.: GBP" style="text-transform:uppercase" hidden>
    <label>Valor na moeda da compra<input class="ip" data-a="${x.id}" inputmode="decimal" placeholder="0,00"></label>
    <div class="ipr" data-a="${x.id}"></div>
    <div class="ptw" data-a="${x.id}" hidden>
      <label>Taxa manual: 1 <span class="ptc" data-a="${x.id}"></span> = quantos ${esc(x.cur)}? (opcional)<input class="pt" data-a="${x.id}" inputmode="decimal" placeholder="Ex.: 1,12"></label>
      <div class="seg" style="margin-top:8px"><button data-ps="${x.id}">Salvar taxa</button><button class="pbr" data-a="${x.id}" data-pr="${x.id}">Voltar à média</button></div>
      <div class="mu ptm" data-a="${x.id}"></div></div>
    <div class="seg" style="margin-top:12px"><button data-cv="${x.id}">Converter (comprar)</button><button data-vd="${x.id}">Vender</button></div>
    <button class="sec" data-lc="${x.id}">📋 Ver lançamentos</button></div>`;};
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>🌎 Internacional</b>
    ${L.length?`<div class="row"><span class="mu">Custo total em reais</span><b>${fmt(totC,"BRL")}</b></div><div class="mu">O custo médio muda só quando entra moeda nova (conversão). Gastar não altera o custo médio.</div>`
      :'<p class="mu">Nenhuma conta em moeda estrangeira. Em <b>Contas</b>, crie uma conta com a moeda (ex.: USD) e use <b>Transferir</b> para converter reais nela.</p>'}</div>
    ${fq.error?`<div class="card neg">Cotações compartilhadas indisponíveis: ${esc(fq.error.message)}. Confira se o cotacoes_internacionais.sql foi executado.</div>`:""}
    ${L.map(box).join("")}
    ${cvs.length?`<div class="card"><b>Conversões (reais → moeda)</b>${cvs.map(x=>{const A=S.accounts.find(a=>a.id===x.account_id);return `<div class="row"><div>${fdt(x.date)} · ${fmt(x.brl_paid,"BRL")} → ${fmt(x.foreign_qty,x.currency)}<div class="mu">${A?esc(A.name)+" · ":""}${esc(x.description||"")}</div></div><b>${fx4(x.rate)}</b></div>`;}).join("")}
      ${cvQ>0?`<div class="row"><b>Cotação média das listadas</b><b>${fx4(cvB/cvQ)}</b></div>`:""}<div class="mu">Últimas 20 conversões. O custo médio da conta considera todas elas, e não só estas.</div></div>`:(cv.error?`<div class="card mu">Histórico de conversões indisponível: ${esc(cv.error.message)}</div>`:"")}
    ${sales.length?`<div class="card"><b>Vendas de moeda</b>${sales.map(x=>`<div class="row"><div>${fdt(x.date)} · ${fmt(x.foreign_qty,x.currency)}<div class="mu">recebido ${fmt(x.brl_received,"BRL")} · custo ${fmt(x.brl_cost,"BRL")}</div></div><b class="${Number(x.result)<0?"neg":"pos"}">${fmt(x.result,"BRL")}</b></div>`).join("")}
      <div class="row"><b>Resultado das vendas listadas</b><b class="${totR<0?"neg":"pos"}">${fmt(totR,"BRL")}</b></div></div>`:""}
    <div class="card mu">A cotação de hoje é da família: quem salvar atualiza para todos. Serve só para estimar o ganho ou a perda não realizada e não altera nenhum lançamento. Em Posso comprar?, a taxa usada é a manual (se houver) ou a média das últimas 20 compras com valor original naquela moeda (soma dos débitos ÷ soma dos valores originais).</div>`;
  $("bk").onclick=()=>go("acc");
  const el=(c,id)=>document.querySelector(`.${c}[data-a="${id}"]`),val=(c,id)=>(el(c,id).value||"").trim();
  const curOf=id=>{const s=el("pc",id).value;return (s==="__o"?val("po",id):s).toUpperCase();};
  const rateFor=(id,c)=>{const x=m[id];if(c===x.cur)return {r:1,src:""};
    const e=Q[kq(id,c,x.cur)];if(e)return {r:Number(e.rate),src:`manual, ${qTxt(e)}`};
    const h=((H[id]||{})[c]||[]).slice(0,20);
    if(h.length){const sa=h.reduce((t,r)=>t+Math.abs(Number(r.amount)),0),so=h.reduce((t,r)=>t+Number(r.original_amount),0);
      if(so>0)return {r:sa/so,src:`média das últimas ${h.length} compra${h.length>1?"s":""}`};}
    return null;};
  const qsync=id=>{const x=m[id],r=Q[kq(null,x.cur,"BRL")],old=lsGet("fxq_"+id);
    el("iqi",id).textContent=r?"Cotação "+qTxt(r)+".":(old?"Valor antigo guardado só neste aparelho. Toque em Salvar cotação para compartilhar com a família.":"Nenhuma cotação salva para a família.");};
  const sync=id=>{const x=m[id],c=curOf(id),w=el("ptw",id);
    el("po",id).hidden=el("pc",id).value!=="__o";
    if(!/^[A-Z]{3}$/.test(c)||c===x.cur){w.hidden=true;return;}
    w.hidden=false;el("ptc",id).textContent=c;
    const e=Q[kq(id,c,x.cur)],n=((H[id]||{})[c]||[]).length;
    el("pt",id).value=e?rIn(e.rate):"";
    el("ptm",id).textContent=e?"Taxa manual "+qTxt(e)+".":(n?`Sem ajuste: usando a média das últimas ${Math.min(n,20)} compras.`:"Sem compras com valor original nesta moeda: informe uma taxa.");
    el("pbr",id).disabled=!e;};
  const upd=id=>{const x=m[id],q=num(val("iq",id)),ir=el("ir",id);
    ir.innerHTML=q>0?`<div class="row"><span class="mu">Valor hoje</span><span>${fmt(x.qty*q,"BRL")}</span></div><div class="row"><span class="mu">Ganho/perda não realizado</span><b class="${x.qty*q-x.cost<0?"neg":"pos"}">${fmt(x.qty*q-x.cost,"BRL")}</b></div>`:"";
    const c=curOf(id),v=num(val("ip",id)),pr=el("ipr",id);
    if(!/^[A-Z]{3}$/.test(c)){pr.innerHTML=c?'<div class="mu">Informe a moeda com 3 letras (ex.: GBP).</div>':"";return;}
    const rt=rateFor(id,c);let h="";
    if(!rt)h=`<div class="mu">Sem compras com valor original em ${esc(c)} nesta conta e sem taxa manual. Informe uma taxa abaixo.</div>`;
    else{
      if(c!==x.cur)h+=`<div class="row"><span class="mu">Taxa usada</span><span style="text-align:right">1 ${esc(c)} = ${r6(rt.r)} ${esc(x.cur)}<div class="mu">${rt.src}</div></span></div>`;
      if(v>0){const d=v*rt.r;
        h+=`<div class="row"><span class="mu">Débito estimado</span><b>${fmt(d,x.cur)}</b></div>
          <div class="row"><span class="mu">Custo em reais (custo médio)</span><span>${x.avg?fmt(d*x.avg,"BRL"):"—"}</span></div>
          <div class="mu">${d>x.qty+1e-9?`⚠️ Passa do saldo (${fmt(x.qty,x.cur)}): faltam ${fmt(d-x.qty,x.cur)}.`:`Cabe no saldo: sobram ${fmt(x.qty-d,x.cur)}.`}</div>`;}}
    pr.innerHTML=h;};
  L.forEach(x=>{qsync(x.id);sync(x.id);upd(x.id);});
  document.querySelectorAll(".iq").forEach(i=>i.oninput=()=>upd(i.dataset.a));
  document.querySelectorAll(".ip").forEach(i=>i.oninput=()=>upd(i.dataset.a));
  document.querySelectorAll(".pc").forEach(i=>i.onchange=()=>{sync(i.dataset.a);upd(i.dataset.a);});
  document.querySelectorAll(".po").forEach(i=>i.oninput=()=>{sync(i.dataset.a);upd(i.dataset.a);});
  const sameCur=cur=>L.filter(y=>y.cur===cur);
  document.querySelectorAll("[data-qs]").forEach(b=>b.onclick=async()=>{const id=b.dataset.qs,x=m[id],r=num(val("iq",id)),info=el("iqi",id);
    if(!(r>0)){info.textContent="Informe uma cotação maior que zero.";return;}
    b.disabled=true;
    const {error}=await sb.rpc("set_fx_quote",{p_household:hid,p_account:null,p_from:x.cur,p_to:"BRL",p_rate:r});
    b.disabled=false;
    if(error){info.textContent="Erro: "+error.message;return;}
    Q[kq(null,x.cur,"BRL")]={rate:r,updated_by:S.uid,updated_at:new Date().toISOString()};
    sameCur(x.cur).forEach(y=>{lsSet("fxq_"+y.id,"");el("iq",y.id).value=rIn(r);qsync(y.id);upd(y.id);});});
  document.querySelectorAll("[data-qc]").forEach(b=>b.onclick=async()=>{const id=b.dataset.qc,x=m[id],info=el("iqi",id);
    if(!Q[kq(null,x.cur,"BRL")]){el("iq",id).value="";lsSet("fxq_"+id,"");qsync(id);upd(id);return;}
    if(!confirm(`Apagar a cotação de hoje de ${x.cur} para a família toda?`))return;
    b.disabled=true;
    const {error}=await sb.rpc("clear_fx_quote",{p_household:hid,p_account:null,p_from:x.cur,p_to:"BRL"});
    b.disabled=false;
    if(error){info.textContent="Erro: "+error.message;return;}
    delete Q[kq(null,x.cur,"BRL")];
    sameCur(x.cur).forEach(y=>{lsSet("fxq_"+y.id,"");el("iq",y.id).value="";qsync(y.id);upd(y.id);});});
  document.querySelectorAll("[data-ps]").forEach(b=>b.onclick=async()=>{const id=b.dataset.ps,x=m[id],c=curOf(id),r=num(val("pt",id)),msg=el("ptm",id);
    if(!(r>0)){msg.textContent="Informe uma taxa maior que zero.";return;}
    b.disabled=true;
    const {error}=await sb.rpc("set_fx_quote",{p_household:hid,p_account:id,p_from:c,p_to:x.cur,p_rate:r});
    b.disabled=false;
    if(error){msg.textContent="Erro: "+error.message;return;}
    Q[kq(id,c,x.cur)]={rate:r,updated_by:S.uid,updated_at:new Date().toISOString()};
    sync(id);upd(id);});
  document.querySelectorAll("[data-pr]").forEach(b=>b.onclick=async()=>{const id=b.dataset.pr,x=m[id],c=curOf(id),msg=el("ptm",id);
    b.disabled=true;
    const {error}=await sb.rpc("clear_fx_quote",{p_household:hid,p_account:id,p_from:c,p_to:x.cur});
    if(error){b.disabled=false;msg.textContent="Erro: "+error.message;return;}
    delete Q[kq(id,c,x.cur)];
    sync(id);upd(id);});
  document.querySelectorAll("[data-cv]").forEach(b=>b.onclick=()=>{const A=S.accounts.find(a=>a.id===b.dataset.cv),s2=A&&brlSib(A);S.tr={to:b.dataset.cv,from:s2?s2.id:undefined};S.trFrom="intl";go("tr");});
  document.querySelectorAll("[data-vd]").forEach(b=>b.onclick=()=>{const A=S.accounts.find(a=>a.id===b.dataset.vd),s2=A&&brlSib(A);S.tr={from:b.dataset.vd,to:s2?s2.id:(brl&&brl.id)};S.trFrom="intl";go("tr");});
  document.querySelectorAll("[data-lc]").forEach(b=>b.onclick=()=>{S.fAcc=b.dataset.lc;S.lper="all";S.lim=50;go("list");});
}

