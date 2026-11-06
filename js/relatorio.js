/* ================= RELATÓRIO DO MÊS (botão 📄 em Lançamentos; rota "rel") =================
   Blocos: Resumo (period_summary, como o Resultado do Painel em Mês), Contas (saldo do começo do mês, movimento e saldo final,
   pelas regras do quadro de Lançamentos), Lançamentos por conta e Por categoria (mesmas regras do Resumo).
   Exporta: PDF pela impressão do navegador e planilha .xlsx (gerador próprio, sem biblioteca externa) para subir no Google Drive. */
document.head.insertAdjacentHTML("beforeend",`<style>
@media print{body.relp nav,body.relp .noprint,body.relp #hb{display:none!important}
 body.relp{background:#fff!important;color:#000!important;padding-bottom:0!important}
 body.relp .card{box-shadow:none!important;border:1px solid #bbb!important}
 body.relp .row{break-inside:avoid}body.relp .mu{color:#444!important}
 body.relp details>summary::marker,body.relp details>summary::-webkit-details-marker{display:none;content:""}}
</style>`);
let RL=null;
const RL_IK={juros:"Juros",dividendo:"Dividendo",jcp:"JCP",rendimento_fii:"Rendimento de FII",outros:"Outros"};

async function viewRel(){
  const hid=S.hid,m0=S.rmon||(S.rmon=today().slice(0,8)+"01"),m1=mAdd(m0,1),pm=mAdd(m0,-1),md=cm();
  $("main").innerHTML=`<div class="card mu" id="rlw">Carregando o relatório de ${esc(mlab(m0))}…</div>`;
  const A=S.accounts.slice(),ids=A.map(a=>a.id),cards=A.filter(a=>a.type==="credit_card").map(a=>a.id);
  if(!ids.length){$("rlw").textContent="Nenhuma conta ativa.";return;}
  const byStm=md==="stm"&&cards.length>0;
  const sel="id,account_id,date,amount,currency,fx_rate_to_base,description,status,category_id,transfer_group_id,installment_number,installment_total,statement_month,wallet_id,card_holder_id,trip_id,created_at";
  /* mesmo filtro de Lançamentos > Mês: cartão pelo mês da fatura no modo "pela fatura"; transferências e demais contas pela data */
  const txq=()=>{let q=sb.from("transactions").select(sel).eq("household_id",hid).in("account_id",ids);
    if(byStm){const L=cards.join(",");q=q.or(`and(transfer_group_id.not.is.null,date.gte.${m0},date.lt.${m1}),and(transfer_group_id.is.null,account_id.not.in.(${L}),date.gte.${m0},date.lt.${m1}),and(transfer_group_id.is.null,account_id.in.(${L}),statement_month.gte.${m0},statement_month.lt.${m1})`);}
    else q=q.gte("date",m0).lt("date",m1);
    return q.order("date").order("created_at").order("id");};
  const cc=A.filter(a=>a.type==="checking"||a.type==="cash"),bens=A.filter(a=>a.type==="benefit"),inv=A.filter(a=>a.type==="investment");
  const none=Promise.resolve({data:[]});
  const [tx,rs,cl,bb,wm,io,ii]=await Promise.all([
    ddAll(txq),
    sb.rpc("period_summary",{p_household:hid,p_from:m0,p_to:m1,p_card_mode:md}),
    sb.from("balance_closings").select("account_id,reported_balance").eq("household_id",hid).eq("ref_month",pm),
    Promise.all(cc.map(a=>sb.rpc("account_balance_before",{p_account:a.id,p_date:m0}))),
    Promise.all(bens.map(a=>walMonth(a,m0))),
    inv.length?ddAll(()=>sb.from("investment_operations").select("id,date,side,quantity,amount,fees,created_at,investment_assets(account_id,name,ticker)").eq("household_id",hid).gte("date",m0).lt("date",m1).order("date").order("id")):none,
    inv.length?ddAll(()=>sb.from("investment_income").select("id,date,kind,net,created_at,investment_assets(account_id,name,ticker)").eq("household_id",hid).gte("date",m0).lt("date",m1).order("date").order("id")):none]);
  if(!$("rlw")||S.hid!==hid||S.rmon!==m0||S.tab!=="rel")return;
  const e=[tx,rs,cl,io,ii,...bb].find(r=>r.error);
  if(e){$("rlw").className="card neg";$("rlw").textContent=e.error.message;return;}
  const T=tx.data;
  /* a outra ponta de cada transferência (para mostrar "para / de qual conta") */
  const tg=[...new Set(T.filter(t=>t.transfer_group_id).map(t=>t.transfer_group_id))],oth={};
  for(let i=0;i<tg.length;i+=100){const r=await sb.from("transactions").select("id,transfer_group_id,account_id").in("transfer_group_id",tg.slice(i,i+100));
    (r.data||[]).forEach(x=>{(oth[x.transfer_group_id]=oth[x.transfer_group_id]||[]).push(x);});}
  if(!$("rlw")||S.rmon!==m0)return;
  T.forEach(t=>{if(t.transfer_group_id){const o=(oth[t.transfer_group_id]||[]).find(x=>x.id!==t.id);t._oth=o?o.account_id:null;}});
  const CL={};(cl.data||[]).forEach(x=>{CL[x.account_id]=Number(x.reported_balance)||0;});
  /* operações e rendimentos de investimento, por conta */
  const an=x=>(x.investment_assets&&(x.investment_assets.ticker||x.investment_assets.name))||"Ativo",IV={};
  (io.data||[]).forEach(o=>{const a=o.investment_assets&&o.investment_assets.account_id;if(!a)return;const sell=o.side==="sell",am=Number(o.amount),fe=Number(o.fees||0);
    (IV[a]=IV[a]||[]).push({date:o.date,v:sell?am-fe:-(am+fe),d:(sell?"Venda / resgate":"Compra")+" · "+an(o),k:"Operação de investimento"});});
  (ii.data||[]).forEach(i=>{const a=i.investment_assets&&i.investment_assets.account_id;if(!a)return;
    (IV[a]=IV[a]||[]).push({date:i.date,v:Number(i.net),d:"Rendimento ("+(RL_IK[i.kind]||i.kind)+") · "+an(i),k:"Rendimento de investimento"});});
  Object.values(IV).forEach(L=>L.sort((x,y)=>x.date.localeCompare(y.date)));
  const okS=t=>t.status==="posted"||t.status==="planned";
  const ACC=A.map(a=>{
    const cur=a.currency.trim(),L=T.filter(t=>t.account_id===a.id),isCC=a.type==="checking"||a.type==="cash";
    const Lm=L.filter(t=>okS(t)&&!(isCC&&a.opening_date&&t.date<=a.opening_date));
    const s={inc:0,exp:0,tin:0,tout:0,inv:0};
    Lm.forEach(t=>{const v=Number(t.amount)||0;if(t.transfer_group_id){if(v>0)s.tin+=v;else s.tout+=v;}else if(v>0)s.inc+=v;else s.exp+=v;});
    (IV[a.id]||[]).forEach(x=>{s.inv+=x.v;});
    let prev=null,src="",note="",W=null;
    if(isCC){const b=(bb[cc.indexOf(a)].data||[])[0];
      if(CL[a.id]!=null){prev=CL[a.id];src="fechamento de "+mlab(pm);}
      else{prev=b?Number(b.balance)||0:0;src=a.opening_date?"calculado (saldo inicial + lançamentos)":"calculado só pelos lançamentos, sem saldo inicial nem fechamento";}}
    else if(a.type==="benefit"){W=wm[bens.indexOf(a)];
      if(W.err)note=W.err;else{prev=W.T.p;s.inc=W.T.i;s.exp=W.T.e;s.tin=0;s.tout=0;src="soma das carteiras";}}
    else if(a.type==="credit_card"){src="cartão: veja a fatura";note=`${md==="stm"?"Fatura":"Compras"} de ${mlab(m0)}: ${fmt(-(s.inc+s.exp),cur)} (sem os pagamentos)`;}
    else if(CL[a.id]!=null){prev=CL[a.id];src="fechamento de "+mlab(pm);}
    else src="sem fechamento do mês anterior";
    if(a.type==="investment")note="Saldo do caixa da conta (sem o valor dos ativos).";
    const mov=s.inc+s.exp+s.tin+s.tout+s.inv;
    return {a,cur,L,s,prev,src,fin:prev==null?null:prev+mov,mov,note,W,IVL:IV[a.id]||[]};});
  /* por categoria: mesmas regras do Resumo (contas corrente, dinheiro, cartão e vale; sem transferências; realizados ou com data até hoje); receitas e despesas pelo sinal */
  const RT=new Set(["checking","cash","credit_card","benefit"]),bv=t=>Number(t.amount)*Number(t.fx_rate_to_base||1);
  const CT=T.filter(t=>!t.transfer_group_id&&A.some(a=>a.id===t.account_id&&RT.has(a.type))&&(t.status==="posted"||t.date<=today()));
  const top=id=>{let c=catById(id),k=0;while(c&&c.parent_id&&k<20){c=catById(c.parent_id);k++;}return c;};
  const CAT={expense:{},income:{}};
  CT.forEach(t=>{const v=bv(t),G=CAT[v<0?"expense":"income"],tp=t.category_id?top(t.category_id):null,tk=tp?tp.id:"";
    const g=G[tk]=G[tk]||{name:tp?tp.name:"Sem categoria",tot:0,n:0,sub:{}},sk=t.category_id||"",c=catById(t.category_id);
    const sg=g.sub[sk]=g.sub[sk]||{name:c?c.name:"Sem categoria",direct:sk===tk,tot:0,L:[]};
    g.tot+=Math.abs(v);g.n++;sg.tot+=Math.abs(v);sg.L.push(t);});
  const R0=(rs.data&&rs.data[0])||{};
  RL={hid,m0,pm,md,fam:(S.hs.find(h=>h.id===hid)||{}).name||"Família",at:new Date(),inc:Number(R0.income)||0,exp:Number(R0.expense)||0,
    ACC,CAT,proj:m0>=today().slice(0,8)+"01"};
  drawRel();}

/* ---------- tela ---------- */
function drawRel(){
  const D=RL;if(!D||!$("rlw"))return;
  const br=v=>fmt(Number(v)||0,"BRL"),sc=v=>v<0?"neg":"pos",mes=mlab(D.m0),FIN=D.proj?"Saldo final projetado":"Saldo final";
  const accN=id=>(S.accounts.find(a=>a.id===id)||{}).name||"conta inativa";
  const parts=x=>[x.s.inc?"receitas "+fmt(x.s.inc,x.cur):"",x.s.exp?"despesas "+fmt(x.s.exp,x.cur):"",x.s.tin?"transf. de entrada "+fmt(x.s.tin,x.cur):"",x.s.tout?"transf. de saída "+fmt(x.s.tout,x.cur):"",x.s.inv?"operações e rendimentos "+fmt(x.s.inv,x.cur):""].filter(Boolean).join(" · ");
  const ccB=D.ACC.filter(x=>(x.a.type==="checking"||x.a.type==="cash")&&x.cur==="BRL"),ccP=ccB.reduce((t,x)=>t+x.prev,0),ccF=ccB.reduce((t,x)=>t+x.fin,0);
  const accHtml=D.ACC.map(x=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span><b>${esc(x.a.name)}</b> <span class="mu">${TYPES[x.a.type]||x.a.type}${x.cur!=="BRL"?" · "+esc(x.cur):""}</span></span><b class="${x.fin==null?"":sc(x.fin)}">${x.fin==null?"—":fmt(x.fin,x.cur)}</b></div>
    <div class="mu">Saldo inicial: ${x.prev==null?"—":fmt(x.prev,x.cur)} (${esc(x.src)})${parts(x)?" · "+parts(x):""}${x.prev!=null&&!x.mov?" · sem movimento":""}</div>
    ${x.W&&!x.W.err?x.W.rows.map(r=>`<div class="mu" style="padding-left:12px">${esc(r.w.name)}: inicial ${fmt(r.p,x.cur)}${r.hasC?"":" (calculado)"} · créditos ${fmt(r.i,x.cur)} · gastos ${fmt(r.e,x.cur)} → <b>${fmt(r.f,x.cur)}</b></div>`).join(""):""}
    ${x.note?`<div class="mu">${esc(x.note)}</div>`:""}</div>`).join("");
  const rowT=t=>{const st=t.status==="planned"&&t.date>today()?" · previsto":"",c=t.category_id?catName(t.category_id):(t.transfer_group_id?"Transferência":"Sem categoria"),
      tr=t.transfer_group_id?(Number(t.amount)<0?" · para ":" · de ")+esc(accN(t._oth)):"",cd=S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")&&t.statement_month?" · fatura "+t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):"";
    return `<div class="row"><div><div>${esc(t.description||c)}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div><div class="mu">${fdt(t.date)} · ${esc(c)}${tr}${cd}${t.wallet_id?" · "+esc(walletName(t.wallet_id)):""}${t.card_holder_id&&holdersOf(t.account_id).length>1?" · "+esc(holderName(t.card_holder_id)):""}${t.trip_id&&tripName(t.trip_id)?" · "+esc(tripName(t.trip_id)):""}${st}</div></div><span class="${Number(t.amount)<0?"neg":"pos"}" style="white-space:nowrap">${fmt(Number(t.amount),t.currency)}</span></div>`;};
  const rowI=(x,cur)=>`<div class="row"><div><div>${esc(x.d)}</div><div class="mu">${fdt(x.date)} · ${esc(x.k.toLowerCase())}</div></div><span class="${x.v<0?"neg":"pos"}" style="white-space:nowrap">${fmt(x.v,cur)}</span></div>`;
  const lanHtml=D.ACC.filter(x=>x.L.length||x.IVL.length).map(x=>{const M=x.L.map(t=>({d:t.date,h:rowT(t)})).concat(x.IVL.map(i=>({d:i.date,h:rowI(i,x.cur)}))).sort((p,q)=>p.d.localeCompare(q.d));
    return `<details><summary><div class="row" style="display:inline-flex;width:calc(100% - 20px);border:0;padding:6px 0"><span><b>${esc(x.a.name)}</b> <span class="mu">· ${M.length} lanç.</span></span><b class="${sc(x.mov)}">${fmt(x.mov,x.cur)}</b></div></summary>${M.map(m=>m.h).join("")}</details>`;}).join("")||'<p class="mu">Nenhum lançamento neste mês.</p>';
  const catHtml=(G,lab,ref)=>{const K=Object.values(G).sort((a,b)=>b.tot-a.tot),tot=K.reduce((t,g)=>t+g.tot,0);
    return `<b style="display:block;margin-top:10px">${lab}</b>`+(K.map(g=>{const SB=Object.values(g.sub).sort((a,b)=>b.tot-a.tot),multi=SB.length>1||(SB[0]&&!SB[0].direct);
      return `<details><summary><div class="row" style="display:inline-flex;width:calc(100% - 20px);border:0;padding:6px 0"><span>${esc(g.name)} <span class="mu">· ${g.n}</span></span><b>${br(g.tot)}</b></div></summary>
        ${SB.map(sg=>`${multi?`<div class="row" style="padding-left:8px"><span><b>${esc(sg.direct?g.name+" (direto)":sg.name)}</b></span><b>${br(sg.tot)}</b></div>`:""}${sg.L.sort((a,b)=>a.date.localeCompare(b.date)).map(t=>`<div class="row" style="padding-left:${multi?20:8}px"><div><div>${esc(t.description||sg.name)}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div><div class="mu">${fdt(t.date)} · ${esc(accN(t.account_id))}</div></div><span style="white-space:nowrap">${br(Math.abs(Number(t.amount)*Number(t.fx_rate_to_base||1)))}</span></div>`).join("")}`).join("")}</details>`;}).join("")||'<p class="mu">Nenhum.</p>')
      +`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${br(tot)}</b></div>${Math.abs(tot-Math.abs(ref))>=0.01?`<div class="mu neg">Difere do Resumo (${br(Math.abs(ref))}); me avise para eu conferir.</div>`:""}`;};
  $("main").innerHTML=`<div class="card" id="rlw"><button class="lk noprint" id="rlbk">← Lançamentos</button> <b>📄 Relatório do mês</b>
    <div class="row noprint" style="align-items:center"><button class="x" id="rlp">‹</button><b>${esc(mes)}</b><button class="x" id="rln">›</button></div>
    <div class="mu">${esc(D.fam)} · ${esc(mes)} · cartão ${D.md==="stm"?"pela fatura":"pela compra"} · gerado em ${D.at.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</div>
    <div class="noprint" style="display:flex;gap:8px;margin-top:8px"><button class="sec" id="rlpdf" style="flex:1">🖨️ Gerar PDF</button><button class="sec" id="rlxl" style="flex:1">📊 Baixar Excel</button></div><p id="rlmsg" class="mu noprint"></p></div>
  <div class="card"><b>Resumo do mês</b>
    <div class="row"><span>Receitas</span><span class="pos">${br(D.inc)}</span></div><div class="row"><span>Despesas</span><span class="neg">${br(D.exp)}</span></div>
    <div class="row"><b>Resultado</b><b class="${sc(D.inc+D.exp)}">${br(D.inc+D.exp)}</b></div>
    ${ccB.length?`<div class="row"><span>Contas correntes e dinheiro em reais: saldo inicial</span><span class="${sc(ccP)}">${br(ccP)}</span></div><div class="row"><span>${FIN} das contas correntes e dinheiro em reais</span><b class="${sc(ccF)}">${br(ccF)}</b></div>`:""}
    <div class="mu">Receitas, despesas e resultado como no Resultado do Painel (Mês): contas corrente, dinheiro, cartão e vale, sem transferências, só realizados ou com data até hoje.${D.proj?" O saldo final do mês atual inclui os previstos até o fim do mês.":""}</div></div>
  <div class="card"><b>Contas</b>${accHtml}<div class="mu">Saldo inicial = saldo no começo do mês: fechamento do mês anterior (valor do extrato) ou, sem fechamento, calculado. Saldo final = inicial + movimento do mês (inclui previstos), como em Lançamentos. Cada conta na sua moeda.</div></div>
  <div class="card"><b>Lançamentos por conta</b><div class="mu noprint">Toque numa conta para abrir os lançamentos. No PDF, tudo sai aberto.</div>${lanHtml}</div>
  <div class="card"><b>Lançamentos por categoria</b>${catHtml(D.CAT.expense,"Despesas",D.exp)}${catHtml(D.CAT.income,"Receitas",D.inc)}<div class="mu">Mesmas regras do Resumo; estornos (valores positivos) aparecem em Receitas, como no Painel. Em R$ (moeda estrangeira pela taxa do lançamento).</div></div>`;
  $("rlbk").onclick=()=>go("list");
  $("rlp").onclick=()=>{S.rmon=mAdd(D.m0,-1);viewRel();};$("rln").onclick=()=>{S.rmon=mAdd(D.m0,1);viewRel();};
  $("rlpdf").onclick=()=>{document.querySelectorAll("#main details").forEach(d=>d.open=true);document.body.classList.add("relp");
    const t0=document.title;document.title="Oikonomia_"+D.m0.slice(0,7);
    window.addEventListener("afterprint",()=>{document.body.classList.remove("relp");document.title=t0;},{once:true});window.print();};
  $("rlxl").onclick=()=>{try{rlXlsx();$("rlmsg").textContent="Planilha gerada ✓ Suba o arquivo no Google Drive e abra com o Google Sheets.";}catch(e){$("rlmsg").textContent="Erro ao gerar a planilha: "+e.message;}};}

/* ---------- planilha .xlsx ---------- */
function rlXlsx(){
  const D=RL,mes=mlab(D.m0),accN=id=>(S.accounts.find(a=>a.id===id)||{}).name||"conta inativa",FIN=D.proj?"Saldo final projetado":"Saldo final";
  const N=v=>({n:Math.round((Number(v)||0)*100)/100}),Dt=s=>({d:s}),B=s=>({b:s});
  const r2=v=>v==null?"":N(v);
  /* Resumo */
  const ccB=D.ACC.filter(x=>(x.a.type==="checking"||x.a.type==="cash")&&x.cur==="BRL");
  const s1=[[B("Relatório do mês"),mes],["Família",D.fam],["Cartão",D.md==="stm"?"pela fatura (mês do vencimento)":"pela data da compra"],["Gerado em",D.at.toLocaleString("pt-BR")],[],
    [B("Receitas"),N(D.inc)],[B("Despesas"),N(D.exp)],[B("Resultado"),N(D.inc+D.exp)],[],
    ...(ccB.length?[[B("Contas correntes e dinheiro em reais")],["Saldo inicial",N(ccB.reduce((t,x)=>t+x.prev,0))],[FIN,N(ccB.reduce((t,x)=>t+x.fin,0))],[]]:[]),
    ["Receitas, despesas e resultado como no Resultado do Painel (Mês): contas corrente, dinheiro, cartão e vale, sem transferências."]];
  /* Contas */
  const s2=[["Conta","Tipo","Moeda","Saldo inicial","Origem do saldo inicial","Receitas","Despesas","Transferências de entrada","Transferências de saída","Operações e rendimentos","Movimento do mês",FIN,"Observação"].map(B)];
  D.ACC.forEach(x=>{s2.push([x.a.name,TYPES[x.a.type]||x.a.type,x.cur,r2(x.prev),x.src,N(x.s.inc),N(x.s.exp),N(x.s.tin),N(x.s.tout),N(x.s.inv),N(x.mov),r2(x.fin),x.note]);
    if(x.W&&!x.W.err)x.W.rows.forEach(r=>s2.push(["   "+x.a.name+" › "+r.w.name+(r.w.is_active?"":" (inativa)"),"Carteira",x.cur,N(r.p),r.hasC?"fechamento por carteira":"calculado",N(r.i),N(r.e),"","","",N(r.i+r.e),N(r.f),""]));});
  /* Lançamentos (um por linha, agrupados por conta) */
  const s3=[["Conta","Data","Descrição","Categoria-mãe","Subcategoria","Valor","Moeda","Valor em R$","Situação","Parcela","Fatura","Transferência com","Carteira","Portador","Viagem"].map(B)];
  D.ACC.forEach(x=>{const M=x.L.map(t=>({d:t.date,t})).concat(x.IVL.map(i=>({d:i.date,i}))).sort((p,q)=>p.d.localeCompare(q.d));
    M.forEach(({t,i})=>{
      if(i){s3.push([x.a.name,Dt(i.date),i.d,i.k,"",N(i.v),x.cur,x.cur==="BRL"?N(i.v):"","Realizado","","","","","",""]);return;}
      const c=catById(t.category_id),tp=c&&c.parent_id?catById(c.parent_id):null,v=Number(t.amount);
      s3.push([x.a.name,Dt(t.date),t.description||"",t.transfer_group_id?"Transferência":tp?tp.name:c?c.name:"Sem categoria",tp?c.name:"",N(v),t.currency.trim(),N(v*Number(t.fx_rate_to_base||1)),
        t.status==="planned"&&t.date>today()?"Previsto":"Realizado",t.installment_total?t.installment_number+"/"+t.installment_total:"",
        S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")&&t.statement_month?t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):"",
        t.transfer_group_id?(v<0?"para ":"de ")+accN(t._oth):"",t.wallet_id?walletName(t.wallet_id):"",t.card_holder_id?holderName(t.card_holder_id):"",t.trip_id&&tripName(t.trip_id)?tripName(t.trip_id).replace(/^\S+\s/,""):""]);});});
  /* Por categoria */
  const s4=[["Tipo","Categoria-mãe","Subcategoria","Total (R$)","Nº de lançamentos"].map(B)];
  [["expense","Despesas",D.exp],["income","Receitas",D.inc]].forEach(([k,lab])=>{const K=Object.values(D.CAT[k]).sort((a,b)=>b.tot-a.tot);
    K.forEach(g=>{s4.push([lab,B(g.name),"",N(g.tot),g.n]);const SB=Object.values(g.sub).sort((a,b)=>b.tot-a.tot);
      if(SB.length>1||(SB[0]&&!SB[0].direct))SB.forEach(sg=>s4.push([lab,g.name,sg.direct?"(direto)":sg.name,N(sg.tot),sg.L.length]));});
    s4.push([B("Total "+lab.toLowerCase()),"","",N(K.reduce((t,g)=>t+g.tot,0)),""],[]);});
  const blob=xlsxBlob([{name:"Resumo",rows:s1,w:[38,40]},{name:"Contas",rows:s2,w:[32,20,7,14,40,13,13,14,14,14,14,16,50]},
    {name:"Lançamentos",rows:s3,w:[24,11,40,22,22,13,7,13,11,8,9,26,16,14,22]},{name:"Por categoria",rows:s4,w:[12,28,28,14,10]}]);
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Oikonomia_"+D.m0.slice(0,7)+".xlsx";document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

/* gerador mínimo de .xlsx (Office Open XML num zip sem compressão). Célula: texto, {n: número em R$}, {d:"aaaa-mm-dd"}, {b: texto em negrito} */
function xlsxBlob(sheets){
  const X=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const col=i=>{let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
  const ser=d=>{const [y,m,dd]=d.split("-").map(Number);return (Date.UTC(y,m-1,dd)-Date.UTC(1899,11,30))/864e5;};
  const cell=(v,r,c)=>{const ref=col(c)+(r+1);if(v==null||v==="")return "";
    if(typeof v==="object"){if("n" in v)return `<c r="${ref}" s="1"><v>${v.n}</v></c>`;if("d" in v)return `<c r="${ref}" s="2"><v>${ser(v.d)}</v></c>`;if("b" in v)return `<c r="${ref}" s="3" t="inlineStr"><is><t xml:space="preserve">${X(v.b)}</t></is></c>`;}
    if(typeof v==="number")return `<c r="${ref}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`;};
  const sheetXml=sh=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sh.w.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sh.rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,i,j)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const F={"[Content_Types].xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${X(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`};
  sheets.forEach((s,i)=>{F[`xl/worksheets/sheet${i+1}.xml`]=sheetXml(s);});
  /* zip sem compressão (método 0), com CRC-32 */
  const enc=new TextEncoder(),CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  const now=new Date(),dt=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),tm=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  const parts=[],cen=[];let off=0;
  Object.keys(F).forEach(name=>{const nb=enc.encode(name),data=enc.encode(F[name]),c=crc(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);
    h.setUint32(14,c,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nb.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nb,data);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(10,0,true);e.setUint16(12,tm,true);e.setUint16(14,dt,true);
    e.setUint32(16,c,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,nb.length,true);e.setUint32(42,off,true);
    cen.push(new Uint8Array(e.buffer),nb);off+=30+nb.length+data.length;});
  const cs=cen.reduce((t,b)=>t+b.length,0),z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,Object.keys(F).length,true);z.setUint16(10,Object.keys(F).length,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(z.buffer)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});}
