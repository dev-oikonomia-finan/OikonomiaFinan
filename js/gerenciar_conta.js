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
   <div class="card" style="margin-top:12px"><b>Instituição</b>
     <label>Banco ou emissor<input id="ainst" list="ainl2" maxlength="60" placeholder="Ex.: Itaú, Nubank, CEF" value="${esc((a.institution||"").trim())}"></label><datalist id="ainl2">${instNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
     <button class="sec" id="ainsv">Salvar instituição</button>
     <p class="mu">Contas com a mesma instituição aparecem juntas em Contas e no Relatório do mês, com o total em reais (ex.: Itaú corrente, poupança e os cartões emitidos pelo Itaú). Não muda saldos, transferências nem o grupo internacional. Deixe vazio para tirar.</p></div>
   ${(a.type==="checking"||a.type==="cash")&&cur==="BRL"?`<div class="card" style="margin-top:12px"><b>Saldo inicial</b>
     <label>Saldo no extrato<input id="aob" inputmode="decimal" placeholder="0,00" value="${a.opening_balance==null?"":fa(a.opening_balance)}"></label>
     <label>Na data (último dia de um mês)<input type="date" id="aod" value="${a.opening_date||""}"></label>
     <button class="sec" id="aos">Salvar saldo inicial</button>${a.opening_date?'<button class="x" id="aoc" style="margin-top:8px">Remover saldo inicial</button>':""}
     <p class="mu">Informe o saldo do extrato no último dia de um mês (ex.: 31/12/2025). Os lançamentos até essa data continuam visíveis e contam no Resultado, mas não somam no saldo. Use a mesma data em todas as contas. Para mudar a data de uma conta com fechamentos, reabra antes os fechamentos posteriores.</p></div>`:""}
   ${(a.type==="checking"||a.type==="cash")&&cur!=="BRL"?`<div class="card" style="margin-top:12px"><b>Saldo inicial</b>
     ${a.opening_date?`<div class="row"><span class="mu">Gravado em ${fdt(a.opening_date)}</span><span style="text-align:right">${fmt(a.opening_balance,cur)}<div class="mu">custo ${fmt(a.opening_cost,"BRL")}${Number(a.opening_balance)>0?" · médio "+fx4(a.opening_cost/a.opening_balance)+" por 1 "+esc(cur):""}</div></span></div>`:""}
     <label>Saldo no extrato (${esc(cur)})<input id="aob" inputmode="decimal" placeholder="0,00" value="${a.opening_balance==null?"":fa(a.opening_balance)}"></label>
     <label>Na data (último dia de um mês)<input type="date" id="aod" value="${a.opening_date||""}"></label>
     <label>Total pago em reais nas conversões até a data<input id="aor" inputmode="decimal" placeholder="0,00"></label>
     <label>Total recebido em ${esc(cur)} nessas conversões<input id="aoq" inputmode="decimal" placeholder="0,00"></label>
     <p id="aop" class="mu"></p>
     <button class="sec" id="aos">Salvar saldo inicial</button>${a.opening_date?'<button class="x" id="aoc" style="margin-top:8px">Remover saldo inicial</button>':""}
     <p class="mu">O custo do saldo é o saldo × (total pago ÷ total recebido): se você gastou parte dos ${esc(cur)} antes da data, o custo é proporcional ao que sobrou. Os lançamentos até a data continuam visíveis, mas não somam no saldo nem no custo médio; o saldo inicial não vira receita. ${a.opening_date?"Para mudar só a data, deixe os totais vazios: o custo gravado é mantido se o saldo não mudar. ":""}Para mudar com fechamentos posteriores, reabra-os antes.</p></div>`:""}
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
  if(a.type==="pension"||a.type==="fgts"){await drawParts(a,PARTMSG);PARTMSG="";if(S.tab!=="acm")return;}
  const say=t=>{$("am").textContent=t;};
  $("bk").onclick=()=>go("acc");
  $("as").onclick=async()=>{const n=$("an2").value.trim();
    if(!n)return say("Informe o nome da conta.");
    if(S.accounts.some(x=>x.id!==a.id&&x.name.trim().toLowerCase()===n.toLowerCase()))return say("Já existe uma conta com esse nome.");
    const {error}=await sb.from("accounts").update({name:n}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);
    await loadRef();go("acc");};
  /* moeda estrangeira: custo do saldo = saldo × (total pago em reais ÷ total recebido na moeda) */
  const fgo=cur!=="BRL",tot=()=>{const r=$("aor").value.trim(),q=$("aoq").value.trim();return {r:r?num(r):null,q:q?num(q):null};};
  const aop=()=>{if(!$("aop"))return;const v=num($("aob").value||""),T=tot();
    if(!(T.r>0&&T.q>0)){$("aop").textContent="";return;}
    const md=T.r/T.q;
    $("aop").textContent=`Custo médio ${fx4(md)} por 1 ${cur}`+(v>=0?` · custo do saldo inicial ${fmt(Math.round(v*md*100)/100,"BRL")}`:"")+(v>T.q+1e-9?` · ⚠️ o saldo é maior que o total recebido; confira se faltou alguma entrada.`:"");};
  if(fgo&&$("aor"))["aob","aor","aoq"].forEach(i=>$(i).oninput=aop);
  if($("aos"))$("aos").onclick=async()=>{const v=num($("aob").value),d=$("aod").value;
    if(isNaN(v))return say("Informe o saldo do extrato.");
    if(fgo&&v<0)return say("O saldo em moeda estrangeira não pode ser negativo.");
    if(!d)return say("Informe a data do saldo.");
    const nx=new Date(d+"T12:00:00");nx.setDate(nx.getDate()+1);
    if(nx.getDate()!==1)return say("Use o último dia de um mês (ex.: 31/08/2026).");
    const row={opening_balance:v,opening_date:d};
    if(fgo){const T=tot();
      if(T.r!==null||T.q!==null){
        if(!(T.r>0&&T.q>0))return say("Informe os dois totais das conversões (reais pagos e moeda recebida), maiores que zero.");
        row.opening_cost=Math.round(v*T.r/T.q*100)/100;}
      else if(v===0)row.opening_cost=0;
      else if(a.opening_cost!=null&&Number(a.opening_balance)===v)row.opening_cost=Number(a.opening_cost);
      else return say("Informe o total pago em reais e o total recebido nas conversões, para calcular o custo do saldo.");}
    $("aos").disabled=true;
    const {error}=await sb.from("accounts").update(row).eq("id",a.id);
    if(error){$("aos").disabled=false;return say("Erro: "+error.message);}await loadRef();viewAcm();};
  if($("aoc"))$("aoc").onclick=async()=>{if(!confirm("Remover o saldo inicial desta conta?"))return;
    const {error}=await sb.from("accounts").update(fgo?{opening_balance:null,opening_date:null,opening_cost:null}:{opening_balance:null,opening_date:null}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);await loadRef();viewAcm();};
  if($("agsv"))$("agsv").onclick=async()=>{const g=$("agn").value.trim(),{error}=await sb.from("accounts").update({group_name:g||null}).eq("id",a.id);
    if(error)return say(error.message.includes("accounts_group_uq")?"Já existe, neste grupo, uma conta ativa nesta moeda.":"Erro: "+error.message);await loadRef();viewAcm();};
  $("ainsv").onclick=async()=>{let v=$("ainst").value.trim();
    /* mesma grafia de uma instituição já usada (ex.: "itau" → "Itaú" só se for igual sem maiúsculas) */
    const ex=instNames().find(n=>n.toLowerCase()===v.toLowerCase());if(ex)v=ex;
    const {error}=await sb.from("accounts").update({institution:v||null}).eq("id",a.id);
    if(error)return say("Erro: "+error.message+(/institution/.test(error.message)?" (rode o script instituicao.sql no Supabase)":""));await loadRef();viewAcm();};
  if($("asv"))$("asv").onclick=async()=>{const v=$("asm").value,{error}=await sb.from("accounts").update({start_month:v?v+"-01":null}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);await loadRef();viewAcm();};
  $("ai").onclick=async()=>{
    if(Math.abs(bal)>=0.005)return say(`O saldo é ${fmt(bal,cur)}. Zere antes de inativar (transferência ou ajuste).`);
    if(!confirm(`Inativar a conta "${a.name}"?`))return;
    const {error}=await sb.from("accounts").update({is_active:false}).eq("id",a.id);
    if(error)return say("Erro: "+error.message);
    S.acmId=null;await loadRef();go("acc");};
}

/* ===== Partes de Previdência e FGTS (03/11/2026): saldo informado por data, sem lançamentos ===== */
let PARTMSG="";
async function drawParts(a,m){
  const [pr,br]=await Promise.all([sb.from("account_parts").select("id,name,only_dismissal,is_active,created_at").eq("account_id",a.id).order("created_at"),
    sb.from("account_part_balances").select("id,part_id,date,value").eq("household_id",S.hid).order("date",{ascending:false}).limit(2000)]);
  if(S.tab!=="acm")return;
  const el=document.createElement("div");el.className="card";el.id="pcard";$("main").appendChild(el);
  if(pr.error){el.innerHTML=`<b>Partes da conta</b><p class="neg">${esc(pr.error.message)}</p><p class="mu">Se a tabela não existe, rode o script previdencia_partes.sql no Supabase.</p>`;return;}
  const P=pr.data||[],act=P.filter(p=>p.is_active),ina=P.filter(p=>!p.is_active),ids=new Set(P.map(p=>p.id)),BAL=(br.data||[]).filter(b=>ids.has(b.part_id)),hj=today();
  const last=id=>BAL.find(b=>b.part_id===id&&b.date<=hj)||null;
  const pm=today().slice(0,8)+"01",dDef=(()=>{const e=new Date(pm+"T12:00:00");e.setDate(e.getDate()-1);return e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0");})();
  const valOn=(id,d)=>{const b=BAL.find(x=>x.part_id===id&&x.date===d)||BAL.find(x=>x.part_id===id&&x.date<=d);return b?fa(b.value):"";};
  const dates=[...new Set(BAL.map(b=>b.date))].sort().reverse();
  const fgts=a.type==="fgts",ex=fgts?"Ex.: Saldo FGTS, Multa estimada (40%)":"Ex.: Participante, Empresa";
  el.innerHTML=`<b>Partes da conta</b><div class="mu">O saldo da conta é a soma do último saldo informado de cada parte ativa (datas futuras não contam). Atualize no fim do mês com o extrato; não vira receita nem lançamento. Resgatável = o que você leva em qualquer saída (ex.: Participante); potencial = o que depende da forma de saída (ex.: Empresa, FGTS, multa estimada).${fgts?" No FGTS, o valor potencial é a multa: as opções \"− multa FGTS\" do Painel deixam de fora as partes marcadas como Valor potencial.":""}</div>
    ${act.map(p=>{const l=last(p.id);return `<div style="padding:10px 0;border-bottom:1px solid var(--bd)"><div class="row" style="border:0;padding:0"><input data-pn="${p.id}" value="${esc(p.name)}"><b style="white-space:nowrap;margin-left:8px;align-self:center">${mm(l?l.value:0)}</b></div>
      <div class="row" style="border:0;padding:4px 0 0"><label class="ck" style="margin:0"><input type="checkbox" data-pd="${p.id}" ${p.only_dismissal?"checked":""}> Valor potencial</label><span class="mu">${l?"em "+fdt(l.date):"sem saldo informado"}</span></div>
      <div style="text-align:right"><button class="x" data-pi="${p.id}">Inativar</button></div></div>`;}).join("")||'<p class="mu">Nenhuma parte ainda. Sem partes, a conta usa os lançamentos, como as demais.</p>'}
    <b style="display:block;margin-top:14px">Nova parte</b>
    <label>Nome<input id="pnn" placeholder="${ex}"></label>
    <label class="ck"><input type="checkbox" id="pnd"> Valor potencial</label>
    <button class="sec" id="padd">Adicionar parte</button>
    ${act.length?`<b style="display:block;margin-top:14px">Atualizar saldos</b>
    <label>Data do extrato<input type="date" id="pdt2" value="${dDef}"></label>
    ${act.map(p=>`<label>${esc(p.name)}${p.only_dismissal?' <span class="mu">(potencial)</span>':' <span class="mu">(resgatável)</span>'}<input data-pv="${p.id}" inputmode="decimal" placeholder="0,00" value="${valOn(p.id,dDef)}"></label>`).join("")}
    <p id="ptot" class="mu"></p><button class="pri" id="psave">Salvar saldos</button>`:""}
    <p id="pmsg" class="${m?"pos":"neg"}">${esc(m||"")}</p>
    ${dates.length?`<details><summary>Histórico (${dates.length} data${dates.length>1?"s":""})</summary>${dates.slice(0,36).map(d=>{const L=BAL.filter(b=>b.date===d),t=L.reduce((x,b)=>x+Number(b.value),0);
      return `<div class="row"><div><b>${fdt(d)}</b><div class="mu">${L.map(b=>esc((P.find(p=>p.id===b.part_id)||{}).name||"Parte")+" "+mm(b.value)).join(" · ")}</div></div><div style="white-space:nowrap">${mm(t)}<button class="x" data-ph="${d}" title="Apagar os saldos desta data">✕</button></div></div>`;}).join("")}</details>`:""}
    ${ina.length?`<details><summary>Partes inativas (${ina.length})</summary>${ina.map(p=>`<div class="row"><span>${esc(p.name)}</span><button class="x" data-pr="${p.id}">Reativar</button></div>`).join("")}</details>`:""}`;
  const say=t=>{$("pmsg").className="neg";$("pmsg").textContent=t;};
  const redo=async t=>{PARTMSG=t;await loadRef();viewAcm();};
  const err=e=>e.message.includes("account_parts_name_uq")?"Já existe uma parte ativa com esse nome.":"Erro: "+e.message;
  const tot=()=>{if(!$("ptot"))return;let t=0,o=0;document.querySelectorAll("[data-pv]").forEach(i=>{const v=num(i.value||"")||0,p=act.find(z=>z.id===i.dataset.pv);t+=v;if(p&&!p.only_dismissal)o+=v;});
    $("ptot").textContent=`Total ${mm(t)} · resgatável ${mm(o)} · potencial ${mm(t-o)}`;};
  document.querySelectorAll("[data-pv]").forEach(i=>i.oninput=tot);tot();
  if($("pdt2"))$("pdt2").onchange=()=>{const d=$("pdt2").value;document.querySelectorAll("[data-pv]").forEach(i=>{i.value=valOn(i.dataset.pv,d);});tot();};
  document.querySelectorAll("[data-pn]").forEach(i=>i.onchange=async()=>{const n=i.value.trim();if(!n)return say("Informe o nome da parte.");
    const {error}=await sb.from("account_parts").update({name:n}).eq("id",i.dataset.pn);if(error)return say(err(error));redo("Nome salvo ✓");});
  document.querySelectorAll("[data-pd]").forEach(i=>i.onchange=async()=>{const {error}=await sb.from("account_parts").update({only_dismissal:i.checked}).eq("id",i.dataset.pd);if(error)return say(err(error));redo("Parte atualizada ✓");});
  document.querySelectorAll("[data-pi]").forEach(b=>b.onclick=async()=>{const l=last(b.dataset.pi);
    if(!confirm(`Inativar esta parte?${l&&Number(l.value)?` O saldo dela (${mm(l.value)}) deixa de somar na conta.`:""} O histórico fica guardado.`))return;
    const {error}=await sb.from("account_parts").update({is_active:false}).eq("id",b.dataset.pi);if(error)return say(err(error));redo("Parte inativada ✓");});
  document.querySelectorAll("[data-pr]").forEach(b=>b.onclick=async()=>{const {error}=await sb.from("account_parts").update({is_active:true}).eq("id",b.dataset.pr);if(error)return say(err(error));redo("Parte reativada ✓");});
  $("padd").onclick=async()=>{const n=$("pnn").value.trim();if(!n)return say("Informe o nome da parte.");
    if(act.some(p=>p.name.trim().toLowerCase()===n.toLowerCase()))return say("Já existe uma parte ativa com esse nome.");
    const {error}=await sb.from("account_parts").insert({household_id:S.hid,account_id:a.id,name:n,only_dismissal:$("pnd").checked});if(error)return say(err(error));redo("Parte criada ✓");};
  if($("psave"))$("psave").onclick=async()=>{const d=$("pdt2").value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||+d.slice(0,4)<1900)return say("Informe a data do extrato.");
    const rows=[];let bad=false;document.querySelectorAll("[data-pv]").forEach(i=>{const s0=i.value.trim();if(!s0)return;const v=num(s0);if(!(v>=0)||Math.round(v*100)/100!==v)bad=true;else rows.push({household_id:S.hid,part_id:i.dataset.pv,date:d,value:v});});
    if(bad)return say("Valor inválido (zero ou maior, até 2 casas).");if(!rows.length)return say("Informe o saldo de ao menos uma parte.");
    $("psave").disabled=true;const {error}=await sb.from("account_part_balances").upsert(rows,{onConflict:"part_id,date"});
    if(error){$("psave").disabled=false;return say(err(error));}redo(`Saldos de ${fdt(d)} salvos ✓`+(d>today()?" (data futura: só conta a partir dela)":""));};
  document.querySelectorAll("[data-ph]").forEach(b=>b.onclick=async()=>{const d=b.dataset.ph;if(!confirm(`Apagar os saldos de ${fdt(d)} de todas as partes desta conta?`))return;
    const {error}=await sb.from("account_part_balances").delete().eq("date",d).in("part_id",[...ids]);if(error)return say(err(error));redo("Saldos apagados ✓");});
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

