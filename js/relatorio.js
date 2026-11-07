/* ================= RELATÓRIO DO MÊS (botão 📄 em Lançamentos; rota "rel") =================
   Blocos: Resumo (period_summary, como o Resultado do Painel em Mês), Contas (saldo do começo do mês, movimento e saldo final,
   pelas regras do quadro de Lançamentos), Lançamentos por conta e Por categoria (mesmas regras do Resumo).
   Exporta: PDF pela impressão do navegador e planilha .xlsx (gerador próprio, sem biblioteca externa) para subir no Google Drive.
   Desde 06/11/2026 (v2): blocos Investimentos (posições no fim do mês, como Rentabilidade e Relatório de IR) e Viagens e passeios
   (só quando há lançamento do mês com viagem), também nas abas Investimentos e Viagens do Excel. */
document.head.insertAdjacentHTML("beforeend",`<style>
/* hierarquia do relatório: rlh1 = título do bloco; rlh2 = subtítulo (Despesas, Receitas, Por classe); rlg = categoria-mãe; rls = subcategoria; rlt = lançamento */
/* rlh3 = título de grupo dentro de um bloco (classe de investimento); rlx = linha de título com valor à direita */
.rlh1{display:block;font-size:1.4rem;font-weight:700;margin-bottom:8px}
.rlh2{display:block;font-size:1.15rem;font-weight:700;margin-top:18px;padding-bottom:3px;border-bottom:2px solid var(--ac)}
.rlh3{display:block;font-size:1rem;font-weight:700;color:var(--ac);margin-top:10px;padding-bottom:2px;border-bottom:1px solid var(--bd,#ddd)}
.rlx{display:flex!important;justify-content:space-between;gap:8px;align-items:baseline}
.rlg{font-size:1.1rem;font-weight:700}
.row.rls{padding-left:14px;font-size:1rem;font-weight:700}
.row.rlt{font-size:.85rem}
.rlacc{font-size:1.02rem}
details>summary.rlsum{list-style:none;display:block;cursor:pointer}details>summary.rlsum::-webkit-details-marker{display:none}
.rlcar::before{content:"▸";display:inline-block;width:1.1em;font-size:.8em;color:var(--mu,#888)}details[open]>summary .rlcar::before{content:"▾"}
@media print{body.relp .rlh1{font-size:17pt}body.relp .rlh2{font-size:13.5pt}body.relp .rlh3{font-size:11.5pt}body.relp .rlg{font-size:12.5pt}body.relp .rls{font-size:11pt}body.relp .rlt{font-size:9pt}body.relp .rlacc{font-size:11pt}
 body.relp .rlh1,body.relp .rlh2,body.relp .rlh3{break-after:avoid}body.relp .rlcar{display:none}}
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
  /* investimentos: posições no FIM do mês (no mês atual ou futuro, hoje), pelas regras da Rentabilidade e do Relatório de IR:
     quantidade e custo da última operação até a data (qty_after, cost_after); valor = última cotação até a data (quote: qtd × cotação;
     total: valor informado); sem cotação, o custo. No mês atual, o valor vem de investment_positions (como o Painel e Investimentos).
     Caixa: mês atual = investment_account_summary; mês passado = fechamento do mês ou closing_balance (calculado pelo app). */
  const td=today(),curM=td.slice(0,8)+"01",now=m0>=curM,
    D1=now?td:(()=>{const x=new Date(m1+"T12:00:00");x.setDate(x.getDate()-1);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");})();
  let INV=null;
  if(inv.length){
    const [ast,ops,snp,pos,csh,clm]=await Promise.all([
      ddAll(()=>sb.from("investment_assets").select("id,account_id,class,price_mode,ticker,name,is_active").eq("household_id",hid).order("name").order("id")),
      ddAll(()=>sb.from("investment_operations").select("id,asset_id,date,qty_after,cost_after,created_at").eq("household_id",hid).lte("date",D1).order("date").order("created_at").order("id")),
      ddAll(()=>sb.from("investment_snapshots").select("asset_id,date,value").lte("date",D1).order("date").order("asset_id")),
      now?sb.from("investment_positions").select("asset_id,qty,current_value,last_value,last_date").eq("household_id",hid):none,
      now?sb.from("investment_account_summary").select("account_id,cash").eq("household_id",hid):none,
      now?none:sb.from("balance_closings").select("account_id,reported_balance").eq("household_id",hid).eq("ref_month",m0)]);
    if(!$("rlw")||S.rmon!==m0)return;
    const ie=[ast,ops,snp,pos,csh,clm].find(r=>r.error);
    if(ie)INV={err:ie.error.message,D1,now};
    else{
      const AM={},OB={},SB={},PV={},lastAt=(L,d)=>{let r=null;(L||[]).forEach(x=>{if(x.date<=d)r=x;});return r;};
      ast.data.filter(a=>inv.some(x=>x.id===a.account_id)).forEach(a=>{AM[a.id]=a;});
      ops.data.forEach(o=>{if(AM[o.asset_id])(OB[o.asset_id]=OB[o.asset_id]||[]).push(o);});
      snp.data.forEach(x=>{if(AM[x.asset_id])(SB[x.asset_id]=SB[x.asset_id]||[]).push(x);});
      (pos.data||[]).forEach(x=>{PV[x.asset_id]=x;});
      const P=Object.values(AM).map(a=>{const o=lastAt(OB[a.id],D1),q=o?Number(o.qty_after||0):0,c=o?Number(o.cost_after||0):0;if(!(q>0))return null;
        let v,sd;const w=now?PV[a.id]:null;
        if(w&&w.current_value!=null){v=Number(w.current_value)||0;sd=w.last_value!=null?w.last_date:null;}
        else{const x=lastAt(SB[a.id],D1);v=x?(a.price_mode==="quote"?q*Number(x.value):Number(x.value)):c;sd=x?x.date:null;}
        return {a,q,c:Math.round(c*100)/100,v:Math.round(v*100)/100,sd};}).filter(Boolean);
      const CA={};
      if(now)(csh.data||[]).forEach(x=>{CA[x.account_id]={v:Number(x.cash||0),s:"saldo de hoje"};});
      else{(clm.data||[]).forEach(x=>{CA[x.account_id]={v:Number(x.reported_balance),s:"informado no fechamento"};});
        await Promise.all(inv.filter(a=>!CA[a.id]).map(async a=>{const r=await sb.rpc("closing_balance",{p_account:a.id,p_ref:m0});
          const x=r.error?null:(Array.isArray(r.data)?Object.values(r.data[0]||{})[0]:r.data);
          CA[a.id]={v:x==null?null:Number(x),s:r.error?"indisponível: "+r.error.message:"calculado pelo app"};}));
        if(!$("rlw")||S.rmon!==m0)return;}
      INV={D1,now,P,CA};}}
  /* viagens com lançamento neste mês (mesmo filtro do relatório; inclui previstos, como a tela da viagem); custo total pela trip_summary */
  const TG={};T.filter(t=>t.trip_id&&!t.transfer_group_id).forEach(t=>{(TG[t.trip_id]=TG[t.trip_id]||[]).push(t);});
  let TRP=null;const tk=Object.keys(TG);
  if(tk.length){
    if(tk.some(id=>!tripById(id)))await loadTrips();
    const ts=await sb.from("trip_summary").select("*").eq("household_id",hid).in("trip_id",tk);
    if(!$("rlw")||S.rmon!==m0)return;
    const SM={};(ts.data||[]).forEach(x=>{SM[x.trip_id]=x;});
    TRP=tk.map(id=>{const t=tripById(id)||{id,name:"Viagem removida",kind:"viagem",start_date:"",end_date:""},L=TG[id].slice().sort((a,b)=>a.date.localeCompare(b.date)),
        sp=L.reduce((s,x)=>{const v=bv(x);return v<0?s-v:s;},0),rf=L.reduce((s,x)=>{const v=bv(x);return v>0?s+v:s;},0),C={};
      L.forEach(x=>{const v=bv(x);if(v<0){const k=x.category_id?catName(x.category_id):"Sem categoria";C[k]=(C[k]||0)-v;}});
      return {t,L,sp,rf,net:sp-rf,C,tot:SM[id]?Number(SM[id].net)||0:null,n:SM[id]?Number(SM[id].n)||0:null};})
      .sort((a,b)=>String(a.t.start_date).localeCompare(String(b.t.start_date)));
    if(ts.error)TRP.err=ts.error.message;}
  /* contas correntes e dinheiro em moeda estrangeira: valor em R$ (custo médio) no fim do mês, como em Lançamentos (account_balance_before na virada do mês) */
  const ccF=cc.filter(a=>a.currency.trim()!=="BRL"),pv=A.filter(a=>a.type==="pension"||a.type==="fgts");
  const [fxb,pp,pb]=await Promise.all([Promise.all(ccF.map(a=>sb.rpc("account_balance_before",{p_account:a.id,p_date:m1}))),
    pv.length?sb.from("account_parts").select("id,account_id,name,only_dismissal,is_active").eq("household_id",hid).in("account_id",pv.map(a=>a.id)):none,
    pv.length?ddAll(()=>sb.from("account_part_balances").select("part_id,date,value").eq("household_id",hid).lte("date",D1).order("date").order("part_id")):none]);
  if(!$("rlw")||S.rmon!==m0)return;
  ccF.forEach((a,i)=>{const r=(fxb[i].data||[])[0],x=ACC.find(z=>z.a.id===a.id);if(x&&r&&!fxb[i].error)x.fxB=Number(r.balance_base);});
  /* previdência e FGTS: último saldo informado de cada parte ativa até o fim do mês; só para exibir resgatável e potencial no bloco Contas */
  if(pv.length&&!pp.error&&!pb.error){const LB={};(pb.data||[]).forEach(r=>{LB[r.part_id]=r;});
    pv.forEach(a=>{const P=(pp.data||[]).filter(q=>q.account_id===a.id&&q.is_active);if(!P.length)return;const x=ACC.find(z=>z.a.id===a.id);if(!x)return;
      const it=P.map(q=>({n:q.name,pot:!!q.only_dismissal,v:LB[q.id]?Number(LB[q.id].value):null,d:LB[q.id]?LB[q.id].date:null}));
      x.parts={own:it.filter(q=>!q.pot).reduce((t,q)=>t+(q.v||0),0),pot:it.filter(q=>q.pot).reduce((t,q)=>t+(q.v||0),0),it};});}
  const R0=(rs.data&&rs.data[0])||{};
  RL={hid,m0,pm,md,fam:(S.hs.find(h=>h.id===hid)||{}).name||"Família",at:new Date(),inc:Number(R0.income)||0,exp:Number(R0.expense)||0,
    ACC,CAT,INV,TRP,D1,proj:m0>=today().slice(0,8)+"01"};
  drawRel();}

/* ---------- tela ---------- */
function drawRel(){
  const D=RL;if(!D||!$("rlw"))return;
  const br=v=>fmt(Number(v)||0,"BRL"),sc=v=>v<0?"neg":"pos",mes=mlab(D.m0),FIN=D.proj?"Saldo final projetado":"Saldo final";
  const accN=id=>(S.accounts.find(a=>a.id===id)||{}).name||"conta inativa";
  const parts=x=>[x.s.inc?"receitas "+fmt(x.s.inc,x.cur):"",x.s.exp?"despesas "+fmt(x.s.exp,x.cur):"",x.s.tin?"transf. de entrada "+fmt(x.s.tin,x.cur):"",x.s.tout?"transf. de saída "+fmt(x.s.tout,x.cur):"",x.s.inv?"operações e rendimentos "+fmt(x.s.inv,x.cur):""].filter(Boolean).join(" · ");
  const ccB=D.ACC.filter(x=>(x.a.type==="checking"||x.a.type==="cash")&&x.cur==="BRL"),ccP=ccB.reduce((t,x)=>t+x.prev,0),ccF=ccB.reduce((t,x)=>t+x.fin,0);
  /* ordem das contas no relatório: primeiro os grupos internacionais (2 ou mais contas com o mesmo group_name), depois por tipo */
  const TORD=["checking","cash","credit_card","benefit","investment","pension","fgts","loan","financing","other"],
    TLB={checking:"Contas correntes",cash:"Dinheiro",credit_card:"Cartões de crédito",benefit:"Vale (benefícios)",investment:"Investimentos (caixa)",pension:"Previdência",fgts:"FGTS",loan:"Empréstimos",financing:"Financiamentos",other:"Outras contas"};
  const gkey=a=>String(a.group_name||"").trim().toLowerCase(),GRP={};
  D.ACC.forEach(x=>{const k=gkey(x.a);if(k)(GRP[k]=GRP[k]||[]).push(x);});Object.keys(GRP).forEach(k=>{if(GRP[k].length<2)delete GRP[k];});
  const inG=x=>!!GRP[gkey(x.a)],tr=t=>{const i=TORD.indexOf(t);return i<0?99:i;};
  /* unidades: grupo internacional ou conta sozinha. Instituição (accounts.institution): as unidades da mesma instituição vêm primeiro,
     juntas (grupo internacional e depois por tipo); a instituição de um grupo é a da conta em reais. Depois, grupos sem instituição e os tipos. */
  const ikey=a=>String(a.institution||"").trim().toLowerCase(),UN=[],done={};D.ACC.forEach(x=>{delete x._gt;});
  D.ACC.forEach(x=>{if(inG(x)){const k=gkey(x.a);if(done[k])return;done[k]=1;const L=GRP[k].slice().sort((a,b)=>(b.cur==="BRL")-(a.cur==="BRL")||tr(a.a.type)-tr(b.a.type));
      UN.push({g:true,t:"🌎 "+L[0].a.group_name.trim(),L,a:L[0].a});}else UN.push({L:[x],a:x.a});});
  const INS={};UN.forEach(u=>{const k=ikey(u.a);if(k)(INS[k]=INS[k]||{t:"🏦 "+String(u.a.institution).trim(),U:[]}).U.push(u);});
  const uOrd=(p,q)=>(!!q.g-!!p.g)||tr(p.a.type)-tr(q.a.type)||p.a.name.localeCompare(q.a.name,"pt-BR"),free=UN.filter(u=>!ikey(u.a));
  const SECS=Object.keys(INS).sort((p,q)=>INS[p].t.localeCompare(INS[q].t,"pt-BR")).map(k=>{const us=INS[k].U.sort(uOrd);us.forEach(u=>{if(u.g)u.L[0]._gt=u.t;});return {inst:true,t:INS[k].t,items:us,L:us.flatMap(u=>u.L)};})
    .concat(free.filter(u=>u.g).sort((p,q)=>p.t.localeCompare(q.t,"pt-BR")).map(u=>({g:true,t:u.t,L:u.L})))
    .concat([...new Set(free.filter(u=>!u.g).map(u=>u.a.type))].sort((p,q)=>tr(p)-tr(q)).map(t=>({t:TLB[t]||TYPES[t]||t,L:free.filter(u=>!u.g&&u.a.type===t).map(u=>u.L[0])})));
  const ORD=SECS.flatMap(sc0=>sc0.L);D.SECS=SECS;
  const brlOf=x=>x.fin==null?null:(x.cur==="BRL"?x.fin:(x.fxB!=null?x.fxB:null));
  const accRow=x=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span><b class="rlacc">${esc(x.a.name)}</b> <span class="mu">${TYPES[x.a.type]||x.a.type}${x.cur!=="BRL"?" · "+esc(x.cur):""}</span></span><span style="text-align:right"><b class="rlacc ${x.fin==null?"":sc(x.fin)}">${x.fin==null?"—":fmt(x.fin,x.cur)}</b>${x.cur!=="BRL"&&x.fxB!=null?`<div class="mu">≈ ${br(x.fxB)}</div>`:""}</span></div>
    <div class="mu">Saldo inicial: ${x.prev==null?"—":fmt(x.prev,x.cur)} (${esc(x.src)})${parts(x)?" · "+parts(x):""}${x.prev!=null&&!x.mov?" · sem movimento":""}</div>
    ${x.W&&!x.W.err?x.W.rows.map(r=>`<div class="mu" style="padding-left:12px">${esc(r.w.name)}: inicial ${fmt(r.p,x.cur)}${r.hasC?"":" (calculado)"} · créditos ${fmt(r.i,x.cur)} · gastos ${fmt(r.e,x.cur)} → <b>${fmt(r.f,x.cur)}</b></div>`).join(""):""}
    ${x.parts?`<div class="row" style="border:0;padding:2px 0 0 12px"><span class="mu">Resgatável em ${fdt(D.D1)}</span><span>${br(x.parts.own)}</span></div><div class="row" style="border:0;padding:0 0 0 12px"><span class="mu">Potencial${x.a.type==="fgts"?" (multa FGTS)":""}</span><span>${br(x.parts.pot)}</span></div>
      <div class="mu" style="padding-left:12px">${x.parts.it.map(q=>esc(q.n)+": "+(q.v==null?"sem saldo":br(q.v)+" ("+fdt(q.d)+")")+(q.pot?" · potencial":"")).join(" · ")}</div>`:""}
    ${x.note?`<div class="mu">${esc(x.note)}</div>`:""}</div>`;
  const sumB=L=>L.reduce((t,x)=>t+(brlOf(x)||0),0),semV=L=>L.filter(x=>brlOf(x)==null);
  const accHtml=SECS.map(sc0=>{
    if(sc0.inst){const nv=semV(sc0.L);
      return `<div class="rlh2 rlx"><span>${esc(sc0.t)}</span><span>≈ ${br(sumB(sc0.L))}</span></div>${nv.length?`<div class="mu">Total em reais sem ${nv.map(x=>esc(x.a.name)).join(", ")} (sem saldo no mês${nv.some(x=>x.a.type==="credit_card")?"; cartão: veja a fatura":""}).</div>`:""}`
        +sc0.items.map(u=>u.g?`<div class="rlh3 rlx"><span>${esc(u.t)}</span><span>≈ ${br(sumB(u.L))}</span></div>${u.L.map(accRow).join("")}`:accRow(u.L[0])).join("");}
    const tb=sc0.g?sc0.L.reduce((t,x)=>t==null||brlOf(x)==null?null:t+brlOf(x),0):null;
    return `<div class="rlh2 rlx"><span>${esc(sc0.t)}</span>${sc0.g&&tb!=null?`<span>≈ ${br(tb)}</span>`:""}</div>${sc0.L.map(accRow).join("")}`;}).join("");
  const rowT=t=>{const st=t.status==="planned"&&t.date>today()?" · previsto":"",c=t.category_id?catName(t.category_id):(t.transfer_group_id?"Transferência":"Sem categoria"),
      tr=t.transfer_group_id?(Number(t.amount)<0?" · para ":" · de ")+esc(accN(t._oth)):"",cd=S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")&&t.statement_month?" · fatura "+t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):"";
    return `<div class="row"><div><div>${esc(t.description||c)}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div><div class="mu">${fdt(t.date)} · ${esc(c)}${tr}${cd}${t.wallet_id?" · "+esc(walletName(t.wallet_id)):""}${t.card_holder_id&&holdersOf(t.account_id).length>1?" · "+esc(holderName(t.card_holder_id)):""}${t.trip_id&&tripName(t.trip_id)?" · "+esc(tripName(t.trip_id)):""}${st}</div></div><span class="${Number(t.amount)<0?"neg":"pos"}" style="white-space:nowrap">${fmt(Number(t.amount),t.currency)}</span></div>`;};
  const rowI=(x,cur)=>`<div class="row"><div><div>${esc(x.d)}</div><div class="mu">${fdt(x.date)} · ${esc(x.k.toLowerCase())}</div></div><span class="${x.v<0?"neg":"pos"}" style="white-space:nowrap">${fmt(x.v,cur)}</span></div>`;
  const lanHtml=ORD.filter(x=>x.L.length||x.IVL.length).map(x=>{const M=x.L.map(t=>({d:t.date,h:rowT(t)})).concat(x.IVL.map(i=>({d:i.date,h:rowI(i,x.cur)}))).sort((p,q)=>p.d.localeCompare(q.d));
    return `<details><summary class="rlsum"><div class="rlh2 rlx" style="margin-top:14px"><span><span class="rlcar"></span>${esc(x.a.name)} <span class="mu" style="font-weight:400;font-size:.8rem">· ${TYPES[x.a.type]||x.a.type} · ${M.length} lanç.</span></span><span class="${sc(x.mov)}">${fmt(x.mov,x.cur)}</span></div></summary>${M.map(m=>m.h).join("")}</details>`;}).join("")||'<p class="mu">Nenhum lançamento neste mês.</p>';
  const catHtml=(G,lab,ref)=>{const K=Object.values(G).sort((a,b)=>b.tot-a.tot),tot=K.reduce((t,g)=>t+g.tot,0);
    return `<b class="rlh2">${lab}</b>`+(K.map(g=>{const SB=Object.values(g.sub).sort((a,b)=>b.tot-a.tot),multi=SB.length>1||(SB[0]&&!SB[0].direct);
      return `<details><summary class="rlsum"><div class="row" style="border:0;padding:6px 0"><span><span class="rlcar"></span><span class="rlg">${esc(g.name)} <span class="mu" style="font-weight:400">· ${g.n}</span></span></span><b class="rlg">${br(g.tot)}</b></div></summary>
        ${SB.map(sg=>`${multi?`<div class="row rls"><span>${esc(sg.direct?g.name+" (direto)":sg.name)}</span><span>${br(sg.tot)}</span></div>`:""}${sg.L.sort((a,b)=>a.date.localeCompare(b.date)).map(t=>`<div class="row rlt" style="padding-left:${multi?28:14}px"><div><div>${esc(t.description||sg.name)}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div><div class="mu">${fdt(t.date)} · ${esc(accN(t.account_id))}</div></div><span style="white-space:nowrap">${br(Math.abs(Number(t.amount)*Number(t.fx_rate_to_base||1)))}</span></div>`).join("")}`).join("")}</details>`;}).join("")||'<p class="mu">Nenhum.</p>')
      +`<div class="row" style="border-top:2px solid var(--ac)"><b>Total</b><b>${br(tot)}</b></div>${Math.abs(tot-Math.abs(ref))>=0.01?`<div class="mu neg">Difere do Resumo (${br(Math.abs(ref))}); me avise para eu conferir.</div>`:""}`;};
  /* bloco Investimentos */
  const pc=v=>(v>=0?"+":"−")+Math.abs(v).toFixed(1).replace(".",",")+"%";
  let invHtml="";
  if(D.INV){const I=D.INV;
    if(I.err)invHtml=`<div class="card"><b class="rlh1">Investimentos</b><p class="neg">${esc(I.err)}</p></div>`;
    else{
      const IA=D.ACC.filter(x=>x.a.type==="investment"),cash=id=>I.CA[id]&&I.CA[id].v!=null?I.CA[id].v:0;
      const totA=I.P.reduce((t,p)=>t+p.v,0),totC=IA.reduce((t,x)=>t+cash(x.a.id),0),TOT=totA+totC,part=v=>TOT>0?(v/TOT*100).toFixed(1).replace(".",",")+"%":"";
      const CL={};I.P.forEach(p=>{CL[p.a.class]=(CL[p.a.class]||0)+p.v;});
      const mv=x=>{const ops=x.IVL.filter(i=>i.k==="Operação de investimento"),b=ops.filter(i=>i.v<0).reduce((t,i)=>t+i.v,0),s=ops.filter(i=>i.v>0).reduce((t,i)=>t+i.v,0),r=x.IVL.filter(i=>i.k!=="Operação de investimento").reduce((t,i)=>t+i.v,0);
        return [x.s.tin?"aportes "+br(x.s.tin):"",x.s.tout?"resgates "+br(x.s.tout):"",b?"compras "+br(b):"",s?"vendas "+br(s):"",r?"rendimentos "+br(r):""].filter(Boolean).join(" · ");};
      const acc=x=>{const L=I.P.filter(p=>p.a.account_id===x.a.id).sort((a,b)=>clsR(a.a.class)-clsR(b.a.class)||b.v-a.v),c=I.CA[x.a.id]||{v:null,s:""},tot=L.reduce((t,p)=>t+p.v,0)+(c.v||0),m=mv(x);
        if(!L.length&&!(c.v)&&!m)return "";
        return `<details><summary class="rlsum"><div class="rlh2 rlx" style="margin-top:14px"><span><span class="rlcar"></span>${esc(x.a.name)} <span class="mu" style="font-weight:400;font-size:.8rem">· ${L.length} ${L.length===1?"posição":"posições"}</span></span><span>${br(tot)}</span></div></summary>
          ${L.map((p,ix)=>{const res=p.v-p.c,q=p.a.price_mode==="quote",nova=ix===0||L[ix-1].a.class!==p.a.class,ct=nova?L.filter(z=>z.a.class===p.a.class).reduce((t,z)=>t+z.v,0):0;
            return (nova?`<div class="rlh3 rlx"><span>${ICLS[p.a.class]||p.a.class}</span><span>${br(ct)}</span></div>`:"")+`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(p.a.ticker||p.a.name)}</b><b>${br(p.v)}</b></div>
            <div class="mu">${p.a.ticker?esc(p.a.name)+" · ":""}${ICLS[p.a.class]||p.a.class} · ${q?nq(p.q)+" un. · preço médio "+br(p.q?p.c/p.q:0):"custo "+br(p.c)}${p.sd?" · "+(q?"cotação":"valor")+" de "+fdt(p.sd):' · <span class="neg">sem cotação (usa o custo)</span>'}</div>
            <div class="mu"><span class="${res<0?"neg":"pos"}">resultado ${br(res)}${p.c>0?" ("+pc(res/p.c*100)+")":""}</span> · ${part(p.v)} do total</div></div>`;}).join("")}
          <div class="rlh3 rlx"><span>Caixa <span class="mu" style="font-weight:400">(${esc(c.s||"")})</span></span><span>${c.v==null?"indisponível":br(c.v)}</span></div>
          ${m?`<div class="mu">Movimento do mês: ${m}</div>`:""}</details>`;};
      invHtml=`<div class="card"><b class="rlh1">Investimentos em ${fdt(I.D1)}${I.now?" (hoje)":""}</b>${IA.map(acc).join("")||'<p class="mu">Nenhuma posição nem caixa nessa data.</p>'}
        <b class="rlh2">Por classe</b>${Object.keys(CL).sort((a,b)=>clsR(a)-clsR(b)).map(k=>`<div class="row"><span>${ICLS[k]||k} <span class="mu">${part(CL[k])}</span></span><span>${br(CL[k])}</span></div>`).join("")}
        <div class="row"><span>Caixa <span class="mu">${part(totC)}</span></span><span>${br(totC)}</span></div>
        <div class="row" style="border-top:2px solid var(--ac)"><b>Total investido</b><b>${br(TOT)}</b></div>
        <div class="mu">Posições ${I.now?"de hoje":"no fim do mês"}: quantidade e custo das operações até ${fdt(I.D1)}; valor pela última cotação ou valor atualizado até essa data (sem cotação, o custo). Resultado = valor − custo, sem os rendimentos já pagos.${I.now?"":" Caixa pelo fechamento do mês ou calculado pelo app."}</div></div>`;}}
  /* bloco Viagens e passeios */
  const trpHtml=D.TRP?`<div class="card"><b class="rlh1">Viagens e passeios</b>${D.TRP.map(x=>{const t=x.t,b=Number(t.budget)||0,used=x.tot!=null?x.tot:x.net,K=Object.entries(x.C).sort((a,b)=>b[1]-a[1]);
      return `<details><summary class="rlsum"><div class="rlh2 rlx" style="margin-top:14px"><span><span class="rlcar"></span>${TRIP_ICON[t.kind]||"✈️"} ${esc(t.name)} <span class="mu" style="font-weight:400;font-size:.8rem">· ${x.L.length} lanç.</span></span><span>${br(x.net)}</span></div></summary>
        <div class="mu">${t.scope==="internacional"?"🌎 internacional":"🇧🇷 nacional"}${t.start_date?" · "+tripPeriod(t):""}</div>
        <div class="row"><span>Custo neste mês</span><b>${br(x.net)}</b></div>${x.rf>0?`<div class="mu">despesas ${br(x.sp)} − reembolsos ${br(x.rf)}</div>`:""}
        ${x.tot!=null?`<div class="row"><span>Custo total da viagem <span class="mu">(${x.n} lanç.)</span></span><span>${br(x.tot)}</span></div>`:""}
        ${b>0?`<div class="row"><span>Orçamento <span class="mu">${Math.round(used/b*100)}% usado</span></span><span class="${used>b?"neg":""}">${br(b)}</span></div>`:""}
        ${K.length?`<div class="mu" style="margin-top:4px">Por categoria no mês: ${K.map(([k,v])=>esc(k)+" "+br(v)).join(" · ")}</div>`:""}
        ${x.L.map(t2=>`<div class="row" style="padding-left:8px"><div><div>${esc(t2.description||catName(t2.category_id))}${t2.installment_total?` <span class="mu">${t2.installment_number}/${t2.installment_total}</span>`:""}</div><div class="mu">${fdt(t2.date)} · ${esc(t2.category_id?catName(t2.category_id):"Sem categoria")} · ${esc(accN(t2.account_id))}${t2.status==="planned"&&t2.date>today()?" · previsto":""}</div></div><span class="${Number(t2.amount)<0?"neg":"pos"}" style="white-space:nowrap">${fmt(Number(t2.amount),t2.currency)}</span></div>`).join("")}</details>`;}).join("")}
      ${D.TRP.err?`<p class="neg">Custo total não lido: ${esc(D.TRP.err)}</p>`:""}
      <div class="mu">Custo neste mês = despesas − reembolsos dos lançamentos do mês marcados com a viagem (mesmo filtro do relatório; inclui previstos). Custo total = todos os lançamentos da viagem, como na tela da viagem.</div></div>`:"";
  $("main").innerHTML=`<div class="card" id="rlw"><button class="lk noprint" id="rlbk">← Lançamentos</button> <b class="rlh1" style="display:inline">📄 Relatório do mês</b>
    <div class="row noprint" style="align-items:center"><button class="x" id="rlp">‹</button><b>${esc(mes)}</b><button class="x" id="rln">›</button></div>
    <div class="mu">${esc(D.fam)} · ${esc(mes)} · cartão ${D.md==="stm"?"pela fatura":"pela compra"} · gerado em ${D.at.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</div>
    <div class="noprint" style="display:flex;gap:8px;margin-top:8px"><button class="sec" id="rlpdf" style="flex:1">🖨️ Gerar PDF</button><button class="sec" id="rlxl" style="flex:1">📊 Baixar Excel</button></div><p id="rlmsg" class="mu noprint"></p></div>
  <div class="card"><b class="rlh1">Resumo do mês</b>
    <div class="row"><span>Receitas</span><span class="pos">${br(D.inc)}</span></div><div class="row"><span>Despesas</span><span class="neg">${br(D.exp)}</span></div>
    <div class="row"><b>Resultado</b><b class="${sc(D.inc+D.exp)}">${br(D.inc+D.exp)}</b></div>
    ${ccB.length?`<div class="row"><span>Contas correntes e dinheiro em reais: saldo inicial</span><span class="${sc(ccP)}">${br(ccP)}</span></div><div class="row"><span>${FIN} das contas correntes e dinheiro em reais</span><b class="${sc(ccF)}">${br(ccF)}</b></div>`:""}
    <div class="mu">Receitas, despesas e resultado como no Resultado do Painel (Mês): contas corrente, dinheiro, cartão e vale, sem transferências, só realizados ou com data até hoje.${D.proj?" O saldo final do mês atual inclui os previstos até o fim do mês.":""}</div></div>
  <div class="card"><b class="rlh1">Contas</b>${accHtml}<div class="mu">Saldo inicial = saldo no começo do mês: fechamento do mês anterior (valor do extrato) ou, sem fechamento, calculado. Saldo final = inicial + movimento do mês (inclui previstos), como em Lançamentos. Cada conta na sua moeda.</div></div>
  <div class="card"><b class="rlh1">Lançamentos por conta</b><div class="mu noprint">Toque numa conta para abrir os lançamentos. No PDF, tudo sai aberto.</div>${lanHtml}</div>
  <div class="card"><b class="rlh1">Lançamentos por categoria</b>${catHtml(D.CAT.expense,"Despesas",D.exp)}${catHtml(D.CAT.income,"Receitas",D.inc)}<div class="mu">Mesmas regras do Resumo; estornos (valores positivos) aparecem em Receitas, como no Painel. Em R$ (moeda estrangeira pela taxa do lançamento).</div></div>
  ${invHtml}${trpHtml}`;
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
  const s2=[["Conta","Tipo","Moeda","Saldo inicial","Origem do saldo inicial","Receitas","Despesas","Transferências de entrada","Transferências de saída","Operações e rendimentos","Movimento do mês",FIN,FIN+" ≈ R$","Observação"].map(B)];
  /* mesma ordem da tela: grupos internacionais e depois cada tipo, com uma linha de título em negrito */
  (D.SECS||[{t:"Contas",L:D.ACC}]).forEach(sc0=>{s2.push([B(sc0.t)]);sc0.L.forEach(x=>{
    if(x._gt)s2.push(["  "+x._gt]);
    s2.push([x.a.name,TYPES[x.a.type]||x.a.type,x.cur,r2(x.prev),x.src,N(x.s.inc),N(x.s.exp),N(x.s.tin),N(x.s.tout),N(x.s.inv),N(x.mov),r2(x.fin),x.cur==="BRL"?r2(x.fin):(x.fxB!=null&&x.fin!=null?N(x.fxB):""),x.note]);
    if(x.parts){s2.push(["   "+x.a.name+" › resgatável","Previdência/FGTS",x.cur,"","em "+fdt(D.D1),"","","","","","","",N(x.parts.own),""]);
      s2.push(["   "+x.a.name+" › potencial"+(x.a.type==="fgts"?" (multa FGTS)":""),"Previdência/FGTS",x.cur,"","em "+fdt(D.D1),"","","","","","","",N(x.parts.pot),""]);}
    if(x.W&&!x.W.err)x.W.rows.forEach(r=>s2.push(["   "+x.a.name+" › "+r.w.name+(r.w.is_active?"":" (inativa)"),"Carteira",x.cur,N(r.p),r.hasC?"fechamento por carteira":"calculado",N(r.i),N(r.e),"","","",N(r.i+r.e),N(r.f),N(r.f),""]));});s2.push([]);});
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
  /* Investimentos (posições no fim do mês e caixa) */
  const SH=[{name:"Resumo",rows:s1,w:[38,40]},{name:"Contas",rows:s2,w:[32,20,7,14,40,13,13,14,14,14,14,16,16,50]},
    {name:"Lançamentos",rows:s3,w:[24,11,40,22,22,13,7,13,11,8,9,26,16,14,22]},{name:"Por categoria",rows:s4,w:[12,28,28,14,10]}];
  if(D.INV&&!D.INV.err){const I=D.INV,s5=[[B("Posição em"),Dt(I.D1),I.now?"hoje":"fim do mês"],[],["Conta","Ativo","Nome","Classe","Quantidade","Custo (R$)","Preço médio (R$)","Valor (R$)","Cotação ou valor de","Resultado (R$)","Resultado (%)"].map(B)];
    D.ACC.filter(x=>x.a.type==="investment").forEach(x=>{I.P.filter(p=>p.a.account_id===x.a.id).sort((a,b)=>clsR(a.a.class)-clsR(b.a.class)||b.v-a.v).forEach(p=>{const q=p.a.price_mode==="quote";
        s5.push([x.a.name,p.a.ticker||"",p.a.name,ICLS[p.a.class]||p.a.class,q?{n4:p.q}:"",N(p.c),q&&p.q?N(p.c/p.q):"",N(p.v),p.sd?Dt(p.sd):"sem cotação (custo)",N(p.v-p.c),p.c>0?{n:Math.round((p.v-p.c)/p.c*10000)/100}:""]);});
      const c=I.CA[x.a.id];if(c)s5.push([x.a.name,"Caixa","","","","","",c.v==null?"":N(c.v),c.s,"",""]);});
    s5.push([],[B("Total investido"),"","","","","","",N(I.P.reduce((t,p)=>t+p.v,0)+Object.values(I.CA).reduce((t,c)=>t+(c.v||0),0))]);
    SH.push({name:"Investimentos",rows:s5,w:[22,12,30,12,12,14,14,14,18,14,12]});}
  /* Viagens (resumo por viagem e lançamentos do mês) */
  if(D.TRP){const s6=[["Viagem","Tipo","Período","Orçamento (R$)","Custo no mês (R$)","Custo total (R$)"].map(B)];
    D.TRP.forEach(x=>s6.push([x.t.name,x.t.kind==="passeio"?"Passeio":"Viagem",x.t.start_date?tripPeriod(x.t):"",Number(x.t.budget)>0?N(x.t.budget):"",N(x.net),x.tot!=null?N(x.tot):""]));
    s6.push([],["Viagem","Data","Descrição","Categoria","Conta","Valor","Moeda","Valor em R$","Situação"].map(B));
    D.TRP.forEach(x=>x.L.forEach(t=>s6.push([x.t.name,Dt(t.date),t.description||"",t.category_id?catName(t.category_id):"Sem categoria",accN(t.account_id),N(t.amount),t.currency.trim(),N(Number(t.amount)*Number(t.fx_rate_to_base||1)),t.status==="planned"&&t.date>today()?"Previsto":"Realizado"])));
    SH.push({name:"Viagens",rows:s6,w:[26,11,26,16,16,16,7,14,11]});}
  const blob=xlsxBlob(SH);
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Oikonomia_"+D.m0.slice(0,7)+".xlsx";document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

/* gerador mínimo de .xlsx (Office Open XML num zip sem compressão). Célula: texto, {n: número em R$}, {d:"aaaa-mm-dd"}, {b: texto em negrito} */
function xlsxBlob(sheets){
  const X=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const col=i=>{let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
  const ser=d=>{const [y,m,dd]=d.split("-").map(Number);return (Date.UTC(y,m-1,dd)-Date.UTC(1899,11,30))/864e5;};
  const cell=(v,r,c)=>{const ref=col(c)+(r+1);if(v==null||v==="")return "";
    if(typeof v==="object"){if("n" in v)return `<c r="${ref}" s="1"><v>${v.n}</v></c>`;if("n4" in v)return `<c r="${ref}"><v>${v.n4}</v></c>`;if("d" in v)return `<c r="${ref}" s="2"><v>${ser(v.d)}</v></c>`;if("b" in v)return `<c r="${ref}" s="3" t="inlineStr"><is><t xml:space="preserve">${X(v.b)}</t></is></c>`;}
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
