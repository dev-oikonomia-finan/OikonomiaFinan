/* ================= FATURA DO CARTÃO ================= */
async function viewFat(){
  const cards=S.accounts.filter(a=>a.type==="credit_card");
  if(!cards.length){$("main").innerHTML='<div class="card"><button class="lk" id="bk">← Voltar</button> Nenhum cartão cadastrado. Crie uma conta do tipo Cartão de crédito em Contas.</div>';$("bk").onclick=()=>go("acc");return;}
  if(!cards.some(a=>a.id===S.fatAcc))S.fatAcc=cards[0].id;
  const acc=cards.find(a=>a.id===S.fatAcc),cc=S.cards.find(c=>c.account_id===acc.id),cur=acc.currency.trim();
  if(!S.fatMon)S.fatMon=cc?stm(cc,today()):today().slice(0,8)+"01";
  const m=S.fatMon;
  const {data,error}=await sb.from("transactions").select("id,card_holder_id,date,amount,description,status,installment_number,installment_total,transfer_group_id,categories(name)").eq("account_id",acc.id).eq("statement_month",m).order("date");
  if(S.tab!=="fat"||S.fatAcc!==acc.id||S.fatMon!==m)return;
  if(error){$("main").innerHTML=`<div class="card neg">${esc(error.message)}</div>`;return;}
  const buy=data.filter(t=>!t.transfer_group_id),pay=data.filter(t=>t.transfer_group_id);
  const total=-buy.reduce((r,t)=>r+Number(t.amount),0),paid=pay.reduce((r,t)=>r+Number(t.amount),0),rest=Math.round((total-paid)*100)/100;
  const pa=S.accounts.filter(a=>a.type!=="credit_card");
  const H=holdersOf(acc.id),totH=id=>-buy.filter(t=>t.card_holder_id===id).reduce((r,t)=>r+Number(t.amount),0),sh=H.some(h=>h.id===S.fatH)?S.fatH:null,vis=sh?buy.filter(t=>t.card_holder_id===sh):buy;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Fatura do cartão</b>
   <label>Cartão<select id="fc">${cards.map(a=>`<option value="${a.id}" ${a.id===acc.id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   <div class="row" style="align-items:center"><button class="x" id="fp">‹</button><b>${mlab(m)}</b><button class="x" id="fn">›</button></div>
   ${cc?`<div class="mu">Fecha dia ${cc.closing_day} · vence dia ${cc.due_day}</div>`:'<p class="neg">Cartão sem configuração: informe os dias em "Configurar cartão".</p>'}
   <div class="row"><span>Total da fatura</span><b>${fmt(total,cur)}</b></div>
   <div class="row"><span>Já pago</span><span class="pos">${fmt(paid,cur)}</span></div>
   <div class="row"><span>Falta pagar</span><b class="${rest>0?"neg":"pos"}">${fmt(rest,cur)}</b></div>
   ${H.length>1?`<div class="chips"><button data-fh="" class="${sh?"":"on"}">Todos</button>${H.map(h=>`<button data-fh="${h.id}" class="${sh===h.id?"on":""}">${esc(h.name)} ${fmt(totH(h.id),cur)}</button>`).join("")}</div>`:""}
   ${rest>0?'<button class="pri" id="fpay">Pagar fatura</button>':""}
   <button class="sec" id="fcc">🔒 Fechar esta fatura</button></div>
  <div class="card"><b>Lançamentos da fatura</b>${vis.length?vis.map(t=>`<div class="row"><div><div>${esc(t.description||t.categories?.name||"Sem descrição")}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div><div class="mu">${fdt(t.date)}${H.length>1&&t.card_holder_id?" · "+esc(holderName(t.card_holder_id)):""}${t.status==="planned"&&t.date>today()?" · previsto":""}</div></div>
    <div style="text-align:right;white-space:nowrap"><span class="${t.amount<0?"neg":"pos"}">${fmt(t.amount,cur)}</span><button class="x" data-mv="${t.id}|-1">‹</button><button class="x" data-mv="${t.id}|1">›</button></div></div>`).join(""):'<p class="mu">Nenhum lançamento nesta fatura.</p>'}
   <p class="mu">As setas ‹ › movem a compra para a fatura anterior ou a seguinte (ex.: compra no dia do fechamento).</p></div>
  <div class="card"><details ${cc?"":"open"}><summary>⚙ Configurar cartão</summary>
   <label>Dia de fechamento<input id="fcl" type="number" min="1" max="31" value="${cc?cc.closing_day:""}"></label>
   <label>Dia de vencimento<input id="fdu" type="number" min="1" max="31" value="${cc?cc.due_day:""}"></label>
   <label>Conta sugerida para pagar<select id="fpa"><option value="">(nenhuma)</option>${pa.map(a=>`<option value="${a.id}" ${cc&&a.id===cc.payment_account_id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   <button class="pri" id="fsv">Salvar</button><p id="fm" class="neg"></p>
   <p class="mu">Vale para lançamentos novos ou editados; faturas já atribuídas não mudam.</p>
   <b style="display:block;margin-top:14px">Portadores</b>${H.map(h=>`<div class="row"><input data-hn="${h.id}" value="${esc(h.name)}"><button class="x" data-hx="${h.id}">✕</button></div>`).join("")}
   <label>Novo portador<input id="hnw" placeholder="Ex.: Esposa"></label><button class="sec" id="hadd">Adicionar portador</button><p id="hm" class="neg"></p></details></div>`;
  $("bk").onclick=()=>go("acc");
  $("fc").onchange=()=>{S.fatAcc=$("fc").value;S.fatMon=null;S.fatH=null;viewFat();};
  $("fp").onclick=()=>{S.fatMon=mAdd(m,-1);viewFat();};$("fn").onclick=()=>{S.fatMon=mAdd(m,1);viewFat();};
  $("fcc").onclick=()=>{S.cloAcc=acc.id;S.cloMon=m;go("clo");};
  if($("fpay"))$("fpay").onclick=()=>{S.trFrom="fat";S.tr={pay:true,to:acc.id,from:cc&&cc.payment_account_id||undefined,amt:rest,desc:"Pagamento da fatura "+mlab(m)+" · "+acc.name,stm:m};go("tr");};
  document.querySelectorAll("[data-mv]").forEach(b=>b.onclick=async()=>{const [id,d]=b.dataset.mv.split("|");
    const {error}=await sb.from("transactions").update({statement_month:mAdd(m,+d)}).eq("id",id);
    if(error)return alert("Erro: "+error.message);viewFat();});
  document.querySelectorAll("[data-fh]").forEach(b=>b.onclick=()=>{S.fatH=b.dataset.fh||null;viewFat();});
  document.querySelectorAll("[data-hn]").forEach(el=>el.onchange=async()=>{const n=el.value.trim();if(!n)return;const {error}=await sb.from("card_holders").update({name:n}).eq("id",el.dataset.hn);$("hm").textContent=error?"Erro: "+error.message:"Nome salvo ✓";await loadCards();});
  document.querySelectorAll("[data-hx]").forEach(b=>b.onclick=async()=>{if(!confirm("Remover este portador?"))return;const {error}=await sb.from("card_holders").delete().eq("id",b.dataset.hx);if(error)return $("hm").textContent="Não foi possível remover (tem lançamentos?): "+error.message;await loadCards();viewFat();});
  $("hadd").onclick=async()=>{const n=$("hnw").value.trim();if(!n)return $("hm").textContent="Informe o nome.";const {error}=await sb.from("card_holders").insert({household_id:S.hid,account_id:acc.id,name:n});if(error)return $("hm").textContent="Erro: "+error.message;await loadCards();viewFat();};
  $("fsv").onclick=async()=>{const cl=+$("fcl").value,du=+$("fdu").value;
    if(!(cl>=1&&cl<=31&&du>=1&&du<=31))return $("fm").textContent="Informe dias entre 1 e 31.";
    const {error}=await sb.from("credit_cards").upsert({household_id:S.hid,account_id:acc.id,closing_day:cl,due_day:du,payment_account_id:$("fpa").value||null},{onConflict:"account_id"});
    if(error)return $("fm").textContent="Erro: "+error.message;
    await loadCards();viewFat();};
}

/* ================= FECHAMENTO MENSAL ================= */
async function viewClo(msg){
  if(!S.accounts.length){$("main").innerHTML='<div class="card"><button class="lk" id="bk">← Voltar</button> Cadastre uma conta primeiro.</div>';$("bk").onclick=()=>go("acc");return;}
  if(!S.accounts.some(a=>a.id===S.cloAcc))S.cloAcc=S.accounts[0].id;
  const acc=S.accounts.find(a=>a.id===S.cloAcc),cur=acc.currency.trim(),card=acc.type==="credit_card";
  const {data:cl,error}=await sb.from("balance_closings").select("id,ref_month,reported_balance,calculated_balance").eq("account_id",acc.id).order("ref_month",{ascending:false});
  if(error){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(error.message)}</p><p class="mu">Se a tabela não existe, rode o script cartoes_fechamento.sql no Supabase.</p></div>`;$("bk").onclick=()=>go("acc");return;}
  if(!S.cloMon)S.cloMon=cl.length?mAdd(cl[0].ref_month,1):mAdd(today().slice(0,8)+"01",-1);
  const m=S.cloMon,done=cl.find(c=>c.ref_month===m);
  const {data:calc}=await sb.rpc("closing_balance",{p_account:acc.id,p_ref:m});
  const wl=acc.type==="benefit"&&!done?((await sb.rpc("wallet_closing_balances",{p_account:acc.id,p_ref:m})).data||[]).filter(w=>w.is_active||Number(w.balance)!==0):[];
  const WC={};
  if(acc.type==="benefit"&&cl.length){const {data:wr}=await sb.from("wallet_closings").select("closing_id,wallet_id,reported_balance,calculated_balance").in("closing_id",cl.map(c=>c.id));(wr||[]).forEach(r=>{(WC[r.closing_id]=WC[r.closing_id]||[]).push(r);});}
  if(S.tab!=="clo"||S.cloAcc!==acc.id||S.cloMon!==m)return;
  const cv=Number(calc||0),dif=x=>{const d=Math.round(x*100)/100;return d===0?"confere ✓":"diferença "+fmt(d,cur);};
  const wcHtml=c=>{if(acc.type!=="benefit")return "";const L=WC[c.id]||[];
    if(!L.length)return '<div class="mu">Gravado só com o total (fechamento anterior ao controle por carteira).</div>';
    return L.map(r=>`<div class="row" style="border:0;padding:4px 0 4px 12px"><div>${esc(walletName(r.wallet_id)||"Carteira")}<div class="mu">app ${fmt(r.calculated_balance,cur)} · extrato ${fmt(r.reported_balance,cur)}</div></div><span class="mu">${dif(Number(r.reported_balance)-Number(r.calculated_balance))}</span></div>`).join("");};
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Fechamento mensal</b>
   <label>${card?"Cartão":"Conta"}<select id="ca">${S.accounts.map(a=>`<option value="${a.id}" ${a.id===acc.id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   <div class="row" style="align-items:center"><button class="x" id="cp">‹</button><b>${mlab(m)}</b><button class="x" id="cn">›</button></div>
   ${done?`<p class="pos">Fechado ✓</p><div class="row"><span>${card?"Total da fatura":"Saldo"} (app)</span><span>${fmt(done.calculated_balance,cur)}</span></div><div class="row"><span>Informado (extrato)</span><span>${fmt(done.reported_balance,cur)}</span></div><div class="mu">${dif(done.reported_balance-done.calculated_balance)}</div>${wcHtml(done)}`
   :`<div class="row"><span>${card?"Total da fatura no app":"Saldo no app, no fim do mês"}</span><b>${fmt(cv,cur)}</b></div>
   ${wl.length?wl.map(w=>`<label>${esc(w.name)} <span class="mu">(app ${fmt(w.balance,cur)})</span><input class="cw" data-w="${w.wallet_id}" data-a="${w.balance}" inputmode="decimal" placeholder="0,00"><span class="mu" id="cwd${w.wallet_id}"></span></label>`).join("")+`<label>Total no extrato (soma das carteiras)<input id="cv" readonly></label>`:`<label>${card?"Total da fatura no banco":"Saldo no extrato do banco"}<input id="cv" inputmode="decimal" placeholder="0,00"></label>`}
   <p id="cd" class="mu"></p><button class="pri" id="cs">Fechar ${esc(mlab(m))}</button>
   <p class="mu">Fechar congela os lançamentos até este mês${card?" (por fatura)":""}. Para corrigir depois, reabra o último fechamento.</p>`}
   <p id="cm" class="${msg?"pos":"neg"}">${esc(msg||"")}</p></div>
  <div class="card"><b>Fechamentos</b>${cl.length?cl.map((c,i)=>`<div class="row"><div>${mlab(c.ref_month)}<div class="mu">${fmt(c.reported_balance,cur)} · ${dif(c.reported_balance-c.calculated_balance)}</div>${acc.type==="benefit"?`<details><summary>Por carteira</summary>${wcHtml(c)}</details>`:""}</div>${i===0?`<button class="x" data-ro="${c.id}">Reabrir</button>`:""}</div>`).join(""):'<p class="mu">Nenhum fechamento nesta conta.</p>'}</div>`;
  const say=t=>{$("cm").className="neg";$("cm").textContent=t;};
  $("bk").onclick=()=>go("acc");
  $("ca").onchange=()=>{S.cloAcc=$("ca").value;S.cloMon=null;viewClo();};
  $("cp").onclick=()=>{S.cloMon=mAdd(m,-1);viewClo();};$("cn").onclick=()=>{S.cloMon=mAdd(m,1);viewClo();};
  if($("cv"))$("cv").oninput=()=>{const v=num($("cv").value);$("cd").textContent=isNaN(v)?"":"Comparação: "+dif(v-cv);};
  document.querySelectorAll(".cw").forEach(i=>i.oninput=()=>{
    const all=[...document.querySelectorAll(".cw")];
    all.forEach(x=>{const e=document.getElementById("cwd"+x.dataset.w),v=num(x.value);e.textContent=x.value.trim()&&!isNaN(v)?" "+dif(v-Number(x.dataset.a)):"";});
    const t=all.reduce((r,x)=>r+(num(x.value)||0),0);$("cv").value=String(Math.round(t*100)/100).replace(".",",");$("cv").oninput();});
  if($("cs"))$("cs").onclick=async()=>{
    if([...document.querySelectorAll(".cw")].some(x=>!x.value.trim()||isNaN(num(x.value))))return say("Informe o saldo de todas as carteiras (0 se estiver vazia).");
    const v=num($("cv").value);
    if(isNaN(v))return say("Informe o valor do extrato.");
    const d=Math.round((v-cv)*100)/100;
    if(d!==0&&!confirm(`Há diferença de ${fmt(d,cur)} entre o app e o banco. Fechar mesmo assim?`))return;
    $("cs").disabled=true;
    const ws=[...document.querySelectorAll(".cw")];
    const {error}=ws.length?await sb.rpc("close_benefit_balance",{p_account:acc.id,p_ref:m,p_wallets:ws.map(x=>({wallet_id:x.dataset.w,reported:num(x.value)}))}):await sb.rpc("close_balance",{p_account:acc.id,p_ref:m,p_reported:v});
    if(error){$("cs").disabled=false;return say(error.message);}
    viewClo("Mês fechado ✓");};
  document.querySelectorAll("[data-ro]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Reabrir o último fechamento? Os lançamentos desse mês voltam a poder ser alterados."))return;
    const {error}=await sb.from("balance_closings").delete().eq("id",b.dataset.ro);
    if(error)return say(error.message);
    viewClo("Fechamento reaberto ✓");});
}

