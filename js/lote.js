/* ================= LANÇAR EM LOTE (Etapa 1: conta corrente e cartão) ================= */
/* Várias linhas por seção; cada seção tem UMA conta. Linha vazia é ignorada. Confirmar valida tudo e grava
   num ÚNICO insert em transactions (parcelas geradas aqui, como a compra em andamento): grava tudo ou nada. */
const LOTE_CSS=`<style>
.lbox{container-type:inline-size}
.lr{display:grid;grid-template-columns:1fr 1fr;gap:4px 6px;padding:8px 0;border-bottom:1px solid var(--bd)}
.lr input,.lr select{margin:0;width:100%;box-sizing:border-box;min-width:0}
.lr .ld{order:1}.lr .lv{order:2}.lr .lds{order:3}.lr .lc{order:4}.lr .lp{order:5}.lr .lh{order:6}.lr .lm{order:9;grid-column:1/-1}
.lr.err{background:rgba(220,38,38,.08)}
.lhd{display:none}
/* colunas pela largura do QUADRO (container query), não da janela: se não couber, fica o layout de duas linhas */
@container (min-width:620px){
 .lr.cc,.lhd.cc{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px}
 .lhd.cc{display:grid}.lr.cc .ld{order:1}.lr.cc .lds{order:2}.lr.cc .lc{order:3}.lr.cc .lv{order:4}}
@container (min-width:700px){
 .lr.cd,.lhd.cd{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px 64px}
 .lhd.cd{display:grid}.lr.cd .ld{order:1}.lr.cd .lds{order:2}.lr.cd .lc{order:3}.lr.cd .lv{order:4}.lr.cd .lp{order:5}}
@container (min-width:840px){
 .lr.cdh,.lhd.cdh{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px 64px minmax(110px,1fr)}
 .lhd.cdh{display:grid}.lr.cdh .ld{order:1}.lr.cdh .lds{order:2}.lr.cdh .lc{order:3}.lr.cdh .lv{order:4}.lr.cdh .lp{order:5}.lr.cdh .lh{order:6}}
.lhd{gap:4px 6px;font-size:.8rem}
.lr.ivt,.lr.ivo,.lr.ivr{grid-template-columns:1fr 1fr}
.lr.ivt>*,.lr.ivo>*,.lr.ivr>*{order:0}.lr .lm{order:9}
.ivg{margin-top:12px}
@container (min-width:640px){.lr.ivt,.lhd.ivt{grid-template-columns:140px 120px minmax(140px,1.4fr) 110px minmax(120px,2fr)}.lhd.ivt{display:grid}
 .lr.ivr,.lhd.ivr{grid-template-columns:140px minmax(150px,2fr) minmax(120px,1.2fr) 110px 90px}.lhd.ivr{display:grid}}
@container (min-width:960px){.lr.ivo,.lhd.ivo{grid-template-columns:140px minmax(150px,2fr) 100px 80px 110px 80px 100px 110px 90px}.lhd.ivo{display:grid}}
.lf{display:grid;grid-template-columns:1fr 1fr;gap:4px 6px;padding:8px 0;border-bottom:1px solid var(--bd)}
.lf input,.lf select{margin:0;width:100%;box-sizing:border-box;min-width:0}
.lf .fn{grid-column:1/-1;display:flex;gap:8px;align-items:center}.lf .fn input{width:auto}.lf .fm{grid-column:1/-1}.lf.err{background:rgba(220,38,38,.08)}
.lf.dim .fn b{opacity:.6}
@container (min-width:820px){.lf{grid-template-columns:minmax(160px,1.4fr) 140px 110px 64px minmax(120px,1fr) minmax(120px,1fr)}.lf .fn{grid-column:auto}}
</style>`;
/* tela larga só no lote: o nucleo liga body.lote-wide ao entrar em "lote" e desliga ao sair */
document.head.insertAdjacentHTML("beforeend",`<style>
body.lote-wide,body.lote-wide #app,body.lote-wide main,body.lote-wide #main,body.lote-wide .wrap{max-width:none!important}
body.lote-wide main,body.lote-wide #main{width:auto!important}
</style>`);
const loteCats=()=>'<option value="">Categoria</option><optgroup label="Despesas">'+catOpts("expense")+'</optgroup><optgroup label="Receitas">'+catOpts("income")+'</optgroup>';
const loteOk=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&+d.slice(0,4)>=1900&&+d.slice(0,4)<=2100;
function viewLote(msg){
  const CC=S.accounts.filter(a=>a.type==="checking"||a.type==="cash"),CD=S.accounts.filter(a=>a.type==="credit_card"),IA=S.accounts.filter(a=>a.type==="investment");
  if(IA.length)S.loteAssetsP=sb.from("investment_assets").select("id,account_id,class,price_mode,ticker,name,is_active").eq("household_id",S.hid).order("name");
  if(!S.loteSecs){S.loteSecs=[];if(CC.length)S.loteSecs.push({t:"cc",acc:S.lastAcc&&CC.some(a=>a.id===S.lastAcc)?S.lastAcc:CC[0].id});if(CD.length)S.loteSecs.push({t:"cd",acc:CD[0].id});if(IA.length)S.loteSecs.push({t:"iv",acc:IA[0].id});}
  S.loteSecs=S.loteSecs.filter(x=>!x.gone&&(x.t==="cc"?CC:x.t==="cd"?CD:IA).some(a=>a.id===x.acc));
  $("main").innerHTML=LOTE_CSS+`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Lançar em lote</b>
    <p class="mu" style="margin:6px 0">Digite várias linhas e grave tudo de uma vez. Linha vazia é ignorada. A categoria define se é despesa ou receita. No cartão, cada compra cai na fatura pela data (como em Lançar); parcelas: informe o total e o nº de parcelas.</p>
    <datalist id="lqs">${S.qs.map(q=>`<option value="${esc(q.name)}">`).join("")}</datalist></div>
   <div id="lfx"></div><div id="lsecs"></div>
   <div class="card">${CC.length?'<button class="sec" id="lacc" style="margin-top:0">＋ Outra conta corrente</button>':""}${CD.length?'<button class="sec" id="lacd">＋ Outro cartão</button>':""}${IA.length?'<button class="sec" id="laiv">＋ Investimentos</button>':""}
    <button class="pri" id="lgo">Confirmar e gravar</button><p id="ltm" class="${msg?"pos":"neg"}">${esc(msg||"")}</p></div>`;
  $("bk").onclick=()=>go("add");
  loteFx();S.loteSecs.forEach((x,i)=>loteSec(i));
  if($("lacc"))$("lacc").onclick=()=>{S.loteSecs.push({t:"cc",acc:CC[0].id});loteSec(S.loteSecs.length-1);};
  if($("lacd"))$("lacd").onclick=()=>{S.loteSecs.push({t:"cd",acc:CD[0].id});loteSec(S.loteSecs.length-1);};
  if($("laiv"))$("laiv").onclick=()=>{S.loteSecs.push({t:"iv",acc:IA[0].id});loteSec(S.loteSecs.length-1);};
  $("lgo").onclick=loteSave;
}
/* Contas fixas do mês (atalhos com recurrence): mensais todo mês; anuais só no mês do vencimento, com parcelas */
async function loteFx(){
  const box=$("lfx");if(!box)return;if(!S.loteMon)S.loteMon=today().slice(0,8)+"01";
  const m0=S.loteMon,mo=+m0.slice(5,7),dim=new Date(+m0.slice(0,4),mo,0).getDate(),dd=q=>m0.slice(0,8)+String(Math.min(q.due_day||1,dim)).padStart(2,"0");
  const FX=S.qs.filter(q=>q.recurrence==="monthly"||(q.recurrence==="yearly"&&q.due_month===mo)).sort((a,b)=>(a.due_day||0)-(b.due_day||0)||a.name.localeCompare(b.name,"pt-BR"));
  const AC=S.accounts.filter(a=>["checking","cash","credit_card"].includes(a.type)),defA=q=>AC.some(a=>a.id===q.default_account_id)?q.default_account_id:(S.lastAcc&&AC.some(a=>a.id===S.lastAcc)?S.lastAcc:(AC[0]||{}).id);
  box.innerHTML=`<div class="card"><div class="row" style="align-items:center;border:0;padding:0"><b>📌 Contas fixas</b><span><button class="x" id="lfp">‹</button> <b>${mlab(m0)}</b> <button class="x" id="lfn">›</button></span></div>
    <div class="lbox">${FX.length?FX.map(q=>`<div class="lf" data-q="${q.id}"><div class="fn"><input type="checkbox" class="fk"><b>${esc(q.name)}</b><span class="mu">${q.recurrence==="monthly"?"mensal":"anual"}</span></div>
      <input type="date" class="fd" value="${dd(q)}"><input class="fv" inputmode="decimal" placeholder="Valor" value="${fa(q.default_amount)}">
      <input class="fp" type="number" min="1" max="48" inputmode="numeric" placeholder="${q.recurrence==="yearly"?"Parc.":"—"}" value="${q.recurrence==="yearly"&&q.installments?q.installments:""}" ${q.recurrence==="yearly"?"":"disabled"}>
      <select class="fa">${AC.map(a=>`<option value="${a.id}" ${a.id===defA(q)?"selected":""}>${esc(a.name)}</option>`).join("")}</select>
      <select class="fc">${loteCats()}</select><div class="mu fm"></div></div>`).join("")
      :`<p class="mu">Nenhuma conta fixa para ${mlab(m0)}. Cadastre em Lançar > ⚙ Gerenciar atalhos (Conta fixa: Mensal ou Anual).</p>`}</div>
    ${FX.length?'<p class="mu">Marque as que quer lançar e confira o valor. Nas anuais, "Parc." gera as parcelas mês a mês a partir deste mês (valor = total).</p>':""}</div>`;
  $("lfp").onclick=()=>{S.loteMon=mAdd(m0,-1);loteFx();};$("lfn").onclick=()=>{S.loteMon=mAdd(m0,1);loteFx();};
  FX.forEach(q=>{const r=box.querySelector(`[data-q="${q.id}"]`),c=r.querySelector(".fc");if(q.category_id&&[...c.options].some(o=>o.value===q.category_id))c.value=q.category_id;
    const inf=()=>{if(r.classList.contains("err"))return;const m=r.querySelector(".fm"),np=parseInt(r.querySelector(".fp").value)||1,v=num(r.querySelector(".fv").value||"");
      m.textContent=(r.dataset.ja?r.dataset.ja+" ":"")+(np>=2&&v>0?`${np}x de aprox. ${fmt(v/np,"BRL")}, até ${mlab(mAdd(m0,np-1))}`:"");};
    r.querySelectorAll(".fd,.fv,.fp,.fa,.fc").forEach(f=>f.addEventListener("input",()=>{r.classList.remove("err");if(f.classList.contains("fv")||f.classList.contains("fd"))r.querySelector(".fk").checked=true;inf();}));
    r.querySelector(".fk").addEventListener("change",()=>{r.classList.remove("err");inf();});r._inf=inf;inf();});
  /* "já lançada": no mês, na conta do atalho, um lançamento com a mesma descrição (o lote grava o nome do atalho) ou com a mesma categoria e o valor padrão */
  if(FX.length){const ids=[...new Set(FX.map(defA).filter(Boolean))];
    const {data}=await sb.from("transactions").select("account_id,category_id,date,amount,description").in("account_id",ids).gte("date",m0).lt("date",mAdd(m0,1)).limit(2000);
    if(S.loteMon!==m0||!$("lfx"))return;
    const nm=x=>String(x||"").trim().toLowerCase();
    FX.forEach(q=>{const D=(data||[]).filter(x=>x.account_id===defA(q)),t=D.find(x=>nm(x.description)===nm(q.name))||(q.category_id&&q.default_amount?D.find(x=>x.category_id===q.category_id&&Math.abs(Math.abs(Number(x.amount))-Number(q.default_amount))<0.005):null),r=box.querySelector(`[data-q="${q.id}"]`);
      if(!t||!r)return;r.dataset.ja=`⚠️ já lançada em ${fdt(t.date)} (${fmt(Math.abs(Number(t.amount)),"BRL")}).`;r.classList.add("dim");r._inf();});}
}
/* ---- Investimentos (Etapa 4): aportes e resgates, operações e rendimentos de UMA conta de investimento ---- */
const IVK={juros:"Juros",dividendo:"Dividendo",jcp:"JCP",rendimento_fii:"Rendimento de FII",outros:"Outros"};
async function loteSecIv(i){
  const x=S.loteSecs[i],IA=S.accounts.filter(a=>a.type==="investment"),CB=S.accounts.filter(a=>(a.type==="checking"||a.type==="cash")&&a.currency.trim()==="BRL");
  const el=document.createElement("div");el.className="card";el.dataset.sec=i;$("lsecs").appendChild(el);el.innerHTML='<p class="mu">Carregando ativos…</p>';
  const r0=await S.loteAssetsP;const AS=(r0&&r0.data)||[];
  const assets=()=>AS.filter(a=>a.account_id===x.acc&&a.is_active),aById=id=>AS.find(a=>a.id===id);
  const aOpts=sel=>'<option value="">Ativo</option>'+assets().map(a=>`<option value="${a.id}" ${a.id===sel?"selected":""}>${esc(a.ticker||a.name)}${a.ticker?" · "+esc(a.name):""}</option>`).join("");
  el.innerHTML=`<div class="row" style="border:0;padding:0"><b>📈 Investimentos</b><button class="x" data-lx="${i}" title="Tirar esta seção">✕</button></div>
    <label>Conta de investimento<select class="lsa">${IA.map(a=>`<option value="${a.id}" ${a.id===x.acc?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
    ${r0&&r0.error?`<p class="neg">${esc(r0.error.message)}</p>`:""}
    <div class="ivg"><b>Aportes e resgates</b><div class="lbox"><div class="lhd ivt"><span class="mu">Data</span><span class="mu">Sentido</span><span class="mu">Conta corrente</span><span class="mu">Valor</span><span class="mu">Descrição</span></div><div class="rt"></div></div><button class="lk" data-add="t">＋ linha</button></div>
    <div class="ivg"><b>Operações (compra, venda, resgate)</b><div class="lbox"><div class="lhd ivo"><span class="mu">Data</span><span class="mu">Ativo</span><span class="mu">Tipo</span><span class="mu">Qtd.</span><span class="mu">Valor total</span><span class="mu">Taxas</span><span class="mu">Resgate</span><span class="mu">Saldo antes</span><span class="mu">IR retido</span></div><div class="ro"></div></div><button class="lk" data-add="o">＋ linha</button></div>
    <div class="ivg"><b>Rendimentos</b><div class="lbox"><div class="lhd ivr"><span class="mu">Data</span><span class="mu">Ativo</span><span class="mu">Tipo</span><span class="mu">Bruto</span><span class="mu">IR retido</span></div><div class="rr"></div></div><button class="lk" data-add="r">＋ linha</button></div>
    <p class="mu lst"></p><p class="mu">Valor das operações: o LÍQUIDO que entrou ou saiu do caixa (como em + Operação). No resgate parcial de renda fixa, informe o saldo líquido da posição antes do resgate; depois atualize o valor da posição em Investimentos > Atualizar cotações.</p>`;
  const box={t:el.querySelector(".rt"),o:el.querySelector(".ro"),r:el.querySelector(".rr")};
  const rowsOf=k=>[...box[k].querySelectorAll(".lr")];
  const filled={t:r=>!!r.querySelector(".tv").value.trim(),o:r=>!!(r.querySelector(".ov").value.trim()||r.querySelector(".oa").value),r:r=>!!(r.querySelector(".rg").value.trim()||r.querySelector(".ra").value)};
  const sync=r=>{if(!r.classList.contains("ivo"))return;const a=aById(r.querySelector(".oa").value),q=!a||a.price_mode==="quote",sellT=!!a&&a.price_mode==="total"&&r.querySelector(".os").value==="sell",par=sellT&&r.querySelector(".op").value==="p";
    r.querySelector(".oq").disabled=!q;if(!q)r.querySelector(".oq").value="";r.querySelector(".op").disabled=!sellT;r.querySelector(".oi").disabled=!sellT;r.querySelector(".ob").disabled=!par;if(!sellT)r.querySelector(".oi").value="";if(!par)r.querySelector(".ob").value="";};
  const info=r=>{const m=r.querySelector(".lm");if(r.classList.contains("err"))return;m.textContent="";
    if(r.classList.contains("ivr")){const g=num(r.querySelector(".rg").value||""),t=r.querySelector(".rt2").value.trim()?num(r.querySelector(".rt2").value):0;if(g>0&&t>=0&&t<=g)m.textContent="Líquido "+fmt(g-t,"BRL");}};
  const tot=()=>{let ap=0,rs=0,cp=0,vd=0,rd=0;
    rowsOf("t").filter(filled.t).forEach(r=>{const v=num(r.querySelector(".tv").value||"");if(v>0){if(r.querySelector(".ts").value==="in")ap+=v;else rs+=v;}});
    rowsOf("o").filter(filled.o).forEach(r=>{const v=num(r.querySelector(".ov").value||""),f=r.querySelector(".of").value.trim()?num(r.querySelector(".of").value):0;if(v>0){if(r.querySelector(".os").value==="buy")cp+=v+(f||0);else vd+=v-(f||0);}});
    rowsOf("r").filter(filled.r).forEach(r=>{const g=num(r.querySelector(".rg").value||""),t=r.querySelector(".rt2").value.trim()?num(r.querySelector(".rt2").value):0;if(g>0)rd+=g-(t||0);});
    const ef=ap-rs-cp+vd+rd;el.querySelector(".lst").textContent=(ap||rs||cp||vd||rd)?`Aportes ${mm(ap)} · resgates ${mm(rs)} · compras ${mm(cp)} · vendas ${mm(vd)} · rendimentos ${mm(rd)} · efeito no caixa ${mm(ef)}`:"";};
  const add=(k,d)=>{const r=document.createElement("div");
    if(k==="t"){r.className="lr ivt";r.innerHTML=`<input type="date" class="td" value="${d||""}"><select class="ts"><option value="in">Aporte (entra)</option><option value="out">Resgate (sai)</option></select><select class="tc">${CB.map(a=>`<option value="${a.id}" ${a.id===S.lastAcc?"selected":""}>${esc(a.name)}</option>`).join("")}</select><input class="tv" inputmode="decimal" placeholder="Valor"><input class="tx" placeholder="Descrição (opcional)"><div class="mu lm"></div>`;}
    else if(k==="o"){r.className="lr ivo";r.innerHTML=`<input type="date" class="od" value="${d||""}"><select class="oa">${aOpts("")}</select><select class="os"><option value="buy">Compra</option><option value="sell">Venda/resgate</option></select><input class="oq" inputmode="decimal" placeholder="Qtd."><input class="ov" inputmode="decimal" placeholder="Valor total"><input class="of" inputmode="decimal" placeholder="Taxas"><select class="op"><option value="t">Total</option><option value="p">Parcial</option></select><input class="ob" inputmode="decimal" placeholder="Saldo antes"><input class="oi" inputmode="decimal" placeholder="IR"><div class="mu lm"></div>`;}
    else{r.className="lr ivr";r.innerHTML=`<input type="date" class="rd" value="${d||""}"><select class="ra">${aOpts("")}</select><select class="rk">${Object.keys(IVK).map(k2=>`<option value="${k2}">${IVK[k2]}</option>`).join("")}</select><input class="rg" inputmode="decimal" placeholder="Bruto"><input class="rt2" inputmode="decimal" placeholder="IR"><div class="mu lm"></div>`;}
    box[k].appendChild(r);
    const ed=()=>{r.classList.remove("err");sync(r);const R=rowsOf(k);if(r===R[R.length-1]&&filled[k](r))add(k,r.querySelector("input[type=date]").value);info(r);tot();};
    r.querySelectorAll("input,select").forEach(f=>{f.addEventListener("input",ed);f.addEventListener("change",ed);});sync(r);};
  ["t","o","r"].forEach(k=>{add(k,"");add(k,"");});
  el.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const k=b.dataset.add,R=rowsOf(k);add(k,R.length?R[R.length-1].querySelector("input[type=date]").value:"");});
  el.querySelector(".lsa").onchange=()=>{x.acc=el.querySelector(".lsa").value;
    el.querySelectorAll(".oa,.ra").forEach(s2=>{const v=s2.value;s2.innerHTML=aOpts(v);if(!assets().some(a=>a.id===v))s2.value="";});el.querySelectorAll(".ivo").forEach(sync);tot();};
  el.querySelector("[data-lx]").onclick=()=>{if(["t","o","r"].some(k=>rowsOf(k).some(filled[k]))&&!confirm("Tirar esta seção? As linhas digitadas nela serão descartadas."))return;x.gone=true;el.remove();};
}
function loteSec(i){
  if(S.loteSecs[i].t==="iv")return loteSecIv(i);
  const x=S.loteSecs[i],card=x.t==="cd",L=S.accounts.filter(a=>card?a.type==="credit_card":(a.type==="checking"||a.type==="cash"));
  const el=document.createElement("div");el.className="card";el.dataset.sec=i;
  el.innerHTML=`<div class="row" style="border:0;padding:0"><b>${card?"💳 Cartão":"🏦 Conta corrente ou dinheiro"}</b><button class="x" data-lx="${i}" title="Tirar esta seção">✕</button></div>
    <label>${card?"Cartão":"Conta"}<select class="lsa">${L.map(a=>`<option value="${a.id}" ${a.id===x.acc?"selected":""}>${esc(a.name)} (${a.currency.trim()})</option>`).join("")}</select></label>
    <div class="lbox"><div class="lhd"></div><div class="lrows"></div></div>
    <button class="lk lad">＋ linha</button><p class="mu lst"></p>`;
  $("lsecs").appendChild(el);
  const kind=()=>{const H=holdersOf(x.acc);return card?(H.length>1?"cdh":"cd"):"cc";};
  const head=()=>{const k=kind(),h=el.querySelector(".lhd");h.className="lhd "+k;
    h.innerHTML='<span class="mu">Data</span><span class="mu">Descrição</span><span class="mu">Categoria</span><span class="mu">Valor</span>'+(card?'<span class="mu">Parcelas</span>':"")+(k==="cdh"?'<span class="mu">Portador</span>':"");};
  const addRow=d=>{const k=kind(),H=holdersOf(x.acc),r=document.createElement("div");r.className="lr "+k;
    let sv=null;try{sv=localStorage.getItem("hold_"+x.acc)}catch(e){}
    r.innerHTML=`<input type="date" class="ld" value="${d||""}"><input class="lv" inputmode="decimal" placeholder="Valor"><input class="lds" placeholder="Descrição" list="lqs" autocomplete="off"><select class="lc">${loteCats()}</select>`
      +(card?'<input class="lp" type="number" min="1" max="48" inputmode="numeric" placeholder="Parc.">':"")
      +(k==="cdh"?`<select class="lh">${H.map(h=>`<option value="${h.id}" ${h.id===sv?"selected":""}>${esc(h.name)}</option>`).join("")}</select>`:"")
      +'<div class="mu lm"></div>';
    el.querySelector(".lrows").appendChild(r);
    r.querySelectorAll("input,select").forEach(f=>f.addEventListener("input",()=>onEdit(r)));
    r.querySelector(".lc").addEventListener("change",()=>onEdit(r));
    r.querySelector(".lds").addEventListener("change",()=>{const q=S.qs.find(z=>z.name.trim().toLowerCase()===r.querySelector(".lds").value.trim().toLowerCase());
      if(!q)return;const c=r.querySelector(".lc");if(!c.value&&q.category_id&&[...c.options].some(o=>o.value===q.category_id))c.value=q.category_id;
      const v=r.querySelector(".lv");if(!v.value.trim()&&q.default_amount)v.value=fa(q.default_amount);onEdit(r);});};
  const rows=()=>[...el.querySelectorAll(".lr")];
  const filled=r=>!!(r.querySelector(".lv").value.trim()||r.querySelector(".lds").value.trim()||r.querySelector(".lc").value);
  const onEdit=r=>{r.classList.remove("err");const R=rows();if(r===R[R.length-1]&&filled(r))addRow(r.querySelector(".ld").value);info(r);tot();};
  const info=r=>{const m=r.querySelector(".lm");if(r.classList.contains("err"))return;m.textContent="";if(!card||!filled(r))return;
    const cc=S.cards.find(c=>c.account_id===x.acc),d=r.querySelector(".ld").value,n=parseInt(r.querySelector(".lp").value)||1,v=num(r.querySelector(".lv").value||"");
    const t=[];if(cc&&loteOk(d))t.push("fatura "+mlab(stm(cc,d)));if(n>=2&&v>0)t.push(`${n}x de aprox. ${fmt(v/n,"BRL")}`);m.textContent=t.join(" · ");};
  const tot=()=>{const cur=(S.accounts.find(a=>a.id===x.acc)||{currency:"BRL"}).currency.trim();let e=0,inc=0,n=0;const F={};
    const cc=card&&S.cards.find(c=>c.account_id===x.acc);
    rows().filter(filled).forEach(r=>{const v=num(r.querySelector(".lv").value||""),c=catById(r.querySelector(".lc").value);if(!(v>0))return;n++;
      if(c&&c.kind==="income")inc+=v;else e+=v;
      if(cc){const d=r.querySelector(".ld").value,np=parseInt(r.querySelector(".lp").value)||1;if(loteOk(d)){const sg=c&&c.kind==="income"?-1:1;
        if(np>=2){const vv=Math.round(v/np*100)/100;for(let k=0;k<np;k++){const m=stm(cc,dAdd(d,k)),pv=k<np-1?vv:Math.round((v-vv*(np-1))*100)/100;F[m]=(F[m]||0)+sg*pv;}}
        else{const m=stm(cc,d);F[m]=(F[m]||0)+sg*v;}}}});
    el.querySelector(".lst").textContent=n?`${n} linha(s) · ${card?"compras":"despesas"} ${fmt(e,cur)}${inc?" · "+(card?"estornos":"receitas")+" "+fmt(inc,cur):""}`
      +(Object.keys(F).length?" · por fatura: "+Object.keys(F).sort().map(m=>mlab(m).replace(" de "," ")+" "+fmt(F[m],cur)).join(" · "):""):"";};
  el.querySelector(".lsa").onchange=()=>{x.acc=el.querySelector(".lsa").value;head();
    /* troca de conta: refaz as linhas (o portador depende do cartão), mantendo o que foi digitado */
    const keep=rows().map(r=>({d:r.querySelector(".ld").value,v:r.querySelector(".lv").value,s:r.querySelector(".lds").value,c:r.querySelector(".lc").value,p:r.querySelector(".lp")?r.querySelector(".lp").value:""}));
    el.querySelector(".lrows").innerHTML="";keep.forEach(k=>{addRow(k.d);const r=rows().pop();r.querySelector(".lv").value=k.v;r.querySelector(".lds").value=k.s;r.querySelector(".lc").value=k.c;if(r.querySelector(".lp"))r.querySelector(".lp").value=k.p;info(r);});
    if(!keep.length||filled(rows().pop()))addRow("");tot();};
  el.querySelector(".lad").onclick=()=>{const R=rows();addRow(R.length?R[R.length-1].querySelector(".ld").value:"");};
  el.querySelector("[data-lx]").onclick=()=>{if(rows().some(filled)&&!confirm("Tirar esta seção? As linhas digitadas nela serão descartadas."))return;x.gone=true;el.remove();};
  head();for(let k=0;k<3;k++)addRow("");
}
const AS0=id=>id?(((S.loteAssetsCache)||[]).find(a=>a.id===id)||null):null;
async function loteSave(){
  if(S.loteAssetsP){const r=await S.loteAssetsP;S.loteAssetsCache=(r&&r.data)||[];}
  const say=(t,ok)=>{$("ltm").className=ok?"pos":"neg";$("ltm").textContent=t;};
  const out=[],bad=[];let nL=0;
  document.querySelectorAll("#lfx .lf").forEach(r=>{r.classList.remove("err");if(!r.querySelector(".fk").checked)return;
    const g=c=>r.querySelector(c),v=num(g(".fv").value||""),d=g(".fd").value,acc=S.accounts.find(a=>a.id===g(".fa").value),cid=g(".fc").value,c=catById(cid),np=g(".fp").value.trim()?parseInt(g(".fp").value):1,q=S.qs.find(z=>z.id===r.dataset.q);
    const e=[];if(!loteOk(d))e.push("data");if(!(v>0)||Math.round(v*100)/100!==v)e.push("valor");if(!acc)e.push("conta");if(!c&&S.cats.length)e.push("categoria");
    if(!(np>=1&&np<=48))e.push("parcelas de 1 a 48");if(np>=2&&c&&c.kind==="income")e.push("parcelas só em despesa");if(np>=2&&acc&&acc.currency.trim()!=="BRL")e.push("parcelas só em conta em reais");
    if(e.length){r.classList.add("err");g(".fm").textContent="Corrija: "+e.join(", ")+".";bad.push(r);return;}
    const H=holdersOf(acc.id);let hv=null;if(acc.type==="credit_card"){let sv=null;try{sv=localStorage.getItem("hold_"+acc.id)}catch(x){}hv=H.length>1?(H.some(h=>h.id===sv)?sv:H[0].id):(H[0]?H[0].id:null);}
    const base={lbl:"Conta fixa "+(q?q.name:""),account_id:acc.id,category_id:cid||null,description:q?q.name:null,card_holder_id:hv},sg=c&&c.kind==="income"?1:-1;nL++;
    if(np>=2){const gid=uid4(),vv=Math.round(v/np*100)/100;
      for(let k=1;k<=np;k++){const dk=dAdd(d,k-1),pv=k<np?vv:Math.round((v-vv*(np-1))*100)/100;
        out.push({...base,date:dk,amount:-pv,status:dk>today()?"planned":"posted",installment_group_id:gid,installment_number:k,installment_total:np});}}
    else out.push({...base,date:d,amount:sg*v,status:d>today()?"planned":"posted"});});
  document.querySelectorAll("#lsecs [data-sec]").forEach(el=>{const x=S.loteSecs[+el.dataset.sec];if(!x||x.gone||x.t==="iv")return;
    const acc=S.accounts.find(a=>a.id===x.acc),card=x.t==="cd",H=holdersOf(x.acc);
    el.querySelectorAll(".lr").forEach((r,j)=>{r.classList.remove("err");
      const g=c=>r.querySelector(c),v=num(g(".lv").value||""),d=g(".ld").value,desc=g(".lds").value.trim()||null,cid=g(".lc").value,c=catById(cid),np=g(".lp")?(g(".lp").value.trim()?parseInt(g(".lp").value):1):1;
      if(!(g(".lv").value.trim()||desc||cid))return;
      const e=[];
      if(!loteOk(d))e.push("data");
      if(!(v>0)||Math.round(v*100)/100!==v)e.push("valor (maior que zero, até 2 casas)");
      if(!c&&S.cats.length)e.push("categoria");
      if(!(np>=1&&np<=48))e.push("parcelas de 1 a 48");
      if(np>=2&&c&&c.kind==="income")e.push("parcelas só em despesa");
      if(np>=2&&acc.currency.trim()!=="BRL")e.push("parcelas só em conta em reais");
      if(e.length){r.classList.add("err");g(".lm").textContent="Corrija: "+e.join(", ")+".";bad.push(r);return;}
      const sg=c&&c.kind==="income"?1:-1,hv=H.length>1?(g(".lh")?g(".lh").value:null):(H[0]?H[0].id:null);
      const base={lbl:`${acc.name}, linha ${j+1}`,account_id:x.acc,category_id:cid||null,description:desc,card_holder_id:card?hv:null};
      nL++;
      if(np>=2){const gid=uid4(),vv=Math.round(v/np*100)/100;
        for(let k=1;k<=np;k++){const dk=dAdd(d,k-1),pv=k<np?vv:Math.round((v-vv*(np-1))*100)/100;
          out.push({...base,date:dk,amount:-pv,status:dk>today()?"planned":"posted",installment_group_id:gid,installment_number:k,installment_total:np});}}
      else out.push({...base,date:d,amount:sg*v,status:d>today()?"planned":"posted"});
      if(card&&H.length>1&&hv){try{localStorage.setItem("hold_"+x.acc,hv)}catch(e){}}});});
  /* investimentos */
  const TRF=[],OPS=[],INC=[];let par=0;
  document.querySelectorAll("#lsecs [data-sec]").forEach(el=>{const x=S.loteSecs[+el.dataset.sec];if(!x||x.gone||x.t!=="iv")return;
    const inv=S.accounts.find(a=>a.id===x.acc),nm=inv?inv.name:"Investimento",n2=s0=>s0.trim()?num(s0):null,c2=v=>v!=null&&Math.round(v*100)/100===v;
    const err=(r,e)=>{r.classList.add("err");r.querySelector(".lm").textContent="Corrija: "+e.join(", ")+".";bad.push(r);};
    el.querySelectorAll(".lr.ivt").forEach((r,j)=>{r.classList.remove("err");const g=c=>r.querySelector(c),v=n2(g(".tv").value),d=g(".td").value,cc=g(".tc").value;if(v===null)return;
      const e=[];if(!loteOk(d))e.push("data");if(!(v>0)||!c2(v))e.push("valor");if(!cc)e.push("conta corrente");if(e.length)return err(r,e);
      const ap=g(".ts").value==="in";TRF.push({lbl:`${nm}, ${ap?"aporte":"resgate"} linha ${j+1}`,from_id:ap?cc:x.acc,to_id:ap?x.acc:cc,amount:v,date:d,description:g(".tx").value.trim()||(ap?"Aporte":"Resgate")+" · "+nm});});
    el.querySelectorAll(".lr.ivo").forEach((r,j)=>{r.classList.remove("err");const g=c=>r.querySelector(c),a=AS0(g(".oa").value),v=n2(g(".ov").value),d=g(".od").value;if(v===null&&!a)return;
      const q=a&&a.price_mode==="quote",sell=g(".os").value==="sell",sellT=a&&!q&&sell,pr=sellT&&g(".op").value==="p",qt=q?n2(g(".oq").value):null,fe=n2(g(".of").value)||0,ir=sellT?(n2(g(".oi").value)||0):0,sb2=pr?n2(g(".ob").value):null;
      const e=[];if(!loteOk(d))e.push("data");if(!a)e.push("ativo");if(!(v>0)||!c2(v))e.push("valor");if(q&&!(qt>0))e.push("quantidade");if(!(fe>=0))e.push("taxas");
      if(sellT&&!(ir>=0&&ir<v))e.push("IR (zero ou maior e menor que o valor)");if(pr&&!(sb2>v))e.push("saldo antes (maior que o valor resgatado)");if(e.length)return err(r,e);
      if(pr)par++;OPS.push({lbl:`${nm}, operação linha ${j+1}`,asset_id:a.id,date:d,side:sell?"sell":"buy",quantity:qt,unit_price:null,amount:v,fees:fe,tax_withheld:ir,net_balance_before:pr?sb2:null});});
    el.querySelectorAll(".lr.ivr").forEach((r,j)=>{r.classList.remove("err");const g=c=>r.querySelector(c),a=AS0(g(".ra").value),gr=n2(g(".rg").value),t=n2(g(".rt2").value)||0,d=g(".rd").value;if(gr===null&&!a)return;
      const e=[];if(!loteOk(d))e.push("data");if(!a)e.push("ativo");if(!(gr>0)||!c2(gr))e.push("valor bruto");if(!(t>=0&&t<=gr))e.push("IR (até o bruto)");if(e.length)return err(r,e);
      INC.push({lbl:`${nm}, rendimento linha ${j+1}`,asset_id:a.id,date:d,kind:g(".rk").value,gross:gr,tax_withheld:t});});});
  if(bad.length){bad[0].scrollIntoView({block:"center"});return say(`${bad.length} linha(s) com erro (em vermelho). Nada foi gravado.`);}
  if(!out.length&&!TRF.length&&!OPS.length&&!INC.length)return say("Nenhuma linha preenchida.");
  const partes=[nL?`${nL} lançamento(s)${out.length>nL?` (${out.length} linhas, contando as parcelas)`:""}`:"",TRF.length?`${TRF.length} aporte(s)/resgate(s)`:"",OPS.length?`${OPS.length} operação(ões)`:"",INC.length?`${INC.length} rendimento(s)`:""].filter(Boolean).join(", ");
  if(!confirm(`Gravar ${partes}?`))return;
  $("lgo").disabled=true;
  const {data:res,error}=await sb.rpc("lote_gravar",{p_tx:out,p_trf:TRF,p_ops:OPS,p_inc:INC});
  if(error){$("lgo").disabled=false;return say("Nada foi gravado. "+error.message+(error.message.includes("lote_gravar")?" (rode o script lote_gravar.sql no Supabase)":""));}
  viewLote(`Gravado ✓ ${partes}.`+(par?" Atualize o valor da posição restante dos resgates parciais em Investimentos > Atualizar cotações.":""));
}
