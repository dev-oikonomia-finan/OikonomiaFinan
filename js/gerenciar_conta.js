/* ================= GERENCIAR CONTA ================= */
async function viewAcm(){
  const a=S.accounts.find(x=>x.id===S.acmId);if(!a){S.acmId=null;return go("acc");}
  const {data:bl}=await sb.from("account_balances").select("balance").eq("account_id",a.id).maybeSingle();
  if(S.tab!=="acm")return;
  const bal=Number((bl||{}).balance||0),cur=a.currency.trim();
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Gerenciar conta</b> <span class="mu">${TYPES[a.type]} · ${esc(cur)}</span>
   <label>Nome<input id="an2" value="${esc(a.name)}"></label>
   <button class="pri" id="as">Salvar nome</button>
   <div class="row" style="margin-top:14px"><span>Saldo atual</span><b>${fmt(bal,cur)}</b></div>
   ${(a.type==="checking"||a.type==="cash")&&cur==="BRL"?`<div class="card" style="margin-top:12px"><b>Saldo inicial</b>
     <label>Saldo no extrato<input id="aob" inputmode="decimal" placeholder="0,00" value="${a.opening_balance==null?"":fa(a.opening_balance)}"></label>
     <label>Na data (último dia de um mês)<input type="date" id="aod" value="${a.opening_date||""}"></label>
     <button class="sec" id="aos">Salvar saldo inicial</button>${a.opening_date?'<button class="x" id="aoc" style="margin-top:8px">Remover saldo inicial</button>':""}
     <p class="mu">Informe o saldo do extrato no último dia de um mês (ex.: 31/12/2025). Os lançamentos até essa data continuam visíveis e contam no Resultado, mas não somam no saldo. Use a mesma data em todas as contas. Para mudar a data de uma conta com fechamentos, reabra antes os fechamentos posteriores.</p></div>`:""}
   ${a.type==="checking"||a.type==="cash"?`<div class="card" style="margin-top:12px"><b>Grupo internacional</b>
     <label>Nome do grupo<input id="agn" list="agl2" placeholder="Ex.: ARQ Internacional" value="${esc((a.group_name||"").trim())}"></label><datalist id="agl2">${grpNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
     <button class="sec" id="agsv">Salvar grupo</button>
     <p class="mu">Use o MESMO nome na conta em reais e na conta em dólar do mesmo banco. Em Contas elas aparecem juntas e, em Transferir e Internacional, o app sabe qual é a conta em reais do banco. Só pode haver uma conta ativa por moeda em cada grupo. Deixe vazio para tirar do grupo.</p></div>`:""}
   ${a.type==="credit_card"?`<div class="card" style="margin-top:12px"><b>Mês de partida da dívida</b>
     <label>A partir de<input type="month" id="asm" value="${a.start_month?a.start_month.slice(0,7):""}"></label>
     <button class="sec" id="asv">Salvar partida</button>
     <p class="mu">Só entram no saldo e na dívida do Painel as faturas deste mês em diante (compras e pagamentos). As anteriores continuam visíveis em Lançamentos e na Fatura. Deixe vazio para somar tudo.</p></div>`:""}
   <button class="sec neg" id="ai">Inativar conta</button><p id="am" class="neg"></p>
   <p class="mu">Inativar esconde a conta das telas e do saldo geral; os lançamentos ficam guardados e você pode reativar em Contas. Só é possível com saldo zerado${a.type==="credit_card"?" (cartão sem dívida)":""}.</p></div>`;
  if(a.type==="benefit"){await loadWallets();if(S.tab!=="acm")return;drawWal(a,WALMSG);WALMSG="";}
  const say=t=>{$("am").textContent=t;};
  $("bk").onclick=()=>go("acc");
  $("as").onclick=async()=>{const n=$("an2").value.trim();
    if(!n)return say("Informe o nome da conta.");
    if(S.accounts.some(x=>x.id!==a.id&&x.name.trim().toLowerCase()===n.toLowerCase()))return say("Já existe uma conta com esse nome.");
    const {error}=await sb.from("accounts").update({name:n}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);
    await loadRef();go("acc");};
  if($("aos"))$("aos").onclick=async()=>{const v=num($("aob").value),d=$("aod").value;
    if(isNaN(v))return say("Informe o saldo do extrato.");
    if(!d)return say("Informe a data do saldo.");
    const nx=new Date(d+"T12:00:00");nx.setDate(nx.getDate()+1);
    if(nx.getDate()!==1)return say("Use o último dia de um mês (ex.: 31/08/2026).");
    const {error}=await sb.from("accounts").update({opening_balance:v,opening_date:d}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);await loadRef();viewAcm();};
  if($("aoc"))$("aoc").onclick=async()=>{if(!confirm("Remover o saldo inicial desta conta?"))return;
    const {error}=await sb.from("accounts").update({opening_balance:null,opening_date:null}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);await loadRef();viewAcm();};
  if($("agsv"))$("agsv").onclick=async()=>{const g=$("agn").value.trim(),{error}=await sb.from("accounts").update({group_name:g||null}).eq("id",a.id);
    if(error)return say(error.message.includes("accounts_group_uq")?"Já existe, neste grupo, uma conta ativa nesta moeda.":"Erro: "+error.message);await loadRef();viewAcm();};
  if($("asv"))$("asv").onclick=async()=>{const v=$("asm").value,{error}=await sb.from("accounts").update({start_month:v?v+"-01":null}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);await loadRef();viewAcm();};
  $("ai").onclick=async()=>{
    if(Math.abs(bal)>=0.005)return say(`O saldo é ${fmt(bal,cur)}. Zere antes de inativar (transferência ou ajuste).`);
    if(!confirm(`Inativar a conta "${a.name}"?`))return;
    const {error}=await sb.from("accounts").update({is_active:false}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);
    S.acmId=null;await loadRef();go("acc");};
}

let WALMSG="";
function drawWal(a,m){
  const cur=a.currency.trim(),act=S.wallets.filter(w=>w.account_id===a.id&&w.is_active),ina=S.wallets.filter(w=>w.account_id===a.id&&!w.is_active);
  const mo=sel=>'<option value="">Todo mês</option>'+MESES.map((x,i)=>`<option value="${i+1}" ${+sel===i+1?"selected":""}>${x[0].toUpperCase()+x.slice(1)}</option>`).join("");
  $("main").insertAdjacentHTML("beforeend",`<div class="card" id="wcard"><b>Carteiras</b><div class="mu">O saldo da conta é a soma das carteiras.</div>
   <div class="mu">Saldo inicial: informe o saldo do extrato da carteira no último dia de um mês (ex.: 30/09/2026). Os lançamentos até essa data continuam visíveis, mas não somam; o saldo passa a ser o inicial mais os lançamentos depois da data. Não vira receita.</div>
   ${act.map(w=>`<div style="padding:10px 0;border-bottom:1px solid var(--bd)"><div class="row" style="border:0;padding:0"><input data-wn="${w.id}" value="${esc(w.name)}"><b style="white-space:nowrap;margin-left:8px;align-self:center">${fmt(S.wbal[w.id]||0,cur)}</b></div>
     <div style="display:flex;gap:8px"><label style="flex:1">Valor esperado<input data-we="${w.id}" inputmode="decimal" placeholder="0,00" value="${fa(w.expected_amount)}"></label><label style="flex:1">Cai em<select data-wm="${w.id}">${mo(w.credit_month)}</select></label></div>
     <div style="display:flex;gap:8px"><label style="flex:1">Saldo inicial<input data-wob="${w.id}" inputmode="decimal" placeholder="0,00" value="${fa(w.opening_balance)}"></label><label style="flex:1">Na data<input type="date" data-wod="${w.id}" value="${w.opening_date||""}"></label></div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button class="x" data-wos="${w.id}" style="margin:0">Salvar saldo inicial</button>${w.opening_date?`<button class="x" data-woc="${w.id}" style="margin:0">Remover</button>`:""}<button class="x" data-wi="${w.id}" style="margin:0 0 0 auto">Inativar</button></div></div>`).join("")||'<p class="mu">Nenhuma carteira ainda.</p>'}
   <b style="display:block;margin-top:14px">Nova carteira</b>
   <label>Nome<input id="wnn" placeholder="Ex.: Refeição e Alimentação"></label>
   <div style="display:flex;gap:8px"><label style="flex:1">Valor esperado<input id="wne" inputmode="decimal" placeholder="0,00"></label><label style="flex:1">Cai em<select id="wnm">${mo("")}</select></label></div>
   <button class="sec" id="wadd">Adicionar carteira</button><p id="wmsg" class="${m?"pos":"neg"}">${esc(m||"")}</p>
   ${ina.length?`<details><summary>Carteiras inativas (${ina.length})</summary>${ina.map(w=>`<div class="row"><span>${esc(w.name)}</span><button class="x" data-wr="${w.id}">Reativar</button></div>`).join("")}</details>`:""}</div>`);
  const say=t=>{$("wmsg").className="neg";$("wmsg").textContent=t;};
  const redo=async t=>{await loadWallets();$("wcard").remove();drawWal(a,t);};
  const err=e=>e.message.includes("wallets_acc_name_uq")?"Já existe uma carteira ativa com esse nome.":"Erro: "+e.message;
  const dup=(n,except)=>S.wallets.some(w=>w.account_id===a.id&&w.is_active&&w.id!==except&&w.name.trim().toLowerCase()===n.toLowerCase());
  const upd=async(id,patch,t)=>{const {error}=await sb.from("wallets").update(patch).eq("id",id);if(error)return say(err(error));await redo(t);};
  document.querySelectorAll("[data-wn]").forEach(el=>el.onchange=()=>{const n=el.value.trim();
    if(!n)return say("Informe o nome da carteira.");if(dup(n,el.dataset.wn))return say("Já existe uma carteira ativa com esse nome.");upd(el.dataset.wn,{name:n},"Nome salvo ✓");});
  document.querySelectorAll("[data-we]").forEach(el=>el.onchange=()=>{const s=el.value.trim(),v=s?num(s):null;
    if(s&&!(v>0))return say("Valor esperado inválido.");upd(el.dataset.we,{expected_amount:v},"Valor salvo ✓");});
  document.querySelectorAll("[data-wm]").forEach(el=>el.onchange=()=>upd(el.dataset.wm,{credit_month:el.value?+el.value:null},"Mês salvo ✓"));
  const lastDay=d=>{const nx=new Date(d+"T12:00:00");nx.setDate(nx.getDate()+1);return nx.getDate()===1;};
  document.querySelectorAll("[data-wos]").forEach(b=>b.onclick=async()=>{const id=b.dataset.wos,s0=document.querySelector(`[data-wob="${id}"]`).value,d=document.querySelector(`[data-wod="${id}"]`).value,v=s0.trim()?num(s0):NaN;
    if(isNaN(v))return say("Informe o saldo do extrato da carteira.");
    if(!d)return say("Informe a data do saldo.");
    if(!lastDay(d))return say("Use o último dia de um mês (ex.: 30/09/2026).");
    const {error}=await sb.from("wallets").update({opening_balance:v,opening_date:d}).eq("id",id);
    if(error)return say(err(error));
    WALMSG="Saldo inicial salvo ✓";await loadRef();viewAcm();});
  document.querySelectorAll("[data-woc]").forEach(b=>b.onclick=async()=>{if(!confirm("Remover o saldo inicial desta carteira?"))return;
    const {error}=await sb.from("wallets").update({opening_balance:null,opening_date:null}).eq("id",b.dataset.woc);
    if(error)return say(err(error));
    WALMSG="Saldo inicial removido ✓";await loadRef();viewAcm();});
  document.querySelectorAll("[data-wi]").forEach(b=>b.onclick=()=>{const id=b.dataset.wi,bal=S.wbal[id]||0;
    if(Math.abs(bal)>=0.005)return say(`O saldo é ${fmt(bal,cur)}. Só é possível inativar carteira com saldo zero.`);
    if(!confirm("Inativar esta carteira?"))return;upd(id,{is_active:false},"Carteira inativada ✓");});
  document.querySelectorAll("[data-wr]").forEach(b=>b.onclick=()=>{if(dup(S.wallets.find(w=>w.id===b.dataset.wr).name,b.dataset.wr))return say("Já existe uma carteira ativa com esse nome.");upd(b.dataset.wr,{is_active:true},"Carteira reativada ✓");});
  $("wadd").onclick=async()=>{const n=$("wnn").value.trim(),s=$("wne").value.trim(),v=s?num(s):null;
    if(!n)return say("Informe o nome da carteira.");if(dup(n))return say("Já existe uma carteira ativa com esse nome.");
    if(s&&!(v>0))return say("Valor esperado inválido.");
    const {error}=await sb.from("wallets").insert({household_id:S.hid,account_id:a.id,name:n,expected_amount:v,credit_month:$("wnm").value?+$("wnm").value:null});
    if(error)return say(err(error));await redo("Carteira criada ✓");};
}

