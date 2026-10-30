async function viewAcc(){
  const [{data:bal},{data:h},{data:ina},{data:wbd}]=await Promise.all([
    sb.from("account_balances").select("*").eq("household_id",S.hid).order("name"),
    sb.from("households").select("invite_code").eq("id",S.hid).single(),
    sb.from("accounts").select("id,name").eq("household_id",S.hid).eq("is_active",false).order("name"),
    sb.from("wallet_balances").select("wallet_id,balance").eq("household_id",S.hid)]);
  const WB={};(wbd||[]).forEach(r=>{WB[r.wallet_id]=Number(r.balance);});
  const wbk=a=>{const L=walletsOf(a.account_id);return `<div style="padding:0 0 8px 14px;border-bottom:1px solid var(--bd)">${L.length?L.map(w=>`<div class="row" style="border:0;padding:6px 0"><div>${esc(w.name)}<div class="mu">${w.expected_amount?"esperado "+fmt(w.expected_amount,a.currency)+" · ":""}${walWhen(w)}</div></div><div style="text-align:right">${fmt(WB[w.id]||0,a.currency)}<button class="x" data-cr="${w.id}">+ Crédito</button></div></div>`).join(""):'<div class="mu">Nenhuma carteira. Crie em ⚙ da conta.</div>'}</div>`;};
  const rowH=(a,ind)=>`<div class="row"${ind?' style="padding-left:16px"':""}><div>${esc(a.name)}<div class="mu">${TYPES[a.type]}</div></div><div style="text-align:right">${fmt(a.balance,a.currency)}<button class="x" data-mg="${a.account_id}">⚙</button>${a.currency.trim()!=="BRL"?`<div class="mu">≈ ${mm(a.balance_base)} em reais (custo)</div>`:""}${a.type==="credit_card"?`<div><button class="x" data-pay="${a.account_id}">Fatura</button></div>`:""}</div></div>${a.type==="benefit"?wbk(a):""}`;
  const vis=(bal||[]).filter(a=>S.accounts.some(x=>x.id===a.account_id)),byAcc={};S.accounts.forEach(x=>{byAcc[x.id]=x;});
  let AL="";const seen={};
  vis.forEach(a=>{const ac=byAcc[a.account_id],g=gk(ac);
    if(!g){AL+=rowH(a,false);return;}
    if(seen[g])return;seen[g]=1;
    const mem=vis.filter(x=>gk(byAcc[x.account_id])===g).sort((x,y)=>(y.currency.trim()==="BRL")-(x.currency.trim()==="BRL"));
    const tot=mem.reduce((t,x)=>t+Number(x.balance_base||0),0);
    AL+=`<div class="row" style="background:rgba(127,127,127,.08);padding-left:8px;padding-right:8px"><div><b>🌎 ${esc(ac.group_name.trim())}</b><div class="mu">${mem.length} ${mem.length===1?"conta":"contas"}</div></div><div style="text-align:right"><b>≈ ${mm(tot)}</b><div class="mu">reais + moeda ao custo</div></div></div>`+mem.map(x=>rowH(x,true)).join("");});
  $("main").innerHTML=`<div class="card"><b>Contas</b> <button class="x" id="tb">🔁 Transferir</button>${AL||'<p class="mu">Nenhuma conta.</p>'}</div>
  <div class="card"><b>Nova conta</b>
   <label>Nome<input id="an"></label>
   <label>Tipo<select id="at">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></label>
   <label>Moeda (3 letras)<input id="ac" value="BRL" maxlength="3"></label>
   <label>Grupo internacional (opcional)<input id="ag" list="agl" placeholder="Ex.: ARQ Internacional"><datalist id="agl">${grpNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist></label>
   <label>Cartão: dia de fechamento<input id="acl" type="number" min="1" max="31"></label>
   <label>Cartão: dia de vencimento<input id="adu" type="number" min="1" max="31"></label>
   <button class="pri" id="ads">Adicionar</button><p id="amsg" class="neg"></p></div>
  <div class="card"><button class="sec" id="gcl" style="margin-top:0">🔒 Fechamento mensal</button><button class="sec" id="gc">🏷 Gerenciar categorias</button><button class="sec" id="gi">📈 Investimentos</button><button class="sec" id="gx">🌎 Internacional</button><button class="sec" id="gv">📖 Versículos</button></div>
  ${(ina||[]).length?`<div class="card"><details><summary>Contas inativas (${ina.length})</summary>${ina.map(a=>`<div class="row"><span>${esc(a.name)}</span><button class="x" data-ra="${a.id}">Reativar</button></div>`).join("")}</details></div>`:""}
  <div class="card mu">Código de convite da família: <b>${esc(h?.invite_code)}</b><br><br><button id="out">Sair</button></div>`;
  $("ads").onclick=async()=>{
    const cl=+$("acl").value,du=+$("adu").value,card=$("at").value==="credit_card";
    if(card&&!(cl>=1&&cl<=31&&du>=1&&du<=31))return $("amsg").textContent="Cartão: informe os dias de fechamento e vencimento (1 a 31).";
    const gn=$("ag").value.trim();
    if(gn&&!["checking","cash"].includes($("at").value))return $("amsg").textContent="Grupo internacional só para conta corrente ou dinheiro.";
    const {data:na,error}=await sb.from("accounts").insert({household_id:S.hid,name:$("an").value,type:$("at").value,currency:$("ac").value.toUpperCase(),group_name:gn||null}).select("id").single();
    if(error)return $("amsg").textContent=error.message.includes("accounts_group_uq")?"Já existe, neste grupo, uma conta ativa nesta moeda.":error.message;
    if(card){const r=await sb.from("credit_cards").insert({household_id:S.hid,account_id:na.id,closing_day:cl,due_day:du});if(r.error)return $("amsg").textContent="Conta criada, mas o cartão não: "+r.error.message;await sb.from("card_holders").insert({household_id:S.hid,account_id:na.id,name:"Titular"});}
    await loadRef();viewAcc();};
  $("gc").onclick=()=>{S.catFrom="acc";go("cat");};$("gv").onclick=()=>go("ver");$("gx").onclick=()=>go("intl");$("gi").onclick=()=>{S.im="";go("inv");};
  document.querySelectorAll("[data-cr]").forEach(b=>b.onclick=()=>{const w=S.wallets.find(x=>x.id===b.dataset.cr);
    S.kind="income";S.pre={acc:w.account_id,wal:w.id,amt:w.expected_amount,desc:"Crédito "+w.name,cat:lsGet("walcat_"+w.id)||null};go("add");});
  document.querySelectorAll("[data-mg]").forEach(b=>b.onclick=()=>{S.acmId=b.dataset.mg;go("acm");});
  document.querySelectorAll("[data-ra]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("accounts").update({is_active:true}).eq("id",b.dataset.ra);if(error)return alert("Erro: "+error.message);await loadRef();viewAcc();});
  $("gcl").onclick=()=>{S.cloAcc=null;S.cloMon=null;go("clo");};
  $("out").onclick=()=>sb.auth.signOut();
  $("tb").onclick=()=>{S.tr=null;S.trFrom="acc";go("tr");};
  document.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>{S.fatAcc=b.dataset.pay;S.fatMon=null;go("fat");});
}
const f2=v=>Math.abs(Number(v)).toFixed(2).replace(".",",");
const dper=()=>{const t=today(),y=+t.slice(0,4),m0=t.slice(0,8)+"01";
  if(S.dper==="year")return [y+"-01-01",(y+1)+"-01-01"];
  if(S.dper==="all")return ["1900-01-01","3000-01-01"];
  if(S.dper==="cus"&&S.dfrom&&S.dto){const e=new Date(S.dto+"T12:00:00");e.setDate(e.getDate()+1);return [S.dfrom,e.toISOString().slice(0,10)];}
  return [m0,mAdd(m0,1)];};

async function viewEdit(){
  const {data:t,error}=await sb.from("transactions")
    .select("id,account_id,statement_month,card_holder_id,wallet_id,date,amount,currency,description,category_id,status,transfer_group_id,installment_group_id,installment_number,installment_total,fx_input,original_amount,original_currency,accounts(name)")
    .eq("id",S.ed).single();
  if(error||!t){alert("Lançamento não encontrado.");return go("list");}
  drawEdit(t,{kind:t.amount<0?"expense":"income",val:f2(t.amount),date:t.date,cat:t.category_id||"",acc:t.account_id,desc:t.description||"",hold:t.card_holder_id||"",wal:t.wallet_id||"",all:false,oa:t.original_amount==null?"":f2(t.original_amount),oc:(t.original_currency||"").trim(),fi:t.fx_input==null?"":String(Number(t.fx_input)).replace(".",",")});
}
function drawEdit(t,D){
  const tr=!!t.transfer_group_id,pa=!!t.installment_group_id,cur=t.currency.trim(),lo=pa?S.loans.find(l=>l.installment_group_id===t.installment_group_id):null;
  const ben=(S.accounts.find(a=>a.id===t.account_id)||{}).type==="benefit",fgn=!tr&&!pa&&cur!=="BRL";
  /* fatura ajustada à mão = mês da fatura gravado difere do calculado pela data original (o banco recalcula ao mudar data/conta) */
  const ccard=S.cards.find(c=>c.account_id===t.account_id),isCard=(S.accounts.find(a=>a.id===t.account_id)||{}).type==="credit_card";
  const manFat=!tr&&isCard&&!!ccard&&!!t.statement_month&&t.statement_month!==stm(ccard,t.date);
  const accs=S.accounts.filter(a=>a.currency.trim()===cur&&(ben?a.id===t.account_id:a.type!=="benefit")).map(a=>({id:a.id,name:a.name}));
  if(!accs.some(a=>a.id===t.account_id))accs.push({id:t.account_id,name:t.accounts?.name||"Conta"});
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Editar lançamento</b>
   ${tr?'<p class="mu">Transferência: só data e descrição podem ser editadas, e a mudança vale para as duas pontas. Para corrigir valor ou contas, apague e refaça a transferência.</p>'
     :lo?`<p class="mu">Parcela ${t.installment_number}/${t.installment_total} do contrato <b>${esc(lo.name)}</b>. Informe o valor realmente cobrado pela instituição.</p>`
     :pa?`<p class="mu">Parcela ${t.installment_number}/${t.installment_total}. A conta vale para a compra toda. Alterar o valor muda o total da compra.</p>`:""}
   ${tr||pa?"":`<div class="seg"><button data-k="expense" class="${D.kind==="expense"?"on":""}">Despesa</button><button data-k="income" class="${D.kind==="income"?"on":""}">Receita</button></div>`}
   <label>Valor (${esc(cur)})<input id="ev" inputmode="decimal" value="${esc(D.val)}" ${tr?"disabled":""}></label>
   ${fgn?(D.kind==="expense"?`<label>Valor original, se a compra foi em outra moeda (opcional)<div class="seg"><input id="eoa" inputmode="decimal" placeholder="0,00" value="${esc(D.oa)}"><input id="eoc" maxlength="3" placeholder="EUR" value="${esc(D.oc)}" style="max-width:90px;text-transform:uppercase"></div></label><div class="mu">Não altera saldo nem custo; alimenta a taxa média do Posso comprar? em Internacional.</div>`
     :`<label>Taxa em R$ por 1 ${esc(cur)} (opcional)<input id="efi" inputmode="decimal" placeholder="vazio = custo médio atual" value="${esc(D.fi)}"></label><div class="mu">Muda o custo médio da conta (o banco recalcula) e não vale em mês fechado.</div>`):""}
   ${tr?"":`<label>Categoria<select id="ec">${catOpts(D.kind,D.cat,true)}</select></label>`}
   <label>Conta / cartão<select id="ea" ${tr||ben||(pa&&!lo)?"disabled":""}>${accs.map(a=>`<option value="${a.id}" ${a.id===D.acc?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   ${!tr&&holdersOf(t.account_id).length>1?`<label>Portador<select id="eh">${holdersOf(t.account_id).map(h=>`<option value="${h.id}" ${h.id===D.hold?"selected":""}>${esc(h.name)}</option>`).join("")}</select></label>`:""}
   ${!tr&&ben?`<label>Carteira<select id="ew">${S.wallets.filter(w=>w.account_id===t.account_id&&(w.is_active||w.id===D.wal)).map(w=>`<option value="${w.id}" ${w.id===D.wal?"selected":""}>${esc(w.name)}${w.is_active?"":" (inativa)"}</option>`).join("")}</select></label>`:""}
   <label>Descrição<input id="edsc" value="${esc(D.desc)}"></label>
   <label>Data<input id="edt" type="date" value="${esc(D.date)}"></label>
   ${manFat?`<label class="ck" id="efw" ${D.date===t.date?"hidden":""}><input type="checkbox" id="efat" ${D.keepFat===false?"":"checked"}> Manter a fatura de ${esc(mlab(t.statement_month))} (ajustada à mão)</label>`:""}
   ${lo?`<label class="ck"><input type="checkbox" id="efol" ${D.fol?"checked":""}> Se trocar a conta, aplicar também às parcelas seguintes ainda previstas</label>`:""}
   ${pa?`<label class="ck"><input type="checkbox" id="eall" ${D.all?"checked":""}> Aplicar categoria e descrição a todas as parcelas ${lo?"do contrato":"desta compra"}</label>
     <button class="lk" id="epar">Editar todas as parcelas ${lo?"do contrato":"desta compra"}</button>`:""}
   <button class="pri" id="es">Salvar alterações</button><p id="emsg" class="neg"></p></div>`;
  const grab=()=>{D.val=$("ev").value;D.date=$("edt").value;D.desc=$("edsc").value;if($("eh"))D.hold=$("eh").value;if($("ew"))D.wal=$("ew").value;
    if($("ec"))D.cat=$("ec").value;if($("ea"))D.acc=$("ea").value;if($("eall"))D.all=$("eall").checked;if($("efol"))D.fol=$("efol").checked;if($("efat"))D.keepFat=$("efat").checked;if($("eoa"))D.oa=$("eoa").value;if($("eoc"))D.oc=$("eoc").value;if($("efi"))D.fi=$("efi").value;};
  if($("efat"))$("edt").oninput=()=>{$("efw").hidden=$("edt").value===t.date;};
  $("bk").onclick=()=>go("list");
  document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{grab();D.kind=b.dataset.k;D.cat="";drawEdit(t,D);});
  if($("epar"))$("epar").onclick=()=>{S.par=t.installment_group_id;S.parFrom="list";go("par");};
  $("es").onclick=async()=>{
    const v=num($("ev").value),date=$("edt").value;
    if(!tr&&!(v>0))return $("emsg").textContent="Informe um valor válido.";
    if(!date)return $("emsg").textContent="Informe a data.";
    const oaV=$("eoa")&&$("eoa").value.trim()?num($("eoa").value):null,ocV=$("eoc")&&$("eoc").value.trim()?$("eoc").value.trim().toUpperCase():null,fiV=$("efi")&&$("efi").value.trim()?num($("efi").value):null;
    if(($("eoa")||$("eoc"))&&(oaV!==null||ocV)&&!(oaV>0&&ocV&&/^[A-Z]{3}$/.test(ocV)))return $("emsg").textContent="Valor original: informe o valor e a moeda com 3 letras (ex.: EUR).";
    if(fiV!==null&&!(fiV>0))return $("emsg").textContent="A taxa deve ser maior que zero.";
    const st=date>today()?"planned":"posted",desc=$("edsc").value.trim()||null;
    $("es").disabled=true;
    let r;
    if(tr)r=await sb.from("transactions").update({date,description:desc,status:st}).eq("transfer_group_id",t.transfer_group_id);
    else{
      const u={amount:D.kind==="expense"?-v:v,date,category_id:$("ec").value||null,description:desc,status:st};
      if(fgn){if($("eoa")){u.original_amount=oaV;u.original_currency=oaV!==null?ocV:null;if(t.fx_input!=null)u.fx_input=null;}
        else{const was=t.fx_input==null?null:Number(t.fx_input);if(fiV!==was)u.fx_input=fiV;if(t.original_amount!=null){u.original_amount=null;u.original_currency=null;}}}
      if(!pa)u.account_id=$("ea").value;if($("eh")&&$("ea").value===t.account_id)u.card_holder_id=$("eh").value;if($("ew"))u.wallet_id=$("ew").value;
      r=await sb.from("transactions").update(u).eq("id",t.id);
      if(!r.error&&pa&&$("eall").checked)
        r=await sb.from("transactions").update({category_id:u.category_id,description:desc}).eq("installment_group_id",t.installment_group_id);
      if(!r.error&&pa&&$("eh"))r=await sb.from("transactions").update({card_holder_id:$("eh").value}).eq("installment_group_id",t.installment_group_id);
      if(!r.error&&lo&&$("ea").value!==t.account_id)
        r=await sb.rpc("change_loan_account",{p_contract_id:lo.id,p_installment_number:t.installment_number,p_account_id:$("ea").value,p_following:$("efol").checked,p_set_default:false});
    }
    if(r.error){$("es").disabled=false;return $("emsg").textContent="Erro: "+r.error.message;}
    if(manFat&&$("efat")&&$("efat").checked&&date!==t.date&&$("ea").value===t.account_id){
      const r2=await sb.from("transactions").update({statement_month:t.statement_month}).eq("id",t.id);
      if(r2.error){$("es").disabled=false;return $("emsg").textContent="A data foi salva, mas não consegui manter a fatura de "+mlab(t.statement_month)+": "+r2.error.message+" Ajuste pelas setas na tela Fatura.";}}
    S.ed=null;go("list");};
}

async function viewPar(msg){
  if(msg===undefined)msg=S.pmsg;S.pmsg="";
  const {data,error}=await sb.from("transactions")
    .select("id,date,amount,currency,description,status,installment_number,installment_total,account_id,category_id,card_holder_id,categories(name),accounts(name)")
    .eq("installment_group_id",S.par).order("installment_number");
  if(error||!data||!data.length){S.par=null;return go(S.parFrom==="loans"?"loans":"list");}
  const lo=S.loans.find(l=>l.installment_group_id===S.par);
  const cur=data[0].currency.trim(),sign=data[0].amount<0?-1:1;
  const cents=t=>Math.round(Math.abs(t.amount)*100);
  const orig=data.reduce((s,t)=>s+cents(t),0);
  const have=new Set(data.map(t=>t.installment_number)),maxN=data[data.length-1].installment_number,ref=data[0],tot=ref.installment_total;
  const miss=[];for(let i=1;i<maxN;i++)if(!have.has(i))miss.push(i);
  const mx=maxN-1,pb=lo?Number(lo.paid_before)||0:0,drop=lo?Number(lo.monthly_drop)||0:0;
  const vOf=i=>Math.round((Math.abs(ref.amount)+(ref.installment_number-i)*drop)*100);
  const missTxt=()=>{const g=[];miss.forEach(i=>{const l=g[g.length-1];if(l&&l[1]===i-1)l[1]=i;else g.push([i,i]);});return g.map(([a,b])=>a===b?a:a+" a "+b).join(", ");};
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>${lo?"Parcelas do contrato":"Parcelas da compra"}</b>
   <div class="mu">${esc(lo?lo.name:(data[0].description||"Sem descrição"))} · ${esc(data[0].categories?.name||"—")} · ${esc(data[0].accounts?.name)}</div>
   ${lo?'<p class="mu">Valores previstos são estimativas. Corrija cada parcela com o valor e a data realmente cobrados pela instituição.</p>':""}
   ${data.map(t=>`<div class="row" style="display:block"><b>${t.installment_number}/${t.installment_total}</b>
     <span class="mu">${t.status==="planned"&&t.date>today()?"previsto":(lo?"paga":"lançada")}</span>
     <div style="display:flex;gap:8px"><input type="date" data-pd="${t.id}" value="${t.date}"><input data-pv="${t.id}" inputmode="decimal" value="${f2(t.amount)}"></div></div>`).join("")}
   <p id="ps" class="mu"></p>
   ${lo?"":'<button class="sec" id="pj">Ajustar última parcela para fechar o total original</button>'}
   <button class="pri" id="psv">Salvar parcelas</button>
   ${lo?"":'<button class="sec neg" id="pdel">Apagar compra inteira</button>'}
   <p id="pm" class="neg">${esc(msg||"")}</p>
   ${miss.length&&(!lo||pb>0)?`<div class="card" style="margin-top:12px"><b>Parcelas anteriores</b>
     <p class="mu">${lo?`Este contrato foi cadastrado com ${pb} parcela(s) já paga(s) que ainda não têm lançamento (nº ${esc(missTxt())} de ${tot}). Gere as que quiser para manter o histórico: usam a mesma conta, categoria e descrição da parcela ${ref.installment_number}/${tot}, ${drop>0?"com o valor subindo conforme a queda mensal do SAC":"com o mesmo valor dela"} e a data recuando mês a mês. As contagens de pagas e de faltantes do contrato não mudam.`
       :`Esta compra tem as parcelas ${esc(missTxt())} de ${tot} ainda não lançadas. Gere as que quiser para manter o histórico: usam a mesma conta, categoria, descrição, portador e o valor da parcela ${ref.installment_number}/${tot}, com a data recuando mês a mês.`}</p>
     <div style="display:flex;gap:8px"><label style="flex:1">De a nº<input id="pgf" type="number" min="1" max="${mx}" inputmode="numeric" value="${lo?miss[0]:miss[miss.length-1]}"></label>
     <label style="flex:1">Até a nº<input id="pgt" type="number" min="1" max="${mx}" inputmode="numeric" value="${miss[miss.length-1]}"></label></div>
     ${lo?'<p id="pgp" class="mu"></p>':""}
     <button class="sec" id="pgo">Gerar parcelas anteriores</button><p id="pgm" class="neg"></p></div>`:""}
   ${lo?"":`<p class="mu">Total original = soma das parcelas ao abrir esta tela (${fmt(orig/100,cur)}).</p>`}</div>`;
  const vals=()=>[...document.querySelectorAll("[data-pv]")].map(el=>Math.round(num(el.value)*100));
  const calc=()=>{const v=vals();if(v.some(x=>!(x>0))){$("ps").textContent="Há valor inválido.";return;}
    const s=v.reduce((a,b)=>a+b,0),d=s-orig;
    $("ps").textContent=lo?`Soma das parcelas: ${fmt(s/100,cur)}`
      :`Soma ${fmt(s/100,cur)} · original ${fmt(orig/100,cur)} · `+(d===0?"total confere ✓":`diferença ${d>0?"+":"-"}${fmt(Math.abs(d)/100,cur)}`);};
  document.querySelectorAll("[data-pv]").forEach(el=>el.oninput=calc);calc();
  $("bk").onclick=()=>go(S.parFrom==="loans"?"loans":"list");
  if($("pj"))$("pj").onclick=()=>{const els=[...document.querySelectorAll("[data-pv]")],v=vals();
    const resto=orig-v.slice(0,-1).reduce((a,b)=>a+b,0);
    if(!(resto>0))return $("pm").textContent="Não é possível: as outras parcelas já passam do total original.";
    els[els.length-1].value=f2(resto/100);$("pm").textContent="";calc();};
  $("psv").onclick=async()=>{
    const v=vals();
    if(v.some(x=>!(x>0)))return $("pm").textContent="Informe valores válidos em todas as parcelas.";
    const ds=[...document.querySelectorAll("[data-pd]")].map(el=>el.value);
    if(ds.some(d=>!d))return $("pm").textContent="Informe a data de todas as parcelas.";
    $("psv").disabled=true;let n=0;
    for(let i=0;i<data.length;i++){
      const t=data[i];
      if(v[i]===cents(t)&&ds[i]===t.date)continue;
      const {error}=await sb.from("transactions").update({amount:sign*v[i]/100,date:ds[i],status:ds[i]>today()?"planned":"posted"}).eq("id",t.id);
      if(error)return viewPar(`Erro na parcela ${t.installment_number}/${t.installment_total}: ${error.message}. A tela mostra o que está salvo.`);
      n++;}
    viewPar(n?`${n} parcela(s) salva(s) ✓`:"Nada foi alterado.");};
  const pgSel=()=>{const a=parseInt($("pgf").value),b=parseInt($("pgt").value);
    if(!(a>=1&&b>=a&&b<=mx))return null;return {a,b,nums:miss.filter(i=>i>=a&&i<=b)};};
  const pgPrev=()=>{const el=$("pgp");if(!el)return;const r=pgSel();
    if(!r||!r.nums.length){el.textContent="";return;}
    const sum=r.nums.reduce((s0,i)=>s0+vOf(i),0),f=r.nums[0],l=r.nums[r.nums.length-1];
    el.textContent=`Serão geradas ${r.nums.length} parcela(s) (estimativa): nº ${f} = ${fmt(vOf(f)/100,cur)}`+(l!==f?` até nº ${l} = ${fmt(vOf(l)/100,cur)}`:"")+` · soma ${fmt(sum/100,cur)}.`;};
  if($("pgo")){["pgf","pgt"].forEach(k=>$(k).oninput=pgPrev);pgPrev();}
  if($("pgo"))$("pgo").onclick=async()=>{
    const r=pgSel();
    if(!r)return $("pgm").textContent=`Informe um intervalo entre 1 e ${mx} (De não pode passar de Até).`;
    const nums=r.nums,a=r.a,b=r.b;
    if(!nums.length)return $("pgm").textContent="Nada a gerar: essas parcelas já existem.";
    if(lo){
      if(nums.length>pb)return $("pgm").textContent=`O contrato tem só ${pb} parcela(s) anterior(es) sem lançamento.`;
      const sum=nums.reduce((s0,i)=>s0+vOf(i),0);
      if(!confirm(`Gerar ${nums.length} parcela(s) anterior(es) (nº ${nums.join(", ")}), somando cerca de ${fmt(sum/100,cur)}?\n\nElas entram como PAGAS na conta "${ref.accounts?.name||"do contrato"}" e mudam o saldo dela, o Resultado e as metas dos meses em que caem. Se você já lançou esses pagamentos como despesas comuns, vai duplicar.`))return;
      $("pgo").disabled=true;
      const {data:ng,error}=await sb.rpc("generate_previous_loan_installments",{p_contract_id:lo.id,p_from:a,p_to:b});
      if(error){$("pgo").disabled=false;return $("pgm").textContent="Erro: "+error.message;}
      await loadLoans();
      return viewPar(`${ng} parcela(s) anterior(es) gerada(s) ✓. Confira datas e valores abaixo e corrija o que o banco realmente cobrou.`);
    }
    const vv=Math.abs(ref.amount),gid=S.par;
    const rows=nums.map(i=>{const d=dAdd(ref.date,i-ref.installment_number);
      return {account_id:ref.account_id,date:d,amount:sign*vv,category_id:ref.category_id,description:ref.description,status:d>today()?"planned":"posted",
        installment_group_id:gid,installment_number:i,installment_total:tot,card_holder_id:ref.card_holder_id};});
    $("pgo").disabled=true;
    const {error}=await sb.from("transactions").insert(rows);
    if(error){$("pgo").disabled=false;return $("pgm").textContent="Erro: "+error.message;}
    viewPar(`${rows.length} parcela(s) anterior(es) gerada(s) ✓ (${nums.join(", ")}). Confira datas e valores abaixo.`);};
  if($("pdel"))$("pdel").onclick=async()=>{
    if(!confirm(`Apagar a compra inteira (${data.length} parcelas)? Isso não pode ser desfeito.`))return;
    const {error}=await sb.from("transactions").delete().eq("installment_group_id",S.par);
    if(error)return $("pm").textContent="Erro: "+error.message;
    S.par=null;go("list");};
}


