/* ===== Buscar lançamentos (11/11/2026) =====
   Tela aberta pelo botão 🔎 de Lançamentos (viewList). Só leitura paginada; editar e apagar usam as mesmas regras da lista.
   S.bf = filtros (q = texto da descrição, cat, acc, d1/d2 = De/Até, v/v2 = valor ou faixa, ty = tipo, st = status, n = quantidade, dup e dc = duplicados).
   Enquanto a tela está aberta, S.tab = "busca" (o tempo real não redesenha a lista por cima); S.bsBack = true marca que o ✏️ saiu daqui,
   e viewList, ao ser aberta de volta, reabre a busca uma única vez. */
const BS_SEL="id,account_id,statement_month,card_holder_id,wallet_id,date,amount,currency,description,status,installment_number,installment_total,installment_group_id,transfer_group_id,original_amount,original_currency,fx_rate_to_base,trip_id,categories(name),accounts!inner(name,household_id)";
const bsNorm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
let BSD={};
const bsApply=(q,F)=>{
  if(F.q)q=q.ilike("description","%"+F.q.replace(/[\\%_]/g,"\\$&")+"%");
  if(F.cat==="none")q=q.is("category_id",null);
  else if(F.cat)q=q.in("category_id",[F.cat].concat((S.cats||[]).filter(c=>c.parent_id===F.cat).map(c=>c.id)));
  if(F.acc)q=q.eq("account_id",F.acc);
  if(F.d1)q=q.gte("date",F.d1);
  if(F.d2)q=q.lte("date",F.d2);
  const va=F.v===""?null:num(F.v),vb=F.v2===""?null:num(F.v2);
  if(va!==null){let lo,hi;
    if(vb===null){lo=Math.max(0,va-0.005);hi=va+0.005;}else{lo=Math.min(va,vb);hi=Math.max(va,vb);}
    q=q.or(`and(amount.gte.${lo},amount.lte.${hi}),and(amount.lte.${-lo},amount.gte.${-hi})`);}
  if(F.ty==="exp")q=q.is("transfer_group_id",null).lt("amount",0);
  else if(F.ty==="inc")q=q.is("transfer_group_id",null).gt("amount",0);
  else if(F.ty==="trf")q=q.not("transfer_group_id","is",null);
  if(F.st)q=q.eq("status",F.st);
  return q;};
const bsRow=t=>`<div class="row"><div>
    <div>${esc(t.description||t.categories?.name||"Sem descrição")}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div>
    <div class="mu">${t.date.split("-").reverse().join("/")} · ${esc(t.categories?.name||"—")} · ${esc(t.accounts?.name)}${t.statement_month&&S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")?" · fatura "+t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):""}${t.card_holder_id&&holdersOf(t.account_id).length>1?" · "+esc(holderName(t.card_holder_id)):""}${t.wallet_id?" · "+esc(walletName(t.wallet_id)):""}${t.trip_id&&tripName(t.trip_id)?" · "+esc(tripName(t.trip_id)):""}${t.currency.trim()!=="BRL"?" · ≈ "+fmt(Number(t.amount)*Number(t.fx_rate_to_base||1),"BRL"):""}${t.original_amount?" · original "+fmt(t.original_amount,t.original_currency):""}${t.transfer_group_id?" · transferência":""}${t.status==="planned"&&t.date>today()?" · previsto":""}</div></div>
    <div style="text-align:right;white-space:nowrap"><span class="${t.amount<0?"neg":"pos"}">${fmt(t.amount,t.currency)}</span><button class="x" data-bed="${t.id}">✏️</button><button class="x" data-bdel="${t.id}">✕</button></div></div>`;
/* lê páginas de 1.000 (limite do servidor), até max páginas */
const bsPages=async(mk,max)=>{let out=[],err=null,cut=false;
  for(let p=0;p<max;p++){const r=await mk().range(p*1000,p*1000+999);
    if(r.error){err=r.error;break;}
    out=out.concat(r.data||[]);
    if((r.data||[]).length<1000)break;
    if(p===max-1)cut=true;}
  return {data:out,error:err,cut};};
async function bsRun(){
  const F=S.bf,box=$("bres"),seq=S.bseq=(S.bseq||0)+1;
  const va=F.v===""?null:num(F.v),vb=F.v2===""?null:num(F.v2);
  if((va!==null&&!(va>=0))||(vb!==null&&!(vb>=0))){box.innerHTML='<div class="card"><p class="neg">Informe o valor só com números, sem sinal (vale para despesa e para receita).</p></div>';return;}
  box.innerHTML='<div class="card"><span class="mu">Buscando…</span></div>';
  const ac=F.acc&&S.accounts.find(a=>a.id===F.acc),fcur=ac?ac.currency.trim():"",nat=!!fcur&&fcur!=="BRL",
    mul=x=>nat?1:Number(x.fx_rate_to_base||1),mm=v=>fmt(v,nat?fcur:"BRL"),
    base=sel=>bsApply(sb.from("transactions").select(sel,{count:"exact"}).eq("accounts.household_id",S.hid),F);
  if(F.dup){
    const R=await bsPages(()=>base(BS_SEL).is("transfer_group_id",null).order("date",{ascending:false}).order("id"),5);
    if(seq!==S.bseq)return;
    if(R.error){box.innerHTML=`<div class="card neg">${esc(R.error.message)}</div>`;return;}
    const G={};
    R.data.forEach(t=>{const k=[t.account_id,t.date,Number(t.amount).toFixed(2),F.dc==="loose"?"":bsNorm(t.description),t.installment_number||"",t.installment_total||""].join("|");(G[k]=G[k]||[]).push(t);});
    const D=Object.values(G).filter(L=>L.length>1).sort((a,b)=>b[0].date.localeCompare(a[0].date)),n=D.reduce((r,L)=>r+L.length,0);
    BSD={};R.data.forEach(t=>{BSD[t.id]=t;});
    box.innerHTML=`<div class="card"><b>🔁 Possíveis duplicados</b>
      <div class="mu">${D.length?`${D.length} grupo(s), ${n} lançamentos. `:""}Mesma conta, data e valor${F.dc==="loose"?" (a descrição pode ser diferente)":" e mesma descrição"}; transferências não entram. Confira cada grupo antes de apagar: compras repetidas de verdade também aparecem aqui.</div>
      ${R.cut?`<p class="mu">Analisados só os 5.000 lançamentos mais recentes que passam nos filtros; use o período (De/Até) para ver os mais antigos.</p>`:""}</div>
      ${D.length?D.map(L=>`<div class="card"><div class="mu" style="margin-bottom:4px">${L.length}× · ${fdt(L[0].date)} · ${mm(Number(L[0].amount)*mul(L[0]))}</div>${L.map(bsRow).join("")}</div>`).join(""):`<div class="card"><span class="mu">Nenhum possível duplicado com esses filtros (${R.data.length} lançamentos analisados).</span></div>`}`;
    bsBind();return;}
  const [A,B]=await Promise.all([
    base(BS_SEL).order("date",{ascending:false}).order("created_at",{ascending:false}).range(0,Math.min(F.n,1000)-1),
    bsPages(()=>bsApply(sb.from("transactions").select("id,amount,fx_rate_to_base,transfer_group_id,accounts!inner(household_id)").eq("accounts.household_id",S.hid),F).order("date",{ascending:false}).order("id"),5)]);
  if(seq!==S.bseq)return;
  if(A.error||B.error){box.innerHTML=`<div class="card neg">${esc((A.error||B.error).message)}</div>`;return;}
  const rows=A.data||[],tot=A.count??rows.length;
  const T=B.data.reduce((r,x)=>{const v=Number(x.amount)*mul(x);if(x.transfer_group_id){r.t+=v;r.nt++;}else if(v<0)r.e+=v;else r.i+=v;return r;},{e:0,i:0,t:0,nt:0});
  BSD={};rows.forEach(t=>{BSD[t.id]=t;});
  const more=tot>rows.length&&F.n<1000;
  box.innerHTML=`<div class="card"><b>${tot} lançamento(s)</b>
    ${tot?`<div class="row"><span class="mu">Despesas</span><span class="neg">${mm(T.e)}</span></div>
    <div class="row"><span class="mu">Receitas</span><span class="pos">${mm(T.i)}</span></div>
    ${T.nt?`<div class="row"><span class="mu">Transferências (${T.nt} pontas, líquido)</span><span class="${T.t<0?"neg":"pos"}">${mm(T.t)}</span></div>`:""}
    ${B.cut?'<div class="mu">Os totais consideram só os 5.000 lançamentos mais recentes que passam nos filtros.</div>':""}`:""}</div>
    <div class="card">${rows.length?rows.map(bsRow).join(""):'<span class="mu">Nenhum lançamento encontrado com esses filtros.</span>'}</div>
    ${more?`<button class="sec" id="bmore">Carregar mais 50 <span class="mu">(mostrando ${rows.length} de ${tot})</span></button>`:""}
    ${tot>rows.length&&!more?'<p class="mu">Mostrando os 1.000 mais recentes. Refine os filtros para ver os outros.</p>':""}`;
  if($("bmore"))$("bmore").onclick=()=>{S.bf.n+=50;bsRun();};
  bsBind();}
function bsBind(){
  document.querySelectorAll("#bres [data-bed]").forEach(b=>b.onclick=()=>{S.ed=b.dataset.bed;S.bsBack=true;go("ed");});
  document.querySelectorAll("#bres [data-bdel]").forEach(b=>b.onclick=async()=>{
    const t=BSD[b.dataset.bdel];if(!t)return;
    /* mesmos avisos e mesma regra do ✕ da lista de Lançamentos */
    const txt=t.transfer_group_id?"Apagar a transferência inteira (as duas pontas)?"
      :t.installment_group_id&&S.loans.some(l=>l.installment_group_id===t.installment_group_id)?"Apagar SÓ esta parcela do contrato? Para apagar o contrato inteiro, use Financiamentos no Painel.":t.installment_group_id?"Apagar SÓ esta parcela? Para apagar a compra inteira, use ✏️ e depois \"Editar todas as parcelas desta compra\".":"Apagar este lançamento?";
    if(!confirm(txt))return;
    const q=sb.from("transactions").delete();
    const {error}=await(t.transfer_group_id?q.eq("transfer_group_id",t.transfer_group_id):q.eq("id",t.id));
    if(error)alert("Erro: "+error.message);
    const y=window.scrollY;await bsRun();window.scrollTo(0,y);});}
function viewBusca(){
  S.tab="busca";window.scrollTo(0,0);
  const F=S.bf=S.bf||{q:"",cat:"",acc:"",d1:"",d2:"",v:"",v2:"",ty:"",st:"",n:50,dup:false,dc:"strict"},
    more=!!(F.acc||F.d1||F.d2||F.ty||F.st);
  const sel=(id,o,v)=>`<select id="${id}">${o.map(([k,l])=>`<option value="${k}" ${k===v?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bbk">← Lançamentos</button> <b>🔎 Buscar lançamentos</b>
    <label>Descrição (contém)<input id="bq" value="${esc(F.q)}" placeholder="Ex.: Vivo, mercado, farmácia" autocomplete="off"></label>
    <label>Categoria<select id="bcat"><option value="">Todas as categorias</option><option value="none">Sem categoria</option><optgroup label="Despesas">${catOpts("expense")}</optgroup><optgroup label="Receitas">${catOpts("income")}</optgroup></select></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>Valor (despesa ou receita)<input id="bv" inputmode="decimal" value="${esc(F.v)}" placeholder="Ex.: 99,90"></label><label>Até (opcional, faixa)<input id="bv2" inputmode="decimal" value="${esc(F.v2)}" placeholder="Ex.: 150"></label></div>
    <details id="bmf" ${more?"open":""} style="margin-top:8px"><summary><b>Mais filtros</b></summary>
      <label>Conta${sel("bacc",[["","Todas as contas"]].concat(S.accounts.map(a=>[a.id,a.name+" ("+a.currency.trim()+")"])),F.acc)}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>De<input id="bd1" type="date" value="${esc(F.d1)}"></label><label>Até<input id="bd2" type="date" value="${esc(F.d2)}"></label></div>
      <label>Tipo${sel("bty",[["","Todos"],["exp","Só despesas"],["inc","Só receitas"],["trf","Só transferências"]],F.ty)}</label>
      <label>Situação${sel("bst",[["","Todas"],["posted","Lançados"],["planned","Previstos"]],F.st)}</label></details>
    <button class="pri" id="bgo">Buscar</button>
    <label>Critério dos duplicados${sel("bdc",[["strict","Mesma conta, data, valor e descrição"],["loose","Mesma conta, data e valor (descrição pode diferir)"]],F.dc)}</label>
    <button class="sec" id="bdup">🔁 Procurar possíveis duplicados</button>
    <button class="lk" id="bclr">Limpar filtros</button></div>
  <div id="bres"></div>`;
  $("bcat").value=F.cat;
  const rd=()=>{F.q=$("bq").value.trim();F.cat=$("bcat").value;F.v=$("bv").value.trim();F.v2=$("bv2").value.trim();F.acc=$("bacc").value;F.d1=$("bd1").value;F.d2=$("bd2").value;F.ty=$("bty").value;F.st=$("bst").value;F.dc=$("bdc").value;F.n=50;},
    okd=v=>!v||(Number(v.slice(0,4))>=1900&&Number(v.slice(0,4))<=2100),
    run=()=>{rd();if(!okd(F.d1)||!okd(F.d2))return;bsRun();};
  $("bbk").onclick=()=>{S.bsBack=false;go("list");};
  $("bgo").onclick=()=>{F.dup=false;run();};
  $("bdup").onclick=()=>{F.dup=true;run();};
  ["bq","bv","bv2"].forEach(i=>$(i).onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();F.dup=false;run();}});
  ["bcat","bacc","bd1","bd2","bty","bst","bdc"].forEach(i=>$(i).onchange=run);
  $("bclr").onclick=()=>{S.bf=null;viewBusca();};
  bsRun();}
