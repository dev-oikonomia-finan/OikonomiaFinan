/* ================= PAINEL ================= */
const mm=v=>fmt(Number(v)||0,"BRL");
async function viewDash(){
  $("main").innerHTML='<div class="card mu">Carregando…</div>';
  const ano=today().slice(0,4),per=["weekly","monthly","yearly"],hid=S.hid,pr=dper();
  const [bl,un,lp,lm,rs,ip,...ps]=await Promise.all([
    (async()=>{const [a,i]=await Promise.all([sb.from("account_balances").select("account_id,type,balance_base").eq("household_id",hid),sb.from("investment_account_summary").select("account_id,in_assets,cash").eq("household_id",hid)]);if(!a.error&&!i.error){a.invSum=i.data||[];const m={};(i.data||[]).forEach(x=>{m[x.account_id]=Number(x.in_assets)||0;});(a.data||[]).forEach(x=>{x.balance_base=Number(x.balance_base||0)+(m[x.account_id]||0);});}return a;})(),
    sb.from("transactions").select("amount,fx_rate_to_base").eq("household_id",hid).is("category_id",null).is("transfer_group_id",null).lt("amount",0).gte("date",ano+"-01-01").lte("date",ano+"-12-31"),
    sb.from("loan_progress").select("*").eq("household_id",hid).eq("is_active",true).order("name"),
    sb.from("loan_monthly_commitment").select("month,amount").eq("household_id",hid),
    sb.rpc("period_summary",{p_household:hid,p_from:pr[0],p_to:pr[1],p_card_mode:cm()}),
    sb.from("investment_positions").select("account_id,class,qty,current_value,is_active").eq("household_id",hid),
    ...per.map(p=>sb.rpc("budget_progress",{p_household:hid,p_ref:today(),p_period:p}))]);
  if(S.tab!=="dash"||S.hid!==hid)return;
  const err=[bl,un,...ps].find(r=>r.error);
  if(err){$("main").innerHTML=`<div class="card neg">${esc(err.error.message)}</div>`;return;}
  const B=(bl.data||[]).filter(a=>S.accounts.some(x=>x.id===a.account_id)),sum=f=>B.filter(f).reduce((t,a)=>t+Number(a.balance_base||0),0);
  const geral=sum(()=>true),disp=sum(a=>["checking","cash"].includes(a.type)),cart=sum(a=>a.type==="credit_card"),ben=sum(a=>a.type==="benefit"),demais=geral-disp-cart-ben;
  const IA=S.accounts.filter(a=>a.type==="investment"),iok=id=>IA.some(a=>a.id===id),
    cashI=(bl.invSum||[]).filter(x=>iok(x.account_id)).reduce((t,x)=>t+Number(x.cash||0),0),icl={};
  (ip.data||[]).filter(p=>p.is_active&&iok(p.account_id)&&Number(p.qty)>0).forEach(p=>{icl[p.class]=(icl[p.class]||0)+Number(p.current_value||0);});
  const invTot=cashI+Object.keys(icl).reduce((t,k)=>t+icl[k],0),ipc=v=>invTot>0?" "+(v/invTot*100).toFixed(1).replace(".",",")+"%":"";
  const invHtml=IA.length?`<div class="card"><div class="row"><b>Investimentos</b><b>${mm(invTot)}</b></div>
    ${ip.error?'<p class="mu">Não foi possível ler as posições por classe.</p>':Object.keys(icl).filter(k=>Math.abs(icl[k])>=0.005).map(k=>`<div class="row"><span>${ICLS[k]||k}<span class="mu">${ipc(icl[k])}</span></span><span>${mm(icl[k])}</span></div>`).join("")}
    <div class="row"><span>Caixa e poupança (sem ativo)<span class="mu">${ipc(cashI)}</span></span><span class="${cashI<0?"neg":""}">${mm(cashI)}</span></div>
    <button class="sec" id="gi">📈 Abrir Investimentos</button></div>`:"";
  const nU=(un.data||[]).length,totU=(un.data||[]).reduce((t,x)=>t-Number(x.amount)*Number(x.fx_rate_to_base||1),0);
  const d=new Date(today()+"T12:00:00"),dw=(d.getDay()+6)%7;
  const d1=new Date(d);d1.setDate(d.getDate()-dw);const d2=new Date(d1);d2.setDate(d1.getDate()+6);
  const dm=x=>x.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
  const titles={weekly:`Semanal · ${dm(d1)} a ${dm(d2)}`,monthly:`Mensal · ${d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}`,yearly:`Anual · ${ano}`};
  const meter=m=>{
    const amt=Number(m.budget_amount),sp=Number(m.spent),rest=Number(m.remaining),pct=m.pct_used==null?null:Number(m.pct_used);
    const c=pct==null||amt<=0?"var(--mu)":pct<=80?"var(--grn)":pct<=100?"var(--yel)":"var(--red)";
    return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(m.category_name)}</b><b style="color:${c}">${pct==null?"—":pct.toFixed(1).replace(".",",")+"%"}</b></div>
      <div class="bar"><i style="width:${pct==null?0:Math.min(pct,100)}%;background:${c}"></i></div>
      <div class="mu">${mm(sp)} de ${mm(amt)} · ${rest>=0?"restam "+mm(rest):"estourou em "+mm(-rest)}</div></div>`;};
  const secs=per.map((p,i)=>{const L=ps[i].data||[];return L.length?`<div class="card"><b>${titles[p]}</b>${L.map(meter).join("")}</div>`:"";}).join("");
  const tem=ps.some(r=>(r.data||[]).length);
  const LP=lp.data||[],LM={};(lm.data||[]).forEach(r=>{LM[r.month]=(LM[r.month]||0)+Number(r.amount);});
  const mk=Object.keys(LM).sort().slice(0,6);
  const mlab=k=>new Date(k+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).replace(".","");
  const loanHtml=LP.length?`<div class="card"><b>Financiamentos e empréstimos</b>${LP.map(l=>{
    const pc=Number(l.paid_count),tot=Number(l.total_installments),rem=Number(l.remaining_count),pct=tot?Math.min(100,pc/tot*100):0;
    return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(l.name)}</b><span class="mu">${l.kind==="sac"?"SAC":"Parcela fixa"}</span></div>
      <div class="mu">${pc} de ${tot} pagas · ${rem>0?"faltam "+rem:"quitado ✓"}</div>
      <div class="bar"><i style="width:${pct}%;background:var(--ac)"></i></div>
      ${rem>0?`<div class="mu">Próxima (${l.next_number}/${tot}): ${mm(l.next_amount)} em ${fdt(l.next_date)} · ainda a pagar ${mm(l.remaining_amount)}</div>`:""}</div>`;}).join("")}
    ${mk.length?`<details><summary>Parcelas por mês (todos os contratos)</summary>${mk.map(k=>`<div class="row"><span>${mlab(k)}</span><b>${mm(LM[k])}</b></div>`).join("")}<div class="mu">Soma as parcelas do mês, pagas e previstas. Valores futuros são estimativas.</div></details>`:""}</div>`:"";
  const RS=(rs.data&&rs.data[0])||null,inc=RS?Number(RS.income):0,exp=RS?Number(RS.expense):0,PL={mon:"Mês",year:"Ano",all:"Tudo",cus:"Período"};
  const perHtml=`<div class="card"><b>Resultado do período</b><div class="chips" style="margin-top:8px">${Object.keys(PL).map(k=>`<button data-dp="${k}" class="${S.dper===k?"on":""}">${PL[k]}</button>`).join("")}</div>
   ${S.dper==="cus"?`<div style="display:flex;gap:8px"><label style="flex:1">De<input type="date" id="pdf" value="${S.dfrom||""}"></label><label style="flex:1">Até<input type="date" id="pdt" value="${S.dto||""}"></label></div>${S.dfrom&&S.dto?"":'<p class="mu">Informe as duas datas (por enquanto mostra o mês atual).</p>'}`:""}
   ${rs.error?`<p class="neg">${esc(rs.error.message)}</p><p class="mu">Rode o script cartao_partida.sql no Supabase.</p>`:`<div class="row"><span>Receitas</span><span class="pos">${mm(inc)}</span></div><div class="row"><span>Despesas</span><span class="neg">${mm(exp)}</span></div><div class="row"><b>Resultado</b><b class="${inc+exp<0?"neg":"pos"}">${mm(inc+exp)}</b></div><div class="seg" style="margin-top:8px"><button data-cm="stm" class="${cm()==="stm"?"on":""}">Cartão: pela fatura</button><button data-cm="buy" class="${cm()==="buy"?"on":""}">Cartão: pela compra</button></div><div class="mu">Sem transferências. ${cm()==="stm"?"Compras no cartão contam no mês da fatura (vencimento).":"Compras no cartão contam pela data da compra."} As metas abaixo sempre contam pela data da compra.</div>`}</div>`;
  $("main").innerHTML=`<div class="card"><div class="mu">Saldo geral</div>
    <div style="font-size:1.6rem;font-weight:700" class="${geral<0?"neg":"pos"}">${mm(geral)}</div>
    <div class="row" style="margin-top:8px"><span>Disponível (corrente e dinheiro)</span><span class="${disp<0?"neg":""}">${mm(disp)}</span></div>
    <div class="row"><span>Cartões (dívida atual)</span><span class="${cart<0?"neg":""}">${mm(cart)}</span></div>
    ${B.some(a=>a.type==="benefit")?`<div class="row"><span>Benefícios (vales)</span><span class="${ben<0?"neg":""}">${mm(ben)}</span></div>`:""}
    <div class="row"><span>Demais contas</span><span class="${demais<0?"neg":""}">${mm(demais)}</span></div></div>
  ${invHtml}
  ${perHtml}
  ${nU?`<div class="card" style="border-color:var(--yel)">⚠️ <b>${nU} despesa(s) sem categoria em ${ano}</b>, somando ${mm(totU)}. Elas não entram nas metas. Corrija pelo ✏️ na tela Lançamentos.<br><button class="sec" id="gu">Ver lançamentos</button></div>`:""}
  ${tem?secs:'<div class="card">Você ainda não tem metas. Crie a primeira para acompanhar seus gastos com semáforo.</div>'}
  ${loanHtml}
  <button class="sec" id="gm">🎯 Gerenciar metas</button>
  <button class="sec" id="gl">🏦 Financiamentos e empréstimos</button>`;
  $("gm").onclick=()=>go("metas");
  document.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{lsSet("cardmode",b.dataset.cm);viewDash();});
  document.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>{S.dper=b.dataset.dp;viewDash();});
  if($("pdf")){$("pdf").onchange=()=>{S.dfrom=$("pdf").value;viewDash();};$("pdt").onchange=()=>{S.dto=$("pdt").value;viewDash();};}
  $("gl").onclick=()=>go("loans");
  if($("gi"))$("gi").onclick=()=>go("inv");
  if($("gu"))$("gu").onclick=()=>{S.lim=50;S.lper="all";go("list");};
}

