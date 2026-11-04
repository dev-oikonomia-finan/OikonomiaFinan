/* ================= PAINEL ================= */
const mm=v=>fmt(Number(v)||0,"BRL");
/* ===== Detalhes do Painel (Etapa 2): tocar num valor abre uma janela sobreposta com o que compõe o valor ===== */
document.head.insertAdjacentHTML("beforeend",`<style>.ddv{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
#ddov{position:fixed;inset:0;z-index:98;background:rgba(0,0,0,.45);overflow:auto;padding:6vh 12px}
#ddov .ddbox{max-width:560px;margin:0 auto;background:var(--bg,#fff);color:var(--tx,#111);border-radius:12px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.35)}
#ddov details summary{cursor:pointer}</style>`);
function ddOpen(title,html){
  ddClose();const o=document.createElement("div");o.id="ddov";
  o.innerHTML=`<div class="ddbox"><div class="row" style="border:0;padding:0 0 6px"><b>${title}</b><button class="x" id="ddx" title="Fechar">✕</button></div><div id="ddc">${html}</div></div>`;
  document.body.appendChild(o);
  o.onclick=e=>{if(e.target===o)ddClose();};$("ddx").onclick=ddClose;
  document.addEventListener("keydown",ddEsc);return $("ddc");}
function ddClose(){const o=$("ddov");if(o)o.remove();document.removeEventListener("keydown",ddEsc);}
function ddEsc(e){if(e.key==="Escape")ddClose();}
/* leitura paginada (o Supabase devolve no máximo 1.000 linhas por vez) */
async function ddAll(mk){const o=[];for(let i=0;i<20000;i+=1000){const r=await mk().range(i,i+999);if(r.error)return {error:r.error,data:o};o.push(...r.data);if(r.data.length<1000)break;}return {data:o};}
const ddAccName=id=>(S.accounts.find(a=>a.id===id)||{}).name||"Conta inativa";
/* lista de lançamentos por categoria (Resultado e metas): v = valor positivo a mostrar */
function ddCatList(rows,val){
  const G={};rows.forEach(t=>{const k=t.category_id?catName(t.category_id):"Sem categoria";(G[k]=G[k]||[]).push(t);});
  const K=Object.keys(G).map(k=>({k,L:G[k],t:G[k].reduce((s,x)=>s+val(x),0)})).sort((a,b)=>b.t-a.t);
  return K.map(g=>`<details><summary><div class="row" style="display:inline-flex;width:calc(100% - 20px);border:0;padding:6px 0"><span>${esc(g.k)} <span class="mu">· ${g.L.length}</span></span><b>${mm(g.t)}</b></div></summary>
    ${g.L.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>`<div class="row" style="padding-left:12px"><div><div>${esc(t.description||"Sem descrição")}</div><div class="mu">${fdt(t.date)} · ${esc(ddAccName(t.account_id))}${t.installment_total?" · "+t.installment_number+"/"+t.installment_total:""}${t.statement_month&&S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")?" · fatura "+t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):""}${t.status==="planned"&&t.date>today()?" · previsto":""}</div></div><span>${mm(val(t))}</span></div>`).join("")}</details>`).join("")||'<p class="mu">Nenhum lançamento.</p>';}
async function viewDash(){
  $("main").innerHTML='<div class="card mu">Carregando…</div>';
  /* Resultado: Mês e Ano navegáveis (S.dmon = 1º dia do mês escolhido; S.dyear = ano); começam no mês e no ano atuais */
  const curM=today().slice(0,8)+"01";if(!S.dmon)S.dmon=curM;if(!S.dyear)S.dyear=+today().slice(0,4);
  const pr=S.dper==="mon"?[S.dmon,mAdd(S.dmon,1)]:S.dper==="year"?[S.dyear+"-01-01",(S.dyear+1)+"-01-01"]:dper();
  const ano=today().slice(0,4),hid=S.hid,stmM=cm()==="stm",nm0=mAdd(today().slice(0,8)+"01",1);
  /* Situação do Painel: "hoje" (como sempre), "mes" (+ previstos até o fim do mês) ou "tudo" (+ todos os previstos); previdência e FGTS fora do saldo, salvo se marcado */
  /* previdência e FGTS no saldo: "0" não incluir | "own" só o resgatável (partes não marcadas como potencial) | "all" resgatável + potencial (todas as partes) */
  const sit=["mes","tudo"].includes(lsGet("dsit"))?lsGet("dsit"):"hoje";
  /* 4 opções: show_own / show_all (só exibe, fora do Saldo geral) e own / all (exibe e soma); valores antigos: "1" = all, "0" = show_all */
  const PVO={show_own:"Apenas exibir só o resgatável",show_all:"Apenas exibir resgatável + potencial",show_nm:"Apenas exibir resgatável + potencial − multa FGTS",own:"Incluir só o resgatável",all:"Incluir resgatável + potencial",nm:"Incluir resgatável + potencial − multa FGTS"};
  /* rótulo curto de cada forma (own / all / nm = sem a multa do FGTS) */
  const PVL={own:"resgatável",all:"resgatável + potencial",nm:"resgatável + potencial − multa FGTS"};
  const pvr=lsGet("dprev")==="1"?"all":lsGet("dprev")==="0"?"show_all":(PVO[lsGet("dprev")]?lsGet("dprev"):"show_all");
  const pvm=pvr.replace("show_",""),incPrev=!pvr.startsWith("show_"),isPrev=a=>["pension","fgts"].includes(a.type);
  const fimMes=(()=>{const e=new Date(nm0+"T12:00:00");e.setDate(e.getDate()-1);return e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0");})();
  const futOk=S.accounts.filter(a=>incPrev||!isPrev(a)).map(a=>a.id);
  /* seções de metas: pela fatura, mostra também o mês seguinte (e, em dezembro, o ano seguinte), que já recebe o cartão depois do fechamento */
  const SEC=[{p:"weekly",ref:today()},{p:"monthly",ref:today()},...(stmM?[{p:"monthly",ref:nm0,nx:true}]:[]),{p:"yearly",ref:today()},...(stmM&&today().slice(5,7)==="12"?[{p:"yearly",ref:(+ano+1)+"-01-01",nx:true}]:[])];
  const [bl,un,lp,lm,rs,ip,pq,fu,...ps]=await Promise.all([
    (async()=>{const [a,i]=await Promise.all([sb.from("account_balances").select("account_id,type,currency,balance,balance_base").eq("household_id",hid),sb.from("investment_account_summary").select("account_id,in_assets,cash").eq("household_id",hid)]);if(!a.error&&!i.error){a.invSum=i.data||[];const m={};(i.data||[]).forEach(x=>{m[x.account_id]=Number(x.in_assets)||0;});(a.data||[]).forEach(x=>{x.balance_base=Number(x.balance_base||0)+(m[x.account_id]||0);});}return a;})(),
    sb.from("transactions").select("amount,fx_rate_to_base").eq("household_id",hid).is("category_id",null).is("transfer_group_id",null).lt("amount",0).gte("date",ano+"-01-01").lte("date",ano+"-12-31"),
    sb.from("loan_progress").select("*").eq("household_id",hid).eq("is_active",true).order("name"),
    sb.from("loan_monthly_commitment").select("month,amount").eq("household_id",hid),
    sb.rpc("period_summary",{p_household:hid,p_from:pr[0],p_to:pr[1],p_card_mode:cm()}),
    sb.from("investment_positions").select("account_id,asset_id,name,ticker,class,qty,current_value,is_active").eq("household_id",hid),
    sb.from("account_part_current").select("part_id,account_id,name,only_dismissal,is_active,value,date").eq("household_id",hid),
    sit==="hoje"||!futOk.length?Promise.resolve({data:[]}):ddAll(()=>{let q=sb.from("transactions").select("id,date,amount,fx_rate_to_base,description,account_id,category_id,status,statement_month,installment_group_id,installment_number,installment_total,transfer_group_id").eq("household_id",hid).eq("status","planned").gt("date",today()).in("account_id",futOk);
      if(sit==="mes")q=q.lte("date",fimMes);return q.order("date").order("id");}),
    ...SEC.map(x=>sb.rpc("budget_progress",{p_household:hid,p_ref:x.ref,p_period:x.p,p_card_mode:cm()}))]);
  if(S.tab!=="dash"||S.hid!==hid)return;
  const err=[bl,un,...ps].find(r=>r.error);
  if(err){$("main").innerHTML=`<div class="card neg">${esc(err.error.message)}</div>`;return;}
  const B=(bl.data||[]).filter(a=>S.accounts.some(x=>x.id===a.account_id)),sum=f=>B.filter(f).reduce((t,a)=>t+Number(a.balance_base||0),0);
  /* valor de cada conta de previdência/FGTS no cenário: com partes, soma as partes que entram; sem partes, o saldo da conta (recebo sempre) */
  const PQ=((pq&&pq.data)||[]).filter(x=>x.is_active),hasP=id=>PQ.some(x=>x.account_id===id);
  /* multa do FGTS: parte marcada como "Valor potencial" numa conta do tipo FGTS */
  const isMulta=x=>x.only_dismissal&&B.some(a=>a.account_id===x.account_id&&a.type==="fgts");
  const prevOf=(a,m)=>hasP(a.account_id)?PQ.filter(x=>x.account_id===a.account_id&&(m==="all"||(m==="nm"&&!isMulta(x))||!x.only_dismissal)).reduce((t,x)=>t+Number(x.value||0),0):Number(a.balance_base||0);
  const prevAll=B.filter(isPrev).reduce((t,a)=>t+prevOf(a,"all"),0),prevOwn=B.filter(isPrev).reduce((t,a)=>t+prevOf(a,"own"),0),prevNm=B.filter(isPrev).reduce((t,a)=>t+prevOf(a,"nm"),0),prevMulta=prevAll-prevNm,prevTot=pvm==="own"?prevOwn:pvm==="nm"?prevNm:prevAll;
  const temPrev=B.some(isPrev),geral=sum(a=>!isPrev(a))+(incPrev?prevTot:0),disp=sum(a=>["checking","cash"].includes(a.type)),cart=sum(a=>a.type==="credit_card"),ben=sum(a=>a.type==="benefit"),demais=geral-disp-cart-ben-(incPrev?prevTot:0);
  /* compromissos previstos (Fim do mês / Tudo) */
  const loanG=new Set((S.loans||[]).map(l=>l.installment_group_id)),FU=(fu&&fu.data)||[],fv=t=>Number(t.amount)*Number(t.fx_rate_to_base||1);
  const FG={card:FU.filter(t=>!t.transfer_group_id&&S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")),loan:FU.filter(t=>t.installment_group_id&&loanG.has(t.installment_group_id))};
  FG.out=FU.filter(t=>!FG.card.includes(t)&&!FG.loan.includes(t));
  /* Financiamentos: em Tudo, contrato com saldo devedor informado entra pelo saldo devedor (no lugar das parcelas restantes); sem ele, pelas parcelas */
  const LC=(S.loans||[]).map(l=>{const R=FG.loan.filter(t=>t.installment_group_id===l.installment_group_id),parc=R.reduce((x,t)=>x+fv(t),0),pa=l.payoff_amount==null?null:Number(l.payoff_amount),usa=sit==="tudo"&&pa!==null&&l.is_active!==false;
    return {l,R,parc,pa,usa,val:usa?-pa:parc};}).filter(x=>x.R.length||x.usa);
  const loanParc=FG.loan.reduce((x,t)=>x+fv(t),0),loanVal=LC.reduce((x,c)=>x+c.val,0)+FG.loan.filter(t=>!LC.some(c=>c.R.includes(t))).reduce((x,t)=>x+fv(t),0),loanPay=LC.some(c=>c.usa);
  const fs=k=>k==="loan"?loanVal:FG[k].reduce((x,t)=>x+fv(t),0),futTot=fs("card")+fs("loan")+fs("out"),proj=geral+futTot;
  /* Disponível separado: contas em reais e contas em moeda estrangeira (em R$ pelo custo médio); o Saldo geral soma tudo */
  const isDisp=a=>["checking","cash"].includes(a.type),cuOf=a=>String(a.currency||"BRL").trim(),dispR=sum(a=>isDisp(a)&&cuOf(a)==="BRL"),dispF=disp-dispR,FX={};
  B.filter(a=>isDisp(a)&&cuOf(a)!=="BRL").forEach(a=>{const c=cuOf(a),o=FX[c]=FX[c]||{q:0,b:0};o.q+=Number(a.balance||0);o.b+=Number(a.balance_base||0);});
  const IA=S.accounts.filter(a=>a.type==="investment"),iok=id=>IA.some(a=>a.id===id),
    cashI=(bl.invSum||[]).filter(x=>iok(x.account_id)).reduce((t,x)=>t+Number(x.cash||0),0),icl={};
  (ip.data||[]).filter(p=>p.is_active&&iok(p.account_id)&&Number(p.qty)>0).forEach(p=>{icl[p.class]=(icl[p.class]||0)+Number(p.current_value||0);});
  const invTot=cashI+Object.keys(icl).reduce((t,k)=>t+icl[k],0),ipc=v=>invTot>0?" "+(v/invTot*100).toFixed(1).replace(".",",")+"%":"";
  const invHtml=IA.length?`<div class="card"><div class="row"><b>Investimentos</b><b class="ddv" data-dd="inv">${mm(invTot)}</b></div>
    ${ip.error?'<p class="mu">Não foi possível ler as posições por classe.</p>':Object.keys(icl).filter(k=>Math.abs(icl[k])>=0.005).map(k=>`<div class="row"><span>${ICLS[k]||k}<span class="mu">${ipc(icl[k])}</span></span><span class="ddv" data-dd="icl:${k}">${mm(icl[k])}</span></div>`).join("")}
    <div class="row"><span>Caixa e poupança (sem ativo)<span class="mu">${ipc(cashI)}</span></span><span class="ddv ${cashI<0?"neg":""}" data-dd="icash">${mm(cashI)}</span></div>
    <button class="sec" id="gi">📈 Abrir Investimentos</button></div>`:"";
  const nU=(un.data||[]).length,totU=(un.data||[]).reduce((t,x)=>t-Number(x.amount)*Number(x.fx_rate_to_base||1),0);
  const d=new Date(today()+"T12:00:00"),dw=(d.getDay()+6)%7;
  const d1=new Date(d);d1.setDate(d.getDate()-dw);const d2=new Date(d1);d2.setDate(d1.getDate()+6);
  const dm=x=>x.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
  const titles={weekly:`Semanal · ${dm(d1)} a ${dm(d2)}`,monthly:`Mensal · ${d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}`,yearly:`Anual · ${ano}`};
  const secTitle=x=>!x.nx?titles[x.p]:x.p==="monthly"?`Mensal · ${new Date(x.ref+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})} (parcial)`:`Anual · ${+ano+1} (parcial)`;
  const meter=(m,si,mi)=>{
    const amt=Number(m.budget_amount),sp=Number(m.spent),rest=Number(m.remaining),pct=m.pct_used==null?null:Number(m.pct_used);
    const c=pct==null||amt<=0?"var(--mu)":pct<=80?"var(--grn)":pct<=100?"var(--yel)":"var(--red)";
    return `<div class="row ddv" data-mt="${si}|${mi}" style="display:block;text-decoration:none"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(m.category_name)}</b><b style="color:${c}">${pct==null?"—":pct.toFixed(1).replace(".",",")+"%"}</b></div>
      <div class="bar"><i style="width:${pct==null?0:Math.min(pct,100)}%;background:${c}"></i></div>
      <div class="mu">${mm(sp)} de ${mm(amt)} · ${rest>=0?"restam "+mm(rest):"estourou em "+mm(-rest)}</div></div>`;};
  const secs=SEC.map((x,i)=>{const L=ps[i].data||[];return L.length?`<div class="card"><b>${secTitle(x)}</b>${x.nx?'<div class="mu">Já lançado ou previsto: compras no cartão depois do fechamento (fatura seguinte), parcelas e previstos.</div>':""}${x.p==="weekly"&&stmM?'<div class="mu">A meta semanal conta o cartão pela data da compra.</div>':""}${L.map((m,mi)=>meter(m,i,mi)).join("")}</div>`:"";}).join("");
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
   ${S.dper==="mon"?`<div class="row" style="align-items:center"><button class="x" id="pmp">‹</button><b>${new Date(S.dmon+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</b><button class="x" id="pmn">›</button></div>${S.dmon!==curM?'<button class="lk" id="pm0">Voltar ao mês atual</button>':""}`:""}
   ${S.dper==="year"?`<div class="row" style="align-items:center"><button class="x" id="pyp">‹</button><b>${S.dyear}</b><button class="x" id="pyn">›</button></div>${S.dyear!==+ano?'<button class="lk" id="py0">Voltar ao ano atual</button>':""}`:""}
   ${S.dper==="cus"?`<div style="display:flex;gap:8px"><label style="flex:1">De<input type="date" id="pdf" value="${S.dfrom||""}"></label><label style="flex:1">Até<input type="date" id="pdt" value="${S.dto||""}"></label></div><p id="pdm" class="neg"></p>${S.dfrom&&S.dto?"":'<p class="mu">Informe as duas datas (por enquanto mostra o mês atual).</p>'}`:""}
   ${rs.error?`<p class="neg">${esc(rs.error.message)}</p><p class="mu">Rode o script cartao_partida.sql no Supabase.</p>`:`<div class="row"><span>Receitas</span><span class="ddv pos" data-dd="rinc">${mm(inc)}</span></div><div class="row"><span>Despesas</span><span class="ddv neg" data-dd="rexp">${mm(exp)}</span></div><div class="row"><b>Resultado</b><b class="${inc+exp<0?"neg":"pos"}">${mm(inc+exp)}</b></div><div class="seg" style="margin-top:8px"><button data-cm="stm" class="${cm()==="stm"?"on":""}">Cartão: pela fatura</button><button data-cm="buy" class="${cm()==="buy"?"on":""}">Cartão: pela compra</button></div><div class="mu">Sem transferências. ${cm()==="stm"?"Compras no cartão contam no mês da fatura (vencimento).":"Compras no cartão contam pela data da compra."} ${cm()==="stm"?"As metas mensais e anuais também contam o cartão pela fatura; a semanal, pela data da compra.":"As metas abaixo também contam pela data da compra."}</div>`}</div>`;
  const SITL={hoje:"Hoje",mes:"Fim do mês",tudo:"Tudo"};
  const futHtml=sit==="hoje"?"":`<div style="margin-top:12px;border-top:2px solid var(--ac);padding-top:8px"><b>Compromissos previstos ${sit==="mes"?"até "+fdt(fimMes):"(todos)"}</b>
    ${fu&&fu.error?`<p class="neg">${esc(fu.error.message)}</p>`:""}
    <div class="row"><span>Parcelas e compras do cartão a vencer</span><span class="ddv ${fs("card")<0?"neg":""}" data-dd="pf:card">${mm(fs("card"))}</span></div>
    <div class="row"><span>Financiamentos e empréstimos a pagar${loanPay?`<span class="mu" style="display:block">pelo saldo devedor · parcelas restantes ${mm(loanParc)}</span>`:""}</span><span class="ddv ${fs("loan")<0?"neg":""}" data-dd="pf:loan">${mm(fs("loan"))}</span></div>
    <div class="row"><span>Outros previstos (despesas e receitas)</span><span class="ddv ${fs("out")<0?"neg":fs("out")>0?"pos":""}" data-dd="pf:out">${mm(fs("out"))}</span></div>
    <div class="row"><b>Saldo projetado</b><b class="${proj<0?"neg":"pos"}">${mm(proj)}</b></div>
    <div class="mu">Saldo geral de hoje + lançamentos previstos com data ${sit==="mes"?"até o fim do mês":"futura"}. As linhas acima continuam mostrando hoje.${temPrev?(incPrev?` Inclui previdência e FGTS: ${pvm==="own"?"só o resgatável":PVL[pvm]} (sem descontar imposto ou taxa de resgate).`:" Sem previdência e FGTS."):""}</div></div>`;
  $("main").innerHTML=`<div class="card"><div class="seg" style="margin-bottom:8px">${Object.keys(SITL).map(k=>`<button data-sit="${k}" class="${sit===k?"on":""}">${SITL[k]}</button>`).join("")}</div><div class="mu">Saldo geral${temPrev?(incPrev?` (com previdência e FGTS: ${PVL[pvm]})`:" (sem previdência e FGTS)"):""}</div>
    <div style="font-size:1.6rem;font-weight:700" class="${geral<0?"neg":"pos"}"><span class="ddv" data-dd="geral">${mm(geral)}</span></div>
    ${Object.keys(FX).length?`<div class="row" style="margin-top:8px"><span>Disponível em reais (corrente e dinheiro)</span><span class="ddv ${dispR<0?"neg":""}" data-dd="dispR">${mm(dispR)}</span></div>
    <div class="row"><span>Disponível em moeda estrangeira<span class="mu" style="display:block">${Object.keys(FX).sort().map(c=>fmt(FX[c].q,c)).join(" · ")} · em R$ pelo custo médio</span></span><span class="ddv ${dispF<0?"neg":""}" data-dd="dispF">${mm(dispF)}</span></div>`
    :`<div class="row" style="margin-top:8px"><span>Disponível (corrente e dinheiro)</span><span class="ddv ${disp<0?"neg":""}" data-dd="disp">${mm(disp)}</span></div>`}
    <div class="row"><span>Cartões (dívida atual)</span><span class="ddv ${cart<0?"neg":""}" data-dd="cart">${mm(cart)}</span></div>
    ${B.some(a=>a.type==="benefit")?`<div class="row"><span>Benefícios (vales)</span><span class="ddv ${ben<0?"neg":""}" data-dd="ben">${mm(ben)}</span></div>`:""}
    <div class="row"><span>Demais contas</span><span class="ddv ${demais<0?"neg":""}" data-dd="demais">${mm(demais)}</span></div>
    ${temPrev?`<div class="row"><span>Previdência e FGTS${incPrev?"":' <span class="mu">(fora do saldo)</span>'}<span class="mu" style="display:block">${pvm==="own"?"só o resgatável":`resgatável ${mm(prevOwn)} · potencial ${mm(prevTot-prevOwn)}${pvm==="nm"?` · sem multa FGTS (${mm(prevMulta)})`:""}`}</span></span><span class="ddv${incPrev?"":" mu"}" data-dd="prev">${mm(prevTot)}</span></div>
    <label style="margin-top:4px">Previdência e FGTS no Painel<select id="dprev">${Object.keys(PVO).map(k=>`<option value="${k}" ${pvr===k?"selected":""}>${PVO[k]}</option>`).join("")}</select></label>`:""}
    ${futHtml}</div>
  ${invHtml}
  ${perHtml}
  ${nU?`<div class="card" style="border-color:var(--yel)">⚠️ <b>${nU} despesa(s) sem categoria em ${ano}</b>, somando ${mm(totU)}. Elas não entram nas metas. Corrija pelo ✏️ na tela Lançamentos.<br><button class="sec" id="gu">Ver lançamentos</button></div>`:""}
  ${tem?secs:'<div class="card">Você ainda não tem metas. Crie a primeira para acompanhar seus gastos com semáforo.</div>'}
  ${loanHtml}
  <button class="sec" id="gm">🎯 Gerenciar metas</button>
  <button class="sec" id="gl">🏦 Financiamentos e empréstimos</button>`;
  $("gm").onclick=()=>go("metas");
  document.querySelectorAll("[data-sit]").forEach(b=>b.onclick=()=>{lsSet("dsit",b.dataset.sit);viewDash();});
  if($("dprev"))$("dprev").onchange=()=>{lsSet("dprev",$("dprev").value);viewDash();};
  document.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{lsSet("cardmode",b.dataset.cm);viewDash();});
  document.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>{S.dper=b.dataset.dp;viewDash();});
  const pnav=(id,f)=>{if($(id))$(id).onclick=()=>{f();viewDash();};};
  pnav("pmp",()=>{S.dmon=mAdd(S.dmon,-1);});pnav("pmn",()=>{S.dmon=mAdd(S.dmon,1);});pnav("pm0",()=>{S.dmon=curM;});
  pnav("pyp",()=>{S.dyear--;});pnav("pyn",()=>{S.dyear++;});pnav("py0",()=>{S.dyear=+ano;});
  /* De/Até do período: só recarrega com data completa e ano entre 1900 e 2100, após 1 s sem digitar ou ao sair do campo (antes recarregava a cada dígito e o ano ficava preso) */
  if($("pdf")){
    const okD=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&+v.slice(0,4)>=1900&&+v.slice(0,4)<=2100;
    let tm=null;
    const apply=()=>{clearTimeout(tm);const f=$("pdf").value,t=$("pdt").value;
      if((f&&!okD(f))||(t&&!okD(t))){$("pdm").textContent="Data incompleta ou ano fora de 1900 a 2100.";return;}
      if(f&&t&&t<f){$("pdm").textContent='"Até" não pode ser antes de "De".';return;}
      $("pdm").textContent="";
      if(f===(S.dfrom||"")&&t===(S.dto||""))return;
      S.dfrom=f||null;S.dto=t||null;viewDash();};
    ["pdf","pdt"].forEach(i=>{const el=$(i);el.oninput=el.onchange=()=>{clearTimeout(tm);tm=setTimeout(apply,1000);};el.onblur=apply;
      el.onkeydown=e=>{if(e.key==="Enter")apply();};});}
  /* ---- detalhes: conteúdo de cada valor ---- */
  const accRow=a=>{const c=cuOf(a),nm=ddAccName(a.account_id),bb=Number(a.balance_base||0),inv=a.type==="investment"?(bl.invSum||[]).find(x=>x.account_id===a.account_id):null;
    return `<div class="row"><div><div>${esc(nm)}</div><div class="mu">${TYPES[a.type]||a.type}${c!=="BRL"?" · "+fmt(Number(a.balance||0),c)+" pelo custo médio":""}${inv?" · caixa "+mm(inv.cash)+" + ativos "+mm(inv.in_assets):""}</div></div>
      <div style="text-align:right;white-space:nowrap"><span class="${bb<0?"neg":""}">${mm(bb)}</span><button class="x" data-dl="${a.account_id}" title="Ver lançamentos do mês">📋</button></div></div>`;};
  const accList=(f,tot)=>{const L=B.filter(f),nz=L.filter(a=>Math.abs(Number(a.balance_base||0))>=0.005).sort((a,b)=>Number(b.balance_base)-Number(a.balance_base)),z=L.length-nz.length;
    return (nz.map(accRow).join("")||'<p class="mu">Nenhuma conta com saldo.</p>')+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(tot)}</b></div>`+(z?`<div class="mu">${z} conta(s) com saldo zero não aparecem.</div>`:"")+'<div class="mu">📋 abre os lançamentos do mês da conta.</div>';};
  const DD={
    geral:()=>["Saldo geral",[["Disponível (corrente e dinheiro)",disp],["Cartões (dívida atual)",cart],...(B.some(a=>a.type==="benefit")?[["Benefícios (vales)",ben]]:[]),["Demais contas",demais],...(temPrev&&incPrev?[["Previdência e FGTS ("+PVL[pvm]+")",prevTot]]:[])].map(([k,v])=>`<div class="row"><span>${k}</span><span class="${v<0?"neg":""}">${mm(v)}</span></div>`).join("")+`<div class="row" style="border-top:2px solid var(--ac)"><b>Saldo geral</b><b>${mm(geral)}</b></div><div class="mu">Toque em cada valor do Painel para ver as contas.</div>`],
    disp:()=>["Disponível (corrente e dinheiro)",accList(isDisp,disp)],
    dispR:()=>["Disponível em reais",accList(a=>isDisp(a)&&cuOf(a)==="BRL",dispR)],
    dispF:()=>["Disponível em moeda estrangeira",accList(a=>isDisp(a)&&cuOf(a)!=="BRL",dispF)+'<div class="mu">Em R$ pelo custo médio de cada conta.</div>'],
    cart:()=>["Cartões (dívida atual)",accList(a=>a.type==="credit_card",cart)+'<div class="mu">Dívida atual = compras até hoje menos pagamentos (a partir do Mês de partida de cada cartão); não é o total de uma fatura.</div>'],
    ben:()=>["Benefícios (vales)",B.filter(a=>a.type==="benefit").map(a=>accRow(a)+S.wallets.filter(w=>w.account_id===a.account_id&&(w.is_active||Math.abs(S.wbal[w.id]||0)>=0.005)).map(w=>`<div class="row" style="padding-left:14px"><span class="mu">${esc(w.name)}</span><span class="mu">${mm(S.wbal[w.id]||0)}</span></div>`).join("")).join("")+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(ben)}</b></div>`],
    demais:()=>["Demais contas",accList(a=>!isDisp(a)&&a.type!=="credit_card"&&a.type!=="benefit"&&!isPrev(a),demais)+'<div class="mu">Investimentos entram com o caixa mais o valor dos ativos.</div>'],
    prev:()=>["Previdência e FGTS",B.filter(isPrev).map(a=>{const L=PQ.filter(x=>x.account_id===a.account_id);
        return `<div class="row"><div><div>${esc(ddAccName(a.account_id))}</div><div class="mu">${TYPES[a.type]}</div></div><div style="text-align:right;white-space:nowrap"><span>${mm(prevOf(a,"all"))}</span><button class="x" data-dl2="${a.account_id}" title="Gerenciar a conta">⚙</button></div></div>`
          +L.map(x=>`<div class="row" style="padding-left:14px"><span class="mu">${esc(x.name)}${x.only_dismissal?" · potencial":" · resgatável"}${isMulta(x)?" · multa FGTS":""}${x.date?" · "+fdt(x.date):" · sem saldo"}</span><span class="mu">${mm(x.value)}</span></div>`).join("");}).join("")
      +`<div class="row" style="border-top:2px solid var(--ac)"><span>Resgatável</span><b>${mm(prevOwn)}</b></div><div class="row"><span>Potencial</span><b>${mm(prevAll-prevOwn)}</b></div><div class="row"><span>Resgatável + potencial</span><b>${mm(prevAll)}</b></div>${prevMulta?`<div class="row"><span>Resgatável + potencial − multa FGTS</span><b>${mm(prevNm)}</b></div>`:""}
      <div class="mu">${incPrev?`No Saldo geral: ${pvm==="own"?"só o resgatável":PVL[pvm]}.`:`Só exibido (${PVL[pvm]}), fora do Saldo geral.`} Último saldo informado de cada parte, sem descontar imposto nem taxa de resgate. Atualize em Contas > ⚙ da conta.</div>`],
    inv:()=>["Investimentos",Object.keys(icl).filter(k=>Math.abs(icl[k])>=0.005).map(k=>`<div class="row"><span>${ICLS[k]||k}</span><span>${mm(icl[k])}</span></div>`).join("")+`<div class="row"><span>Caixa e poupança (sem ativo)</span><span>${mm(cashI)}</span></div><div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(invTot)}</b></div><div class="mu">Toque no valor de cada classe ou do caixa no Painel para ver os ativos e as contas.</div>`],
    icash:()=>["Caixa e poupança (sem ativo)",(bl.invSum||[]).filter(x=>iok(x.account_id)&&Math.abs(Number(x.cash||0))>=0.005).map(x=>`<div class="row"><span>${esc(ddAccName(x.account_id))}</span><span>${mm(x.cash)}</span></div>`).join("")+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(cashI)}</b></div>`]};
  const ddInv=k=>{const L=(ip.data||[]).filter(p=>p.is_active&&iok(p.account_id)&&Number(p.qty)>0&&p.class===k).sort((a,b)=>Number(b.current_value)-Number(a.current_value));
    return [ICLS[k]||k,L.map(p=>`<div class="row"><div><div>${esc(p.ticker||p.name||"Ativo")}</div><div class="mu">${p.ticker&&p.name?esc(p.name)+" · ":""}${esc(ddAccName(p.account_id))}</div></div><span>${mm(p.current_value)}</span></div>`).join("")+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(icl[k])}</b></div>`];};
  /* Resultado: mesmas regras da period_summary (contas ativas corrente, dinheiro, cartão e vale; sem transferências; posted ou data até hoje; cartão pela fatura no modo "pela fatura") */
  const ddRes=async pos=>{
    const c=ddOpen(pos?"Receitas do período":"Despesas do período",'<p class="mu">Carregando…</p>');
    const ok=S.accounts.filter(a=>["checking","cash","credit_card","benefit"].includes(a.type)).map(a=>a.id),cards=S.accounts.filter(a=>a.type==="credit_card").map(a=>a.id);
    if(!ok.length){c.innerHTML='<p class="mu">Nenhuma conta.</p>';return;}
    const r=await ddAll(()=>{let q=sb.from("transactions").select("id,date,amount,fx_rate_to_base,description,account_id,category_id,status,statement_month,installment_number,installment_total").eq("household_id",hid).is("transfer_group_id",null).in("account_id",ok);
      q=pos?q.gt("amount",0):q.lt("amount",0);
      if(cm()==="stm"&&cards.length){const L=cards.join(","),m0=pr[0].slice(0,8)+"01";q=q.or(`and(account_id.in.(${L}),statement_month.gte.${m0},statement_month.lt.${pr[1]}),and(account_id.not.in.(${L}),date.gte.${pr[0]},date.lt.${pr[1]})`);}
      else q=q.gte("date",pr[0]).lt("date",pr[1]);
      return q.order("date",{ascending:false}).order("id");});
    if(!$("ddc"))return;
    if(r.error){c.innerHTML=`<p class="neg">${esc(r.error.message)}</p>`;return;}
    const L=r.data.filter(t=>t.status==="posted"||t.date<=today()),val=t=>Math.abs(Number(t.amount)*Number(t.fx_rate_to_base||1)),T=L.reduce((s,t)=>s+val(t),0),ref=Math.abs(pos?inc:exp);
    c.innerHTML=ddCatList(L,val)+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(T)}</b></div>`+(Math.abs(T-ref)>=0.01?`<div class="mu neg">Difere do Painel (${mm(ref)}); me avise para eu conferir.</div>`:"")+`<div class="mu">Por categoria; toque numa categoria para ver os lançamentos. ${cm()==="stm"?"Cartão pelo mês da fatura.":"Cartão pela data da compra."}</div>`;};
  /* Meta: mesmas regras da budget_progress (categoria e subcategorias de despesa; qualquer conta e situação; sem transferências; cartão pela fatura no mensal e anual quando "pela fatura") */
  const ddMeta=async(si,mi)=>{const x=SEC[si],m=(ps[si].data||[])[mi];if(!m)return;
    const c=ddOpen(esc(m.category_name)+" · "+esc(secTitle(x)),'<p class="mu">Carregando…</p>');
    const kids=id=>{const o=[id];for(let i=0;i<o.length;i++)S.catsAll.filter(z=>z.parent_id===o[i]).forEach(z=>o.push(z.id));return o;};
    const ids=m.category_id?kids(m.category_id):S.catsAll.filter(z=>z.kind==="expense").map(z=>z.id);
    const rd=new Date(x.ref+"T12:00:00");let f,t;
    if(x.p==="weekly"){const w=(rd.getDay()+6)%7,a=new Date(rd);a.setDate(rd.getDate()-w);const b=new Date(a);b.setDate(a.getDate()+6);const iso=z=>z.getFullYear()+"-"+String(z.getMonth()+1).padStart(2,"0")+"-"+String(z.getDate()).padStart(2,"0");f=iso(a);t=iso(b);}
    else if(x.p==="monthly"){f=x.ref.slice(0,8)+"01";t=mAdd(f,1);t=dAdd(t,0);const e=new Date(t+"T12:00:00");e.setDate(e.getDate()-1);t=e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0");}
    else{f=x.ref.slice(0,4)+"-01-01";t=x.ref.slice(0,4)+"-12-31";}
    const cards=S.accounts.filter(a=>a.type==="credit_card").map(a=>a.id);
    const r=ids.length?await ddAll(()=>{let q=sb.from("transactions").select("id,date,amount,fx_rate_to_base,description,account_id,category_id,status,statement_month,installment_number,installment_total").eq("household_id",hid).is("transfer_group_id",null).in("category_id",ids);
      if(cm()==="stm"&&x.p!=="weekly"&&cards.length){const L=cards.join(",");q=q.or(`and(account_id.in.(${L}),statement_month.gte.${f},statement_month.lte.${t}),and(account_id.not.in.(${L}),date.gte.${f},date.lte.${t})`);}
      else q=q.gte("date",f).lte("date",t);
      return q.order("date",{ascending:false}).order("id");}):{data:[]};
    if(!$("ddc"))return;
    if(r.error){c.innerHTML=`<p class="neg">${esc(r.error.message)}</p>`;return;}
    const val=z=>-Number(z.amount)*Number(z.fx_rate_to_base||1),T=r.data.reduce((s,z)=>s+val(z),0);
    c.innerHTML=`<div class="mu">${fdt(f)} a ${fdt(t)} · meta ${mm(m.budget_amount)}</div>`+ddCatList(r.data,val)+`<div class="row" style="border-top:2px solid var(--ac)"><b>Gasto</b><b>${mm(T)}</b></div>`+(Math.abs(T-Number(m.spent))>=0.01?`<div class="mu neg">Difere da meta (${mm(m.spent)}); me avise para eu conferir.</div>`:"")+'<div class="mu">Inclui previstos e parcelas futuras do período; estornos (valores positivos) abatem o gasto.</div>';};
  document.querySelectorAll("[data-dd]").forEach(el=>el.onclick=()=>{const k=el.dataset.dd;
    if(k==="rinc"||k==="rexp")return ddRes(k==="rinc");
    if(k==="pf:loan"&&sit==="tudo"){const dias=d=>Math.round((new Date(today()+"T12:00:00")-new Date(d+"T12:00:00"))/864e5);
      const c=ddOpen("Financiamentos e empréstimos a pagar",LC.map(x=>`<div class="row"><div><div>${esc(x.l.name)}</div><div class="mu">${x.usa?`saldo devedor em ${fdt(x.l.payoff_date)}${dias(x.l.payoff_date)>60?' <span class="neg">(desatualizado)</span>':""} · parcelas restantes ${mm(x.parc)} · economia ${mm(-x.parc-x.pa)}`:`${x.R.length} parcela(s) restante(s) · saldo devedor não informado`}</div></div><span>${mm(x.val)}</span></div>`).join("")
        +`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(loanVal)}</b></div><div class="mu">Contrato com saldo devedor informado entra pelo saldo devedor (para quitar hoje); sem ele, pela soma das parcelas restantes. Informe em Financiamentos.</div><button class="sec" id="ddgl">🏦 Abrir Financiamentos</button>`);
      $("ddgl").onclick=()=>{ddClose();go("loans");};return;}
    if(k.startsWith("pf:")){const g=k.slice(3),T={card:"Parcelas e compras do cartão a vencer",loan:"Financiamentos e empréstimos a pagar",out:"Outros previstos"}[g];
      ddOpen(esc(T),ddCatList(FG[g],fv)+`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${mm(fs(g))}</b></div><div class="mu">Lançamentos previstos com data ${sit==="mes"?"de amanhã até "+fdt(fimMes):"a partir de amanhã"}; despesas negativas e receitas positivas.</div>`);return;}
    const [t,h]=k.startsWith("icl:")?ddInv(k.slice(4)):DD[k]();const c=ddOpen(esc(t),h);
    c.querySelectorAll("[data-dl2]").forEach(b=>b.onclick=()=>{ddClose();S.acmId=b.dataset.dl2;go("acm");});
    c.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>{ddClose();S.fAcc=b.dataset.dl;S.fWal=null;S.fTrip=null;S.lper="mon";S.lmon=today().slice(0,8)+"01";S.lim=50;go("list");});});
  document.querySelectorAll("[data-mt]").forEach(el=>el.onclick=()=>{const [a,b]=el.dataset.mt.split("|");ddMeta(+a,+b);});
  $("gl").onclick=()=>go("loans");
  if($("gi"))$("gi").onclick=()=>go("inv");
  if($("gu"))$("gu").onclick=()=>{S.lim=50;S.lper="all";go("list");};
}

