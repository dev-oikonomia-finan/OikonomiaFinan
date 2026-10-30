function viewTr(){
  const T=S.tr||{};
  const TA=S.accounts.filter(a=>a.type!=="benefit"),nc=TA.filter(a=>a.type!=="credit_card");
  const fromId=T.from||(nc[0]||TA[0]).id;
  const toId=T.to||(TA.find(a=>a.id!==fromId)||TA[0]).id;
  /* Grupos internacionais com 2 ou mais contas ativas viram UMA linha na lista; o saldo (conta) é escolhido nos botões de rádio. */
  const G={};TA.forEach(a=>{const g=gk(a);if(g)(G[g]=G[g]||[]).push(a);});
  Object.keys(G).forEach(g=>{if(G[g].length<2)delete G[g];else G[g].sort((x,y)=>(y.currency.trim()==="BRL")-(x.currency.trim()==="BRL"));});
  const gof=id=>{const a=TA.find(x=>x.id===id),g=a?gk(a):"";return g&&G[g]?g:"";};
  const selv=id=>{const g=gof(id);return g?"g:"+g:id;};
  const ol=(a,sel)=>`<option value="${a.id}" ${a.id===sel?"selected":""}>${esc(a.name)} (${a.currency.trim()})</option>`;
  const opt=sel=>{const done={};let h="";TA.forEach(a=>{const g=gof(a.id);if(!g){h+=ol(a,sel);return;}if(done[g])return;done[g]=1;
    const m=G[g];h+=`<option value="${esc("g:"+g)}" ${selv(sel)==="g:"+g?"selected":""}>🌎 ${esc(m[0].group_name.trim())} (${m.map(x=>x.currency.trim()).join(" / ")})</option>`;});return h;};
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>${T.pay?"Pagar fatura":"Transferir entre contas"}</b>
   <label>De (origem)<select id="tf">${opt(fromId)}</select></label><div id="tfr"></div>
   <label>Para (destino)<select id="tt">${opt(toId)}</select></label><div id="ttr"></div>
   <label>Valor<input id="tv" inputmode="decimal" placeholder="0,00" value="${fa(T.amt)}"></label>
   <label id="tw" hidden>Valor recebido (na moeda do destino)<input id="tx" inputmode="decimal" placeholder="0,00"></label>
   <label id="tq" hidden>Cotação (R$ por 1 unidade da moeda estrangeira)<input id="tqv" inputmode="decimal" placeholder="Ex.: 5,20"></label><p id="th" class="mu"></p>
   <label>Data<input id="td" type="date" value="${today()}"></label>
   <label>Descrição<input id="tds" value="${esc(T.desc||"")}"></label>
   <button class="pri" id="ts">Confirmar</button><p id="tm" class="neg"></p>
   ${T.pay?'<p class="mu">O valor sugerido é o que falta pagar desta fatura. Ajuste se pagar outro valor.</p>':""}</div>`;
  const rsel=box=>{const r=document.querySelector("#"+box+" input:checked");return r?r.value:"";};
  const eff=(sid,box)=>{const v=$(sid).value;return v.startsWith("g:")?(rsel(box)||(G[v.slice(2)]||[])[0].id):v;};
  const fid=()=>eff("tf","tfr"),tid=()=>eff("tt","ttr");
  const cur=id=>S.accounts.find(a=>a.id===id).currency.trim();
  const conv=()=>{const a=cur(fid()),b=cur(tid());return a!==b&&(a==="BRL")!==(b==="BRL");};
  const pref={tfr:T.from||null,ttr:T.to||null};
  /* Desenha o seletor de saldo de uma ponta. Padrão: saldo em reais (primeiro da lista). Na origem e no destino do MESMO grupo, o destino nunca repete a origem. */
  const draw=(sid,box)=>{const v=$(sid).value,el=$(box);
    if(!v.startsWith("g:")){el.innerHTML="";return;}
    const m=G[v.slice(2)],dst=box==="ttr",want=pref[box];pref[box]=null;
    let pick=want&&m.some(x=>x.id===want)?want:(m.some(x=>x.id===rsel(box))?rsel(box):m[0].id);
    const fc=cur(fid());
    if(dst&&pick===fid())pick=(m.find(x=>x.id!==fid())||m[0]).id;
    const lbl=x=>{const c=x.currency.trim(),nm=c==="BRL"?"reais":c;
      if(!dst)return "Saldo em "+nm;
      if(c===fc)return "Saldo em "+nm+" (sem conversão)";
      return "Saldo em "+nm+(fc==="BRL"&&c!=="BRL"?" (converter agora)":"");};
    el.innerHTML=`<div class="mu" style="margin-top:8px">${dst?"Em qual saldo entra?":"De qual saldo sai?"}</div>`+m.map(x=>`<label class="ck"><input type="radio" name="${box}" value="${x.id}" ${x.id===pick?"checked":""} ${dst&&x.id===fid()?"disabled":""}> ${esc(lbl(x))}</label>`).join("");};
  const th=()=>{const f=fid(),cf=cur(f),ct=cur(tid()),h=$("th"),v=num($("tv").value),r=num($("tx").value);h.textContent="";
    if(!conv()||!(v>0)||!(r>0))return;
    if(cf==="BRL")h.textContent=`Cotação efetiva: ${fx4(v/r)} por 1 ${ct}.`;
    else{const I=S.intl[f];if(I&&I.avg)h.textContent=`Custo médio ${fx4(I.avg)} · resultado cambial estimado: ${fmt(r-v*I.avg,"BRL")}.`;}};
  const sync=()=>{draw("tf","tfr");draw("tt","ttr");$("tw").hidden=cur(fid())===cur(tid());$("tq").hidden=!conv();th();};
  const qt=()=>{const v=num($("tv").value),q=num($("tqv").value);
    if(conv()&&v>0&&q>0)$("tx").value=fa((cur(fid())==="BRL"?v/q:v*q).toFixed(2));th();};
  $("tf").onchange=sync;$("tt").onchange=sync;$("tfr").onchange=sync;$("ttr").onchange=sync;$("tv").oninput=qt;$("tqv").oninput=qt;$("tx").oninput=th;sync();
  loadIntl().then(()=>{if(S.tab==="tr"&&$("th"))th();});
  $("bk").onclick=()=>go(S.trFrom||"acc");
  $("ts").onclick=async()=>{
    const f=fid(),t=tid(),v=num($("tv").value);
    if(f===t)return $("tm").textContent="Origem e destino devem ser diferentes.";
    if(!(v>0))return $("tm").textContent="Informe um valor válido.";
    const diff=cur(f)!==cur(t),vt=diff?num($("tx").value):null;
    if(diff&&cur(f)!=="BRL"&&cur(t)!=="BRL")return $("tm").textContent="Para trocar entre duas moedas estrangeiras, passe pelo real: venda uma e depois compre a outra.";
    if(diff&&!(vt>0))return $("tm").textContent="Informe o valor recebido.";
    $("ts").disabled=true;
    const {error}=await sb.rpc("create_transfer",{p_from:f,p_to:t,p_amount:v,p_date:$("td").value,
      p_description:$("tds").value.trim()||(T.pay?"Pagamento de fatura":diff?(cur(f)==="BRL"?"Conversão ":"Venda ")+cur(f)+" → "+cur(t):"Transferência"),p_amount_to:vt,p_statement_month:T.stm||null});
    if(error){$("ts").disabled=false;return $("tm").textContent="Erro: "+error.message;}
    S.tr=null;go(S.trFrom||"acc");};
}

async function viewList(){
  if(S.fAcc&&!S.accounts.some(a=>a.id===S.fAcc))S.fAcc=null;
  const fcur=((S.fAcc&&S.accounts.find(a=>a.id===S.fAcc))||{}).currency,nat=!!fcur&&fcur.trim()!=="BRL",fxm=x=>nat?1:Number(x.fx_rate_to_base||1),mm=v=>fmt(Number(v)||0,nat?fcur:"BRL");
  let q=sb.from("transactions")
    .select("id,account_id,statement_month,card_holder_id,wallet_id,date,amount,currency,description,status,installment_number,installment_total,installment_group_id,transfer_group_id,original_amount,original_currency,fx_rate_to_base,trip_id,categories(name),accounts!inner(name,household_id)")
    .eq("accounts.household_id",S.hid);
  let sq=sb.from("transactions").select("amount,fx_rate_to_base,transfer_group_id,accounts!inner(household_id,type,is_active)").eq("accounts.household_id",S.hid);
  if(S.fAcc){q=q.eq("account_id",S.fAcc);sq=sq.eq("account_id",S.fAcc);}else sq=sq.in("accounts.type",["checking","cash","credit_card","benefit"]).eq("accounts.is_active",true);
  const fb=S.fAcc?S.accounts.find(a=>a.id===S.fAcc&&a.type==="benefit"):null;
  if(fb&&S.fWal&&!S.wallets.some(w=>w.id===S.fWal&&w.account_id===fb.id))S.fWal=null;
  if(!fb)S.fWal=null;
  if(fb&&S.fWal)q=q.eq("wallet_id",S.fWal);
  const mon=S.lper==="mon",m0=S.lmon||(S.lmon=today().slice(0,8)+"01");
  const fc=S.fAcc&&S.accounts.find(a=>a.id===S.fAcc&&a.type==="credit_card");
  const cids=S.accounts.filter(a=>a.type==="credit_card").map(a=>a.id),byStm=mon&&!S.fAcc&&cm()==="stm"&&cids.length>0;
  if(mon){if(fc){q=q.eq("statement_month",m0);sq=sq.eq("statement_month",m0);}
    else if(byStm){const m1=mAdd(m0,1),L=cids.join(","),
      f=`and(transfer_group_id.not.is.null,date.gte.${m0},date.lt.${m1}),and(transfer_group_id.is.null,account_id.not.in.(${L}),date.gte.${m0},date.lt.${m1}),and(transfer_group_id.is.null,account_id.in.(${L}),statement_month.gte.${m0},statement_month.lt.${m1})`;
      q=q.or(f);sq=sq.or(f);}
    else{q=q.gte("date",m0).lt("date",mAdd(m0,1));sq=sq.gte("date",m0).lt("date",mAdd(m0,1));}}
  const grp=!S.fAcc&&lg()==="acc";
  const [{data,error},bl,sm]=await Promise.all([
    (grp?q.order("account_id"):q).order("date",{ascending:false}).order("created_at",{ascending:false}).limit(grp&&mon?Math.max(S.lim,500):S.lim),
    S.fAcc?sb.from("account_balances").select("balance,currency").eq("account_id",S.fAcc).maybeSingle():Promise.resolve({data:null}),mon?sq:Promise.resolve({data:null})]);
  if(error){$("main").innerHTML=`<div class="card neg">${esc(error.message)}</div>`;return;}
  const bal=bl.data;
  const ent=(sm.data||[]).reduce((r,x)=>{const v=Number(x.amount)*fxm(x);if(x.transfer_group_id){r[2]+=v;return r;}return v>0?[r[0]+v,r[1],r[2]]:[r[0],r[1]+v,r[2]];},[0,0,0]);
  const tr={cards:{},inn:0,out:0};let prev=0,prevOk=false,prevCalc=false;
  if(mon&&S.fAcc&&!fc){
    const {data:pc}=await sb.from("balance_closings").select("reported_balance").eq("account_id",S.fAcc).eq("ref_month",mAdd(m0,-1)).maybeSingle();
    if(pc){prev=Number(pc.reported_balance)||0;prevOk=true;}
    else{const ac0=S.accounts.find(a=>a.id===S.fAcc);
      if(ac0&&(ac0.type==="checking"||ac0.type==="cash")){const {data:pb}=await sb.rpc("account_balance_before",{p_account:S.fAcc,p_date:m0});
        if(pb&&pb[0]){prev=Number(pb[0].balance)||0;prevCalc=true;}}}
    const ids=[...new Set((sm.data||[]).filter(x=>x.transfer_group_id).map(x=>x.transfer_group_id))],oth={};
    for(let i=0;i<ids.length;i+=100){
      const {data:o}=await sb.from("transactions").select("transfer_group_id,account_id").in("transfer_group_id",ids.slice(i,i+100)).neq("account_id",S.fAcc);
      (o||[]).forEach(x=>{oth[x.transfer_group_id]=x.account_id;});}
    (sm.data||[]).forEach(x=>{if(!x.transfer_group_id)return;
      const v=Number(x.amount)*fxm(x),oa=S.accounts.find(a=>a.id===oth[x.transfer_group_id]);
      if(oa&&oa.type==="credit_card")tr.cards[oa.id]=(tr.cards[oa.id]||0)+v;else if(v>0)tr.inn+=v;else tr.out+=v;});}
  const sc=v=>v<0?"neg":"pos",tot=ent[0]+ent[1]+ent[2],ctot=Object.values(tr.cards).reduce((r,v)=>r+v,0);
  const all0=mon&&!S.fAcc,QD={prev:0,inc:0,exp:0,fat:0,oth:0,sem:[],err:"",proj:false};
  if(all0){
    const cs=S.accounts.filter(a=>a.type==="checking"||a.type==="cash"),cid=cs.map(a=>a.id),m1=mAdd(m0,1),pm=mAdd(m0,-1);
    QD.proj=m0>=today().slice(0,8)+"01";
    if(cid.length){
      const [tq,cq,bq]=await Promise.all([
        sb.from("transactions").select("amount,fx_rate_to_base,transfer_group_id,account_id,date").in("account_id",cid).in("status",["posted","planned"]).gte("date",m0).lt("date",m1).limit(5000),
        sb.from("balance_closings").select("account_id,reported_balance").in("account_id",cid).eq("ref_month",pm),
        Promise.all(cs.map(a=>sb.rpc("account_balance_before",{p_account:a.id,p_date:m0})))]);
      const e0=[tq,cq,...bq].find(r=>r.error);
      if(e0)QD.err=e0.error.message;
      else{
        const cl={};(cq.data||[]).forEach(x=>{cl[x.account_id]=Number(x.reported_balance)||0;});
        const od={};cs.forEach(a=>{od[a.id]=a.opening_date||null;});
        const rows=(tq.data||[]).filter(x=>!od[x.account_id]||x.date>od[x.account_id]);
        const mv={};rows.forEach(x=>{mv[x.account_id]=true;});
        cs.forEach((a,i)=>{
          const bb=(bq[i].data||[])[0],isB=a.currency.trim()==="BRL";
          const pv=(isB&&cl[a.id]!=null)?cl[a.id]:(bb?Number(bb.balance_base)||0:0);
          QD.prev+=pv;
          if(!a.opening_date&&cl[a.id]==null&&(Math.abs(pv)>=0.005||mv[a.id]))QD.sem.push(a.name);});
        const ids=[...new Set(rows.filter(x=>x.transfer_group_id).map(x=>x.transfer_group_id))],og={};
        for(let i=0;i<ids.length;i+=100){
          const {data:o}=await sb.from("transactions").select("transfer_group_id,account_id").in("transfer_group_id",ids.slice(i,i+100));
          (o||[]).forEach(x=>{(og[x.transfer_group_id]=og[x.transfer_group_id]||[]).push(x.account_id);});}
        rows.forEach(x=>{
          const v=Number(x.amount)*Number(x.fx_rate_to_base||1);
          if(!x.transfer_group_id){if(v>0)QD.inc+=v;else QD.exp+=v;return;}
          const oid=(og[x.transfer_group_id]||[]).find(id=>id!==x.account_id),oa=S.accounts.find(a=>a.id===oid);
          if(oa&&oa.type==="credit_card")QD.fat+=v;else QD.oth+=v;});}}}
  const qdFin=QD.prev+QD.inc+QD.exp+QD.fat+QD.oth;
  const qdHtml=all0?`<b style="display:block;margin-top:16px">Saldo das contas correntes e dinheiro</b>
    ${QD.err?`<p class="neg">${esc(QD.err)}</p><p class="mu">Rode o script saldo_inicial.sql no Supabase.</p>`:`<div class="row"><span class="mu">Saldo do mês anterior</span><span class="${sc(QD.prev)}">${mm(QD.prev)}</span></div>
    <div class="row"><span class="mu">Receitas em conta</span><span class="pos">${mm(QD.inc)}</span></div>
    <div class="row"><span class="mu">Despesas em conta (sem cartão)</span><span class="neg">${mm(QD.exp)}</span></div>
    <div class="row"><span class="mu">Faturas de cartão pagas</span><span class="${sc(QD.fat)}">${mm(QD.fat)}</span></div>
    <div class="row"><span class="mu">Outras transferências (aportes, resgates, conversões)</span><span class="${sc(QD.oth)}">${mm(QD.oth)}</span></div>
    <div class="row"><b>${QD.proj?"Saldo final projetado":"Saldo final"}</b><b class="${sc(qdFin)}">${mm(qdFin)}</b></div>
    <div class="mu">Soma as contas correntes e de dinheiro ativas, como o Disponível do Painel; deve bater com a soma dos extratos quando os lançamentos estiverem completos. Cartões e vale ficam de fora. Saldo do mês anterior: fechamento do mês, ou saldo inicial mais os lançamentos.${QD.proj?" Inclui lançamentos previstos até o fim do mês.":""}</div>
    ${QD.sem.length?`<div class="mu" style="color:var(--yel)">Sem saldo inicial nem fechamento (saldo só pelos lançamentos): ${QD.sem.map(esc).join(", ")}.</div>`:""}`}`:"";
  let wqHtml="",wchips="";
  if(fb){
    const wsAll=S.wallets.filter(w=>w.account_id===fb.id),cur=fb.currency.trim(),mw=v=>fmt(Number(v)||0,cur);
    wchips=`<div class="chips"><button data-fw="" class="${S.fWal?"":"on"}">Todas as carteiras</button>${wsAll.map(w=>`<button data-fw="${w.id}" class="${S.fWal===w.id?"on":""}">${esc(w.name)}${w.is_active?"":" (inativa)"}</button>`).join("")}</div>`;
    if(mon){
      const pm=mAdd(m0,-1),m1=mAdd(m0,1);
      const [mq,cq,bq]=await Promise.all([
        sb.from("transactions").select("amount,wallet_id,date").eq("account_id",fb.id).in("status",["posted","planned"]).gte("date",m0).lt("date",m1).limit(5000),
        sb.from("balance_closings").select("id").eq("account_id",fb.id).eq("ref_month",pm).maybeSingle(),
        sb.rpc("wallet_balance_before",{p_account:fb.id,p_date:m0})]);
      const e0=[mq,cq,bq].find(r=>r.error);
      if(e0)wqHtml=`<p class="neg">${esc(e0.error.message)}</p><p class="mu">Se a função não existe, rode o script vale_saldo_por_carteira.sql no Supabase.</p>`;
      else{
        let wcl=[];
        if(cq.data){const r=await sb.from("wallet_closings").select("wallet_id,reported_balance").eq("closing_id",cq.data.id);wcl=r.error?[]:(r.data||[]);}
        const rep={};wcl.forEach(r=>{rep[r.wallet_id]=Number(r.reported_balance)||0;});
        const prv={};(bq.data||[]).forEach(r=>{prv[r.wallet_id]=Number(r.balance)||0;});
        const mv={};(mq.data||[]).forEach(x=>{const w=wsAll.find(z=>z.id===x.wallet_id);
          if(!w||(w.opening_date&&x.date<=w.opening_date))return;
          const o=mv[w.id]=mv[w.id]||{i:0,e:0},v=Number(x.amount)||0;if(v>0)o.i+=v;else o.e+=v;});
        const rows=wsAll.map(w=>{const o=mv[w.id]||{i:0,e:0},hasC=rep[w.id]!=null,p=hasC?rep[w.id]:(prv[w.id]||0);return {w,p,hasC,i:o.i,e:o.e,f:p+o.i+o.e};})
          .filter(r=>r.w.is_active||Math.abs(r.p)>=0.005||r.i||r.e);
        const T=rows.reduce((t,r)=>({p:t.p+r.p,i:t.i+r.i,e:t.e+r.e,f:t.f+r.f}),{p:0,i:0,e:0,f:0});
        const proj=m0>=today().slice(0,8)+"01",oldCl=cq.data&&!wcl.length;
        wqHtml=`<b style="display:block;margin-top:10px">Saldo por carteira</b>
         ${rows.length?rows.map(r=>`<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div class="row" style="border:0;padding:0"><span>${esc(r.w.name)}${r.w.is_active?"":' <span class="mu">(inativa)</span>'}</span><b class="${sc(r.f)}">${mw(r.f)}</b></div><div class="mu">anterior ${mw(r.p)}${r.hasC?"":" (calculado)"} · créditos ${mw(r.i)} · gastos ${mw(r.e)}</div></div>`).join(""):'<p class="mu">Nenhuma carteira nesta conta.</p>'}
         <b style="display:block;margin-top:10px">Total da conta</b>
         <div class="row"><span class="mu">Saldo do mês anterior</span><span>${mw(T.p)}</span></div>
         <div class="row"><span class="mu">Créditos do mês</span><span class="pos">${mw(T.i)}</span></div>
         <div class="row"><span class="mu">Gastos do mês</span><span class="neg">${mw(T.e)}</span></div>
         <div class="row"><b>${proj?"Saldo final projetado":"Saldo final"}</b><b class="${sc(T.f)}">${mw(T.f)}</b></div>
         ${oldCl?`<div class="mu">O fechamento de ${esc(mlab(pm))} foi gravado só com o total; o saldo anterior por carteira é calculado.</div>`:""}
         <div class="mu">${proj?"Inclui lançamentos previstos até o fim do mês. ":""}Toque em uma carteira acima para filtrar a lista.</div>`;
      }
    }else{
      const sh=wsAll.filter(w=>w.is_active||Math.abs(S.wbal[w.id]||0)>=0.005);
      wqHtml=`<b style="display:block;margin-top:10px">Saldo atual por carteira</b>${sh.length?sh.map(w=>`<div class="row"><span>${esc(w.name)}</span><b class="${sc(S.wbal[w.id]||0)}">${mw(S.wbal[w.id]||0)}</b></div>`).join(""):'<p class="mu">Nenhuma carteira nesta conta.</p>'}`;
    }
  }
  let sumHtml="";
  const fi=S.fAcc&&S.accounts.find(a=>a.id===S.fAcc&&a.type==="investment");
  const iv={inc:0,ops:0};
  if(fi&&mon){
    const ma=mAdd(m0,1),[ri,ro]=await Promise.all([
      sb.from("investment_income").select("net,investment_assets!inner(account_id)").eq("investment_assets.account_id",S.fAcc).gte("date",m0).lt("date",ma),
      sb.from("investment_operations").select("side,amount,fees,investment_assets!inner(account_id)").eq("investment_assets.account_id",S.fAcc).gte("date",m0).lt("date",ma)]);
    iv.inc=(ri.data||[]).reduce((r,x)=>r+Number(x.net),0);
    iv.ops=(ro.data||[]).reduce((r,x)=>r+(x.side==="sell"?Number(x.amount)-Number(x.fees):-(Number(x.amount)+Number(x.fees))),0);}
  if(fb)sumHtml=wqHtml;
  else if(fi&&mon)sumHtml=`<div class="row"><span class="mu">Saldo do mês anterior${prevOk?"":" (sem fechamento)"}</span><span class="${sc(prev)}">${mm(prev)}</span></div>
    <div class="row"><span class="mu">Rendimentos do mês</span><span class="pos">${mm(iv.inc)}</span></div>
    <div class="row"><span class="mu">Compras e vendas de ativos</span><span class="${sc(iv.ops)}">${mm(iv.ops)}</span></div>
    <div class="row"><span class="mu">Aportes (transferências de entrada)</span><span class="pos">${mm(tr.inn)}</span></div>
    <div class="row"><span class="mu">Resgates (transferências de saída)</span><span class="neg">${mm(tr.out)}</span></div>
    <div class="row"><b>Saldo final</b><b class="${sc(prev+tot+iv.inc+iv.ops)}">${mm(prev+tot+iv.inc+iv.ops)}</b></div><div class="mu">Saldo do mês anterior + rendimentos + compras e vendas + aportes e resgates. Rendimentos e operações são lançados em Investimentos.</div><button class="sec" id="gti">📈 Abrir Investimentos</button>`;
  else if(fi)sumHtml=`<div class="mu">Conta de investimento: aqui ficam só aportes e resgates (transferências). Compras, vendas e rendimentos estão em Investimentos.</div><button class="sec" id="gti">📈 Abrir Investimentos</button>`;
  else if(mon&&fc)sumHtml=`<div class="row"><b>Total da fatura</b><b>${mm(-(ent[0]+ent[1]))}</b></div><div class="mu">Compras da fatura, sem os pagamentos.</div>`;
  else if(mon&&S.fAcc)sumHtml=`<div class="row"><span class="mu">Saldo do mês anterior${prevOk?"":prevCalc?" (calculado)":" (sem fechamento)"}</span><span class="${sc(prev)}">${mm(prev)}</span></div>
    <div class="row"><span class="mu">Receitas do mês</span><span class="pos">${mm(ent[0])}</span></div>
    <div class="row"><span class="mu">Despesas do mês</span><span class="neg">${mm(ent[1])}</span></div>
    <div class="row"><span class="mu">Cartões do mês</span><span class="${sc(ctot)}">${mm(ctot)}</span></div>
    ${Object.keys(tr.cards).map(id=>`<div class="row" style="padding-left:14px"><span class="mu">${esc(S.accounts.find(a=>a.id===id).name)}</span><span class="${sc(tr.cards[id])}">${mm(tr.cards[id])}</span></div>`).join("")}
    <div class="row"><span class="mu">Transferências de entrada</span><span class="pos">${mm(tr.inn)}</span></div>
    <div class="row"><span class="mu">Transferências de saída</span><span class="neg">${mm(tr.out)}</span></div>
    <div class="row"><b>Saldo final</b><b class="${sc(tot+prev)}">${mm(tot+prev)}</b></div><div class="mu">Saldo do mês anterior + receitas + despesas + cartões + transferências.</div>`;
  else if(mon)sumHtml=`<b style="display:block;margin-top:10px">Resultado do mês</b><div class="row"><span class="mu">Receitas do mês</span><span class="pos">${mm(ent[0])}</span></div><div class="row"><span class="mu">Despesas do mês</span><span class="neg">${mm(ent[1])}</span></div><div class="row"><b>Resultado</b><b class="${sc(ent[0]+ent[1])}">${mm(ent[0]+ent[1])}</b></div><div class="mu">Receitas, despesas e resultado não incluem transferências.</div><div class="seg" style="margin-top:8px"><button id="cmf" class="${cm()==="stm"?"on":""}">Cartão: pela fatura</button><button id="cmb" class="${cm()==="buy"?"on":""}">Cartão: pela compra</button></div><div class="mu">${cm()==="stm"?"Compras no cartão contam no mês da fatura (vencimento), como no extrato. Transferências sempre pela data.":"Compras no cartão contam na data da compra."}</div>${qdHtml}`;
  const rowH=t=>`<div class="row"><div>
    <div>${esc(t.description||t.categories?.name||"Sem descrição")}${t.installment_total?` <span class="mu">${t.installment_number}/${t.installment_total}</span>`:""}</div>
    <div class="mu">${t.date.split("-").reverse().join("/")} · ${esc(t.categories?.name||"—")} · ${esc(t.accounts?.name)}${t.statement_month&&S.accounts.some(a=>a.id===t.account_id&&a.type==="credit_card")?" · fatura "+t.statement_month.slice(5,7)+"/"+t.statement_month.slice(0,4):""}${t.card_holder_id&&holdersOf(t.account_id).length>1?" · "+esc(holderName(t.card_holder_id)):""}${t.wallet_id?" · "+esc(walletName(t.wallet_id)):""}${t.trip_id&&tripName(t.trip_id)?" · "+esc(tripName(t.trip_id)):""}${t.currency.trim()!=="BRL"?" · ≈ "+fmt(Number(t.amount)*Number(t.fx_rate_to_base||1),"BRL"):""}${t.original_amount?" · original "+fmt(t.original_amount,t.original_currency):""}${t.status==="planned"&&t.date>today()?" · previsto":""}</div></div>
    <div style="text-align:right;white-space:nowrap"><span class="${t.amount<0?"neg":"pos"}">${fmt(t.amount,t.currency)}</span><button class="x" data-ed="${t.id}">✏️</button><button class="x" data-del="${t.id}">✕</button></div></div>`;
  const listHtml=()=>{
    if(!grp)return data.map(rowH).join("");
    const G={};data.forEach(t=>{(G[t.account_id]=G[t.account_id]||[]).push(t);});
    const full=data.length<(mon?Math.max(S.lim,500):S.lim),ord=S.accounts.map(a=>a.id).filter(id=>G[id]).concat(Object.keys(G).filter(id=>!S.accounts.some(a=>a.id===id)));
    return ord.map(id=>{const L=G[id],a=S.accounts.find(x=>x.id===id),nm=a?a.name:(L[0].accounts&&L[0].accounts.name)||"Conta",tot=L.reduce((r,x)=>r+Number(x.amount)*Number(x.fx_rate_to_base||1),0);
      return `<div class="row" style="margin-top:10px;border-bottom:2px solid var(--ac)"><b>${esc(nm)} <span class="mu">· ${L.length} lanç.</span></b>${full?`<b class="${tot<0?"neg":"pos"}">${mm(tot)}</b>`:""}</div>`+L.map(rowH).join("");}).join("");};
  $("main").innerHTML=`<div class="card"><div class="seg"><button id="lpm" class="${mon?"on":""}">Mês</button><button id="lpa" class="${mon?"":"on"}">Tudo</button></div>
    ${mon?`<div class="row" style="align-items:center"><button class="x" id="lpp">‹</button><b>${fc?"Fatura de ":""}${mlab(m0)}</b><button class="x" id="lpn">›</button></div>`:""}
    <label style="margin-top:0">Conta<select id="lfa"><option value="">Todas as contas</option>${S.accounts.map(a=>`<option value="${a.id}" ${a.id===S.fAcc?"selected":""}>${esc(a.name)} (${a.currency.trim()})</option>`).join("")}</select></label>
    ${wchips}
    ${S.fAcc?"":`<div class="seg" style="margin-top:8px"><button id="lgd" class="${grp?"":"on"}">Por data</button><button id="lga" class="${grp?"on":""}">Agrupar por conta</button></div>${grp&&!mon?'<div class="mu">Em "Tudo", o total de cada conta só aparece quando todos os lançamentos estão carregados.</div>':""}`}
    ${bal?`<div class="row" style="margin-top:10px"><span>Saldo atual</span><b class="${bal.balance<0?"neg":"pos"}">${fmt(bal.balance,bal.currency)}</b></div>`:""}${sumHtml}</div>
  <div class="card">${data.length?listHtml():`<span class="mu">${S.fAcc?"Nenhum lançamento nesta conta.":"Nenhum lançamento ainda."}</span>`}</div>
  ${data.length>=(grp&&mon?Math.max(S.lim,500):S.lim)?'<button class="sec" id="lm">Carregar mais</button>':""}`;
  if($("gti"))$("gti").onclick=()=>{S.im="";go("inv");};
  if($("lm"))$("lm").onclick=async()=>{const y=window.scrollY;S.lim+=50;await viewList();window.scrollTo(0,y);};
  $("lfa").onchange=()=>{S.fAcc=$("lfa").value||null;S.fWal=null;S.lim=50;viewList();};
  document.querySelectorAll("[data-fw]").forEach(b=>b.onclick=()=>{S.fWal=b.dataset.fw||null;S.lim=50;viewList();});
  if($("lgd")){$("lgd").onclick=()=>{lsSet("listgrp","date");S.lim=50;viewList();};$("lga").onclick=()=>{lsSet("listgrp","acc");S.lim=50;viewList();};}
  if($("cmf")){$("cmf").onclick=()=>{lsSet("cardmode","stm");S.lim=50;viewList();};$("cmb").onclick=()=>{lsSet("cardmode","buy");S.lim=50;viewList();};}
  $("lpm").onclick=()=>{S.lper="mon";S.lim=50;viewList();};$("lpa").onclick=()=>{S.lper="all";S.lim=50;viewList();};
  if($("lpp")){$("lpp").onclick=()=>{S.lmon=mAdd(m0,-1);S.lim=50;viewList();};$("lpn").onclick=()=>{S.lmon=mAdd(m0,1);S.lim=50;viewList();};}
  document.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>{S.ed=b.dataset.ed;go("ed");});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
    const t=data.find(x=>x.id===b.dataset.del);
    const txt=t.transfer_group_id?"Apagar a transferência inteira (as duas pontas)?"
      :t.installment_group_id&&S.loans.some(l=>l.installment_group_id===t.installment_group_id)?"Apagar SÓ esta parcela do contrato? Para apagar o contrato inteiro, use Financiamentos no Painel.":t.installment_group_id?"Apagar SÓ esta parcela? Para apagar a compra inteira, use ✏️ e depois \"Editar todas as parcelas desta compra\".":"Apagar este lançamento?";
    if(!confirm(txt))return;
    const q=sb.from("transactions").delete();
    const {error}=await(t.transfer_group_id?q.eq("transfer_group_id",t.transfer_group_id):q.eq("id",t.id));
    if(error)alert("Erro: "+error.message);
    viewList();});
}

