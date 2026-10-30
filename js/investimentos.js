/* ===== Investimentos (Fase 1) ===== */
const ICLS={renda_fixa:"Renda fixa",acoes:"Ações",fiis:"FIIs",cripto:"Cripto",previdencia:"Previdência",outros:"Outros"},r2=v=>Math.round(v*100)/100,nq=v=>Number(v).toLocaleString("pt-BR",{maximumFractionDigits:8});
async function viewIr(){
  const hid=S.hid,td=today(),cy=Number(td.slice(0,4)),Y=Math.min(cy,Number(S.iry)||cy),
    D1=Y===cy&&td<Y+"-12-31"?td:Y+"-12-31",D0=(Y-1)+"-12-31",part=D1!==Y+"-12-31",
    pg=async mk=>{const o=[];for(let i=0;;i+=1000){const r=await mk().range(i,i+999);if(r.error)return{error:r.error,data:o};o.push(...r.data);if(r.data.length<1000)break;}return{data:o};};
  const [ast,ops,inc,clo,sm]=await Promise.all([
    pg(()=>sb.from("investment_assets").select("id,account_id,class,price_mode,ticker,name,cnpj,is_active").eq("household_id",hid).order("name").order("id")),
    pg(()=>sb.from("investment_operations").select("id,asset_id,date,side,amount,fees,tax_withheld,net_balance_before,realized_result,qty_after,cost_after,created_at").eq("household_id",hid).order("date").order("created_at").order("id")),
    pg(()=>sb.from("investment_income").select("id,asset_id,date,kind,gross,tax_withheld,net").eq("household_id",hid).gte("date",Y+"-01-01").lte("date",Y+"-12-31").order("date").order("id")),
    sb.from("balance_closings").select("account_id,ref_month,reported_balance").eq("household_id",hid).in("ref_month",[Y+"-12-01",(Y-1)+"-12-01"]),
    sb.from("investment_account_summary").select("account_id,cash").eq("household_id",hid)]);
  if(S.tab!=="ir")return;
  const er=[ast,ops,inc,sm].find(r=>r.error);
  if(er){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(er.error.message||String(er.error))}</p></div>`;$("bk").onclick=()=>{S.im="";go("inv");};return;}
  const A=S.accounts.filter(a=>a.type==="investment"),ok=id=>A.some(a=>a.id===id),
    AL=ast.data.filter(a=>ok(a.account_id)),AM={};AL.forEach(a=>{AM[a.id]=a;});
  const OB={};ops.data.forEach(o=>{if(AM[o.asset_id])(OB[o.asset_id]=OB[o.asset_id]||[]).push(o);});
  const posAt=(id,d)=>{let r=null;(OB[id]||[]).forEach(o=>{if(o.date<=d)r=o;});return r?{q:Number(r.qty_after||0),c:Number(r.cost_after||0)}:{q:0,c:0};},
    has=p=>p.q>0||p.c>0,nm=a=>esc(a.ticker||a.name),L1=fdt(D1),L0=fdt(D0),
    fy=ops.data.length?Number(ops.data[0].date.slice(0,4)):cy,yrs=[];
  for(let y=cy;y>=Math.min(fy,cy-5);y--)yrs.push(y);
  const cashRep={};(clo.data||[]).forEach(c=>{cashRep[c.account_id+"|"+String(c.ref_month).slice(0,10)]=Number(c.reported_balance);});
  const smc={};(sm.data||[]).forEach(x=>{smc[x.account_id]=Number(x.cash||0);});
  const cashFor=async(id,ref)=>{const k=id+"|"+ref;if(k in cashRep)return{v:cashRep[k],s:"informado no fechamento"};
    const r=await sb.rpc("closing_balance",{p_account:id,p_ref:ref});
    if(r.error)return{v:null,s:"erro: "+r.error.message};
    const x=Array.isArray(r.data)?Object.values(r.data[0]||{})[0]:r.data;
    return{v:x==null?null:Number(x),s:"calculado pelo app"};};
  const CA=await Promise.all(A.map(async a=>({a,c1:part?{v:smc[a.id]??0,s:"saldo atual"}:await cashFor(a.id,Y+"-12-01"),c0:await cashFor(a.id,(Y-1)+"-12-01")})));
  if(S.tab!=="ir")return;
  const cv=c=>c.v==null?"indisponível":mm(c.v),
    R=AL.map(a=>({a,p1:posAt(a.id,D1),p0:posAt(a.id,D0)})).filter(x=>has(x.p1)||has(x.p0)),
    pT=(p,a)=>has(p)?(a.price_mode==="quote"?nq(p.q)+" un. · ":"")+"custo "+mm(p.c):"sem posição",
    sumC=k=>R.reduce((r,x)=>r+x[k].c,0),
    bens=A.map(a=>{const rs=R.filter(x=>x.a.account_id===a.id),ca=CA.find(z=>z.a.id===a.id),
      show=ca&&((ca.c1.v||0)!==0||(ca.c0.v||0)!==0||ca.c1.v==null||ca.c0.v==null);
      if(!rs.length&&!show)return"";
      return `<div style="margin-top:10px"><b>${esc(a.name)}</b>${rs.map(x=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${nm(x.a)}</b><b>${has(x.p1)?mm(x.p1.c):"—"}</b></div>
        <div class="mu">${x.a.ticker?esc(x.a.name)+" · ":""}${ICLS[x.a.class]} · ${x.a.cnpj?"CNPJ "+esc(x.a.cnpj):"sem CNPJ"}${x.a.is_active?"":" · inativo"}</div>
        <div class="mu">Em ${L1}: ${pT(x.p1,x.a)}</div><div class="mu">Em ${L0}: ${pT(x.p0,x.a)}</div></div>`).join("")}
        ${show?`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>Caixa (saldo da conta)</b><b>${cv(ca.c1)}</b></div>
        <div class="mu">Em ${L1}: ${cv(ca.c1)} (${ca.c1.s})</div><div class="mu">Em ${L0}: ${cv(ca.c0)} (${ca.c0.s})</div></div>`:""}</div>`;}).join("");
  const KIND={dividendo:"Dividendos",jcp:"JCP (juros sobre capital próprio)",rendimento_fii:"Rendimentos de FIIs",juros:"Juros",outros:"Outros"},
    HINT={dividendo:"Provável ficha: Rendimentos Isentos e Não Tributáveis (lucros e dividendos). Se houve IR retido, confirme o tratamento.",
      jcp:"Provável ficha: Tributação Exclusiva/Definitiva (JCP), com o IR retido na fonte.",
      rendimento_fii:"Provável ficha: Rendimentos Isentos e Não Tributáveis (FIIs), se cumpridas as condições da isenção.",
      juros:"Depende do título: veja o informe de rendimentos (poupança, LCI e LCA costumam ser isentos; CDB tem IR retido na fonte).",
      outros:"Confira no informe de rendimentos da instituição."},
    rend=Object.keys(KIND).filter(k=>inc.data.some(i=>i.kind===k)).map(k=>{const by={};
      inc.data.filter(i=>i.kind===k).forEach(i=>{const b=by[i.asset_id]=by[i.asset_id]||{g:0,t:0,n:0};b.g+=Number(i.gross);b.t+=Number(i.tax_withheld||0);b.n+=Number(i.net);});
      const T=Object.values(by).reduce((r,b)=>({g:r.g+b.g,t:r.t+b.t,n:r.n+b.n}),{g:0,t:0,n:0});
      return `<div style="margin-top:10px"><div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${KIND[k]}</b><b class="pos">${mm(T.n)}</b></div>
        <div class="mu">Bruto ${mm(T.g)} · IR retido ${mm(T.t)} · líquido ${mm(T.n)}</div><div class="mu">${HINT[k]}</div></div>
        ${Object.keys(by).map(id=>{const a=AM[id],b=by[id];
          return `<div class="row" style="display:block;padding-left:14px"><div style="display:flex;justify-content:space-between;gap:8px"><span>${a?nm(a):"(ativo removido)"}</span><span class="pos">${mm(b.n)}</span></div>
          <div class="mu">${a?(a.cnpj?"CNPJ "+esc(a.cnpj):"sem CNPJ")+" · ":""}bruto ${mm(b.g)} · IR retido ${mm(b.t)}</div></div>`;}).join("")}</div>`;}).join("");
  const TI=inc.data.reduce((r,i)=>({g:r.g+Number(i.gross),t:r.t+Number(i.tax_withheld||0),n:r.n+Number(i.net)}),{g:0,t:0,n:0}),
    MN=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"],M={};
  ops.data.filter(o=>o.side==="sell"&&o.date.startsWith(String(Y))&&AM[o.asset_id]).forEach(o=>{const m=o.date.slice(5,7),b=M[m]=M[m]||{v:0,ac:0,r:0};
    b.v+=Number(o.amount);if(AM[o.asset_id].class==="acoes")b.ac+=Number(o.amount);b.r+=Number(o.realized_result||0);});
  const MK=Object.keys(M).sort(),TS=MK.reduce((r,m)=>({v:r.v+M[m].v,ac:r.ac+M[m].ac,r:r.r+M[m].r}),{v:0,ac:0,r:0}),
    nc=[...new Set([...R.map(x=>x.a.id),...inc.data.map(i=>i.asset_id)])].map(id=>AM[id]).filter(a=>a&&["acoes","fiis","previdencia"].includes(a.class)&&!a.cnpj);
  const RF=ops.data.filter(o=>o.side==="sell"&&o.date.startsWith(String(Y))&&AM[o.asset_id]&&AM[o.asset_id].class==="renda_fixa"&&AM[o.asset_id].price_mode==="total"),
    rfT=RF.reduce((r,o)=>({n:r.n+Number(o.amount),t:r.t+Number(o.tax_withheld||0),g:r.g+Number(o.realized_result||0)+Number(o.tax_withheld||0)}),{n:0,t:0,g:0}),
    rfH=RF.length?`<div class="card"><b>Resgates de renda fixa em ${Y}</b>
      <p class="mu">Valor líquido é o que caiu na conta. Rendimento bruto = resultado do resgate + IR retido. Provável ficha: Tributação Exclusiva/Definitiva, a confirmar no informe de rendimentos da instituição. Resgate sem IR informado pode ser isento (poupança, LCI, LCA) ou esquecimento.</p>
      ${RF.map(o=>{const a=AM[o.asset_id],t=Number(o.tax_withheld||0),g=Number(o.realized_result||0)+t;
        return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${nm(a)} · ${fdt(o.date)}${o.net_balance_before!=null&&Number(o.amount)<Number(o.net_balance_before)?" · parcial":""}</b><b>${mm(o.amount)}</b></div>
        <div class="mu">${a.ticker?esc(a.name)+" · ":""}${a.cnpj?"CNPJ "+esc(a.cnpj):"sem CNPJ"}</div>
        <div class="mu">Líquido ${mm(o.amount)} · ${t>0?"IR retido "+mm(t):'<span class="neg">IR não informado</span>'} · rendimento bruto ${mm(g)}</div>
        <div><button class="lk" data-tx="${o.id}" data-tv="${t}">${t>0?"Alterar IR":"Informar IR"}</button></div></div>`;}).join("")}
      <div class="row" style="margin-top:6px"><b>Total no ano</b><b>${mm(rfT.n)}</b></div><div class="mu">IR retido ${mm(rfT.t)} · rendimento bruto ${mm(rfT.g)}</div></div>`:"";
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Relatório de IR</b>
    <label>Ano-base<select id="iry">${yrs.map(y=>`<option value="${y}"${y===Y?" selected":""}>${y}</option>`).join("")}</select></label>
    ${part?`<p class="mu">Ano em andamento: posições e caixa até ${L1}.</p>`:""}
    <p class="mu">Só consulta: o app não calcula imposto devido. Use como apoio para conferir os informes de rendimentos das instituições e o programa da Receita.</p></div>
    ${A.length?"":`<div class="card"><p class="mu">Nenhuma conta de investimento cadastrada.</p></div>`}
    ${nc.length?`<div class="card"><b class="neg">Ativos sem CNPJ</b><p class="mu">O IR pede o CNPJ da empresa ou do fundo. Preencha em Investimentos, no card Ativos cadastrados (Editar): ${nc.map(a=>nm(a)).join(", ")}.</p></div>`:""}
    ${A.length?`<div class="card"><b>Bens e Direitos em ${L1}</b>
      <p class="mu">Ativos pelo custo de aquisição (não pela cotação) e caixa pelo saldo da conta. A posição vem das operações lançadas: sem os lançamentos antigos, ${L0} pode sair incompleto.</p>
      ${bens||'<p class="mu">Nenhuma posição nem caixa nessas datas.</p>'}
      ${R.length?`<div class="row" style="margin-top:6px"><b>Total em ativos (custo)</b><b>${mm(sumC("p1"))}</b></div><div class="mu">Em ${L0}: ${mm(sumC("p0"))}</div>`:""}</div>`:""}
    <div class="card"><b>Rendimentos em ${Y}</b>
      <p class="mu">Pela data de pagamento. Confirme a classificação no informe de rendimentos de cada instituição.</p>
      ${rend||`<p class="mu">Nenhum rendimento registrado em ${Y}.</p>`}
      ${rend?`<div class="row" style="margin-top:6px"><b>Total no ano</b><b class="pos">${mm(TI.n)}</b></div><div class="mu">Bruto ${mm(TI.g)} · IR retido ${mm(TI.t)} · líquido ${mm(TI.n)}</div>`:""}</div>
    ${rfH}
    <div class="card"><b>Vendas e resultado realizado em ${Y}</b>
      <p class="mu">Para conferir mês a mês. Em renda fixa, o resultado é sobre o valor líquido recebido; o IR retido de cada resgate está no card acima.</p>
      ${MK.length?MK.map(m=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${MN[Number(m)-1]}</b><b class="${M[m].r<0?"neg":"pos"}">${mm(M[m].r)}</b></div>
        <div class="mu">Vendido ${mm(M[m].v)}${M[m].ac?" · em ações "+mm(M[m].ac):""} · resultado realizado ${mm(M[m].r)}</div></div>`).join("")
        +`<div class="row" style="margin-top:6px"><b>Total no ano</b><b class="${TS.r<0?"neg":"pos"}">${mm(TS.r)}</b></div><div class="mu">Vendido ${mm(TS.v)}${TS.ac?" · em ações "+mm(TS.ac):""}</div>`
        :`<p class="mu">Nenhuma venda ou resgate em ${Y}.</p>`}</div>`;
  $("bk").onclick=()=>{S.im="";go("inv");};
  $("iry").onchange=()=>{S.iry=Number($("iry").value);viewIr();};
  document.querySelectorAll("[data-tx]").forEach(b=>b.onclick=async()=>{
    const cur=Number(b.dataset.tv)||0,v=prompt("IR retido neste resgate (R$). Use 0 para limpar:",cur>0?String(cur).replace(".",","):"");
    if(v===null)return;
    const t=v.trim()?r2(num(v)):NaN;
    if(!(t>=0)){alert("Informe um valor de IR válido (zero ou maior).");return;}
    const {error}=await sb.rpc("set_operation_tax",{p_operation:b.dataset.tx,p_tax:t});
    if(error){alert("Erro: "+error.message);return;}
    viewIr();});
}
async function viewRent(){
  const hid=S.hid,td=today(),cy=Number(td.slice(0,4)),
    pg=async mk=>{const o=[];for(let i=0;;i+=1000){const r=await mk().range(i,i+999);if(r.error)return{error:r.error,data:o};o.push(...r.data);if(r.data.length<1000)break;}return{data:o};};
  const [ast,ops,inc,snp,pos]=await Promise.all([
    pg(()=>sb.from("investment_assets").select("id,account_id,class,price_mode,ticker,name,is_active").eq("household_id",hid).order("name").order("id")),
    pg(()=>sb.from("investment_operations").select("id,asset_id,date,side,amount,fees,qty_after,cost_after,created_at").eq("household_id",hid).order("date").order("created_at").order("id")),
    pg(()=>sb.from("investment_income").select("id,asset_id,date,net").eq("household_id",hid).order("date").order("id")),
    pg(()=>sb.from("investment_snapshots").select("asset_id,date,value").order("date").order("asset_id")),
    sb.from("investment_positions").select("asset_id,qty,current_value,last_value,last_date").eq("household_id",hid)]);
  if(S.tab!=="rent")return;
  const er=[ast,ops,inc,snp,pos].find(r=>r.error);
  if(er){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(er.error.message||String(er.error))}</p></div>`;$("bk").onclick=()=>{S.im="";go("inv");};return;}
  const A=S.accounts.filter(a=>a.type==="investment"),ok=id=>A.some(a=>a.id===id),
    AL=ast.data.filter(a=>ok(a.account_id)),AM={},OB={},IB={},SB={},PV={};
  AL.forEach(a=>{AM[a.id]=a;});
  ops.data.forEach(o=>{if(AM[o.asset_id])(OB[o.asset_id]=OB[o.asset_id]||[]).push(o);});
  inc.data.forEach(i=>{if(AM[i.asset_id])(IB[i.asset_id]=IB[i.asset_id]||[]).push(i);});
  snp.data.forEach(s=>{if(AM[s.asset_id])(SB[s.asset_id]=SB[s.asset_id]||[]).push(s);});
  (pos.data||[]).forEach(p=>{PV[p.asset_id]=p;});
  const posAt=(id,d)=>{let r=null;(OB[id]||[]).forEach(o=>{if(o.date<=d)r=o;});return r?{q:Number(r.qty_after||0),c:Number(r.cost_after||0)}:{q:0,c:0};},
    snapAt=(id,d)=>{let r=null;(SB[id]||[]).forEach(s=>{if(s.date<=d)r=s;});return r;},
    valAt=(a,d)=>{const p=posAt(a.id,d);if(!(p.q>0||p.c>0))return{v:0,s:null};
      const s=snapAt(a.id,d),v=s?(a.price_mode==="quote"?p.q*Number(s.value):Number(s.value)):p.c;return{v:r2(v),s:s?s.date:null};},
    valNow=a=>{const w=PV[a.id];if(w&&w.current_value!=null)return{v:Number(w.current_value)||0,s:w.last_value!=null?w.last_date:null};return valAt(a,td);};
  const fy=ops.data.length?Number(ops.data[0].date.slice(0,4)):cy,yrs=[];
  for(let y=cy;y>=Math.min(fy,cy-6);y--)yrs.push(y);
  const key=String(S.rpd||"all");
  let D0=null,D1=td,lab="Desde o início";
  if(key==="12m"){D0=(cy-1)+td.slice(4);lab="Últimos 12 meses";}
  else if(/^\d{4}$/.test(key)){const y=Math.min(cy,Number(key));D0=(y-1)+"-12-31";D1=y===cy?td:y+"-12-31";lab=y===cy?y+" (até hoje)":String(y);}
  const calc=a=>{
    const g={inv:0,rec:0,fim:0,fl:[],snap:null,sem:false},v0=D0?valAt(a,D0):{v:0};
    if(v0.v>0){g.inv+=v0.v;g.fl.push({d:D0,v:-v0.v});}
    (OB[a.id]||[]).forEach(o=>{if((D0&&o.date<=D0)||o.date>D1)return;
      const am=Number(o.amount),fe=Number(o.fees||0);
      if(o.side==="buy"){g.inv+=am+fe;g.fl.push({d:o.date,v:-(am+fe)});}else{g.rec+=am-fe;g.fl.push({d:o.date,v:am-fe});}});
    (IB[a.id]||[]).forEach(i=>{if((D0&&i.date<=D0)||i.date>D1)return;const n=Number(i.net);g.rec+=n;g.fl.push({d:i.date,v:n});});
    const v1=D1===td?valNow(a):valAt(a,D1);
    g.fim=v1.v;g.snap=v1.s;g.sem=v1.v>0&&!v1.s;
    if(v1.v>0)g.fl.push({d:D1,v:v1.v});
    g.ganho=g.fim+g.rec-g.inv;return g;};
  const xirr=flows=>{
    if(!flows.some(f=>f.v<0)||!flows.some(f=>f.v>0))return null;
    const ms=d=>Date.parse(d+"T00:00:00Z"),t0=Math.min(...flows.map(f=>ms(f.d))),
      T=flows.map(f=>({t:(ms(f.d)-t0)/864e5/365,v:f.v})),span=Math.max(...T.map(x=>x.t))*365;
    if(span<360)return{short:true};
    const F=r=>T.reduce((s,x)=>s+x.v/Math.pow(1+r,x.t),0);
    let lo=-0.99,hi=10,flo=F(lo),fhi=F(hi);
    if(!isFinite(flo)||!isFinite(fhi)||flo*fhi>0)return null;
    for(let i=0;i<200;i++){const m=(lo+hi)/2,fm=F(m);if(flo*fm<=0){hi=m;fhi=fm;}else{lo=m;flo=fm;}}
    return{r:(lo+hi)/2};};
  const pc=v=>v==null?"—":(v=Math.abs(v)<5e-5?0:v,v>=0?"+":"")+(v*100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%",
    ann=g=>{const x=xirr(g.fl);return !x||x.short?"—":pc(x.r)+" a.a.";},
    pct=g=>g.inv>0?g.ganho/g.inv:null,
    cls=g=>g.ganho<0?"neg":"pos",
    sum=(a,b)=>({inv:a.inv+b.inv,rec:a.rec+b.rec,fim:a.fim+b.fim,fl:a.fl.concat(b.fl),sem:a.sem||b.sem,ganho:a.ganho+b.ganho}),
    zero=()=>({inv:0,rec:0,fim:0,fl:[],sem:false,ganho:0});
  const R=AL.map(a=>({a,g:calc(a)})).filter(x=>x.g.inv>0||x.g.rec>0||x.g.fim>0),
    TOT=R.reduce((t,x)=>sum(t,x.g),zero()),CL={};
  R.forEach(x=>{CL[x.a.class]=sum(CL[x.a.class]||zero(),x.g);});
  const L1=fdt(D1),
    det=g=>`<div class="mu">Investido ${mm(g.inv)} · recebido ${mm(g.rec)} · valor em ${L1} ${mm(g.fim)}</div>
      <div class="mu">Ganho ${pc(pct(g))} · taxa anualizada ${ann(g)}</div>`,
    head=(t,g,s)=>`<div style="display:flex;justify-content:space-between;gap:8px"><b>${t}</b><b class="${cls(g)}">${mm(g.ganho)}</b></div>${s?`<div class="mu">${s}</div>`:""}`;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Rentabilidade</b>
    <label>Período<select id="rpd"><option value="all">Desde o início</option><option value="12m">Últimos 12 meses</option>${yrs.map(y=>`<option value="${y}">${y===cy?y+" (até hoje)":y}</option>`).join("")}</select></label>
    <p class="mu">${lab}: ${D0?"do fim de "+fdt(D0):"do primeiro lançamento"} até ${L1}. Ganho = valor no fim + recebido − investido.</p></div>
    ${R.length?`<div class="card"><b>Total da carteira</b>
      <div class="row" style="display:block">${head("Ganho no período",TOT)}${det(TOT)}</div>
      ${TOT.sem?'<p class="mu neg">Há ativos sem cotação ou valor atualizado: eles entram pelo custo e só refletem os rendimentos pagos.</p>':""}</div>
    <div class="card"><b>Por classe</b>${Object.keys(ICLS).filter(k=>CL[k]).map(k=>`<div class="row" style="display:block">${head(ICLS[k],CL[k])}${det(CL[k])}</div>`).join("")}</div>
    <div class="card"><b>Por ativo</b>${R.map(x=>{const a=x.a,g=x.g;
      return `<div class="row" style="display:block">${head(esc(a.ticker||a.name),g,(a.ticker?esc(a.name)+" · ":"")+ICLS[a.class]+(a.is_active?"":" · inativo")+(g.sem?' · <span class="neg">sem cotação (usa o custo)</span>':g.snap&&g.fim>0?" · cotação de "+fdt(g.snap):""))}${det(g)}</div>`;}).join("")}</div>`
    :`<div class="card"><p class="mu">Nenhuma operação, rendimento ou posição de ativos nesse período.</p></div>`}
    <div class="card"><b>Como ler</b>
      <p class="mu">Investido: compras mais taxas e, quando o período não começa no início, o valor que a posição já tinha no começo (última cotação até aquela data, ou o custo). Reaplicações contam de novo.</p>
      <p class="mu">Recebido: vendas e resgates líquidos de taxas (o IR retido já está fora do valor) e rendimentos líquidos.</p>
      <p class="mu">Valor no fim: quantidade × cotação, ou o valor atualizado informado; sem cotação, usa o custo.</p>
      <p class="mu">Taxa anualizada: usa a data de cada fluxo e só aparece com 1 ano ou mais de período.</p>
      <p class="mu">O ganho não considera imposto a pagar na declaração nem ganho de capital de ações, e só é tão completo quanto os lançamentos antigos.</p></div>`;
  $("rpd").value=key;
  $("bk").onclick=()=>{S.im="";go("inv");};
  $("rpd").onchange=()=>{S.rpd=$("rpd").value;viewRent();};
}

async function viewInv(){
  const hid=S.hid,y0=today().slice(0,4)+"-01-01",[sm,po,op,ri,ry,ast]=await Promise.all([
    sb.from("investment_account_summary").select("*").eq("household_id",hid),
    sb.from("investment_positions").select("*").eq("household_id",hid).order("name"),
    sb.from("investment_operations").select("id,date,side,quantity,amount,fees,tax_withheld,net_balance_before,realized_result,investment_assets(name,ticker)").eq("household_id",hid).order("date",{ascending:false}).order("created_at",{ascending:false}).limit(15),
    sb.from("investment_income").select("id,date,kind,tax_withheld,net,investment_assets(name,ticker)").eq("household_id",hid).order("date",{ascending:false}).order("created_at",{ascending:false}).limit(15),
    sb.from("investment_income").select("net").eq("household_id",hid).gte("date",y0),
    sb.from("investment_assets").select("id,account_id,class,price_mode,ticker,name,cnpj,rate,maturity,is_active").eq("household_id",hid).order("name")]);
  if(S.tab!=="inv")return;
  const er=[sm,po,op,ri,ry,ast].find(r=>r.error);
  if(er){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(er.error.message)}</p><p class="mu">Se a tabela ou a view não existe, rode o script investimentos_fase1.sql no Supabase.</p></div>`;$("bk").onclick=()=>go("acc");return;}
  const A=S.accounts.filter(a=>a.type==="investment"),ok=id=>A.some(a=>a.id===id),
    P=(po.data||[]).filter(p=>p.is_active&&ok(p.account_id)),H=P.filter(p=>Number(p.qty)>0),m=S.im||"",
    T=(sm.data||[]).filter(x=>ok(x.account_id)),cls={},sum=k=>T.reduce((r,x)=>r+Number(x[k]||0),0),td=new Date().toISOString().slice(0,10);
  H.forEach(p=>{cls[p.class]=(cls[p.class]||0)+Number(p.current_value);});
  const sel=(id,o)=>`<select id="${id}">${o}</select>`,accO=A.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join(""),
    clsO=Object.keys(ICLS).map(k=>`<option value="${k}">${ICLS[k]}</option>`).join("");
  let form="";
  if(m==="asset")form=`<div class="card"><b>Novo ativo</b>
    <label>Conta de investimento${sel("ia",accO)}</label>
    <label>Classe${sel("ic",clsO)}</label>
    <label>Como informar o valor${sel("ip",'<option value="quote">Quantidade × cotação (ações, FIIs, cripto)</option><option value="total">Valor total do título (Tesouro, renda fixa)</option>')}</label>
    <label>Ticker (código, ações e FIIs)<input id="it" placeholder="Ex.: ITSA4" autocapitalize="characters"></label>
    <label>Nome da empresa, fundo ou título<input id="in" placeholder="Ex.: Itaúsa PN"></label>
    <label>CNPJ (ações e FIIs, para o IR)<input id="icn" inputmode="numeric"></label>
    <label>Taxa (opcional)<input id="ir" placeholder="Ex.: IPCA + 6%"></label>
    <label>Vencimento (opcional)<input id="iv" type="date"></label>
    <button class="sec" id="isv">Salvar ativo</button><button class="lk" id="icx">Cancelar</button></div>`;
  if(m==="op")form=`<div class="card"><b>Nova operação</b>
    <label>Ativo${sel("oa",P.map(p=>`<option value="${p.asset_id}">${esc(p.ticker||p.name)} · ${esc(p.name)}</option>`).join(""))}</label>
    <label>Tipo${sel("os",'<option value="buy">Compra</option><option value="sell">Venda / resgate</option>')}</label>
    <label>Data<input id="od" type="date" value="${td}"></label>
    <label class="oq">Quantidade<input id="oqt" inputmode="decimal"></label>
    <label class="oq">Preço unitário (R$)<input id="opu" inputmode="decimal"></label>
    <label>Valor total (R$)<input id="ov" inputmode="decimal" placeholder="Em ações e FIIs, vazio = quantidade × preço"></label>
    <label>Corretagem e taxas (R$)<input id="of" inputmode="decimal" placeholder="0,00"></label>
    <div id="otx"><label>Resgate${sel("otp",'<option value="t">Total (zera a posição)</option><option value="p">Parcial (mantém o restante)</option>')}</label>
    <div id="otb"><label>Saldo líquido da posição antes do resgate (R$)<input id="otbv" inputmode="decimal" placeholder="0,00"></label>
    <p class="mu">Veja no app do banco, na tela do valor líquido (bruto menos os impostos do resgate). O app baixa o custo na mesma proporção do líquido resgatado e mantém o restante da posição.</p></div>
    <label>IR retido no resgate (R$, opcional)<input id="otv" inputmode="decimal" placeholder="0,00"></label>
    <p class="mu">Informe acima o valor LÍQUIDO recebido. O IR é só um registro para o Relatório de IR: não muda o caixa nem o resultado.</p></div>
    <p class="mu">Compra tira do caixa e sobe a posição; venda faz o contrário. Não é receita nem despesa. Em Tesouro e renda fixa, o resgate pode ser total ou parcial (informe o valor líquido recebido).</p>
    <button class="sec" id="osv">Salvar operação</button><button class="lk" id="ocx">Cancelar</button></div>`;
  if(m==="quo")form=`<div class="card"><b>Atualizar cotações</b>
    <label>Data<input id="qd" type="date" value="${td}"></label>
    ${H.map(p=>`<label>${esc(p.ticker||p.name)} · ${p.price_mode==="quote"?"cotação (R$ por unidade)":"valor total atualizado (R$)"}<input data-q="${p.asset_id}" inputmode="decimal" placeholder="${p.last_value!=null?nq(p.last_value):""}"></label>`).join("")||'<p class="mu">Nenhum ativo em carteira.</p>'}
    <button class="sec" id="qsv">Salvar</button><button class="lk" id="qcx">Cancelar</button></div>`;
  const KIND={juros:"Juros",dividendo:"Dividendo",jcp:"JCP",rendimento_fii:"Rendimento de FII",outros:"Outros"};
  if(m==="inc")form=`<div class="card"><b>Novo rendimento</b>
    <label>Ativo${sel("ra",P.map(p=>`<option value="${p.asset_id}">${esc(p.ticker||p.name)} (${esc(A.find(a=>a.id===p.account_id)?.name||"")})</option>`).join(""))}</label>
    <label>Tipo${sel("rk",Object.keys(KIND).map(k=>`<option value="${k}">${KIND[k]}</option>`).join(""))}</label>
    <label>Data de pagamento<input id="rd" type="date" value="${td}"></label>
    <label>Valor bruto (R$)<input id="rg" inputmode="decimal"></label>
    <label>IR retido (R$, opcional)<input id="rt" inputmode="decimal" placeholder="0,00"></label>
    <p class="mu" id="rn"></p>
    <p class="mu">Entra no caixa da conta de investimento pelo valor líquido. Não é receita nem entra no Resultado do período.</p>
    <button class="sec" id="rsv">Salvar rendimento</button><button class="lk" id="rcx">Cancelar</button></div>`;
  const AL=(ast.data||[]).filter(a=>ok(a.account_id)),qtyOf=id=>Number((po.data||[]).find(p=>p.asset_id===id)?.qty||0),
    accN=id=>esc(A.find(a=>a.id===id)?.name||""),ea=m==="edit"?AL.find(x=>x.id===S.ie):null;
  if(m==="edit"&&ea)form=`<div class="card"><b>Editar ativo</b>
    <p class="mu">${accN(ea.account_id)} · ${ICLS[ea.class]} (conta, classe e modo de valor não mudam)</p>
    <label>Ticker (código)<input id="et" value="${esc(ea.ticker||"")}" autocapitalize="characters"></label>
    <label>Nome<input id="en" value="${esc(ea.name)}"></label>
    <label>CNPJ (opcional)<input id="ecn" inputmode="numeric" value="${esc(ea.cnpj||"")}"></label>
    <label>Taxa (opcional)<input id="er" value="${esc(ea.rate||"")}"></label>
    <label>Vencimento (opcional)<input id="ev" type="date" value="${esc(ea.maturity||"")}"></label>
    <button class="sec" id="esv">Salvar alterações</button><button class="lk" id="iec">Cancelar</button></div>`;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Investimentos</b>
    ${A.length?`<div class="row" style="margin-top:8px"><b>Patrimônio</b><b>${mm(sum("total"))}</b></div>
    <div class="row"><span class="mu">Caixa (ainda não investido)</span><span>${mm(sum("cash"))}</span></div>
    <div class="row"><span class="mu">Em ativos</span><span>${mm(sum("in_assets"))}</span></div>
    <div class="row"><span class="mu">Rendimentos no ano (líquido)</span><span class="pos">${mm((ry.data||[]).reduce((r,x)=>r+Number(x.net),0))}</span></div>
    ${Object.keys(cls).map(k=>`<div class="row" style="padding-left:14px"><span class="mu">${ICLS[k]}</span><span>${mm(cls[k])}</span></div>`).join("")}`
    :'<p class="mu">Crie em Contas uma conta do tipo Investimento (em reais) e transfira dinheiro para ela. Cada aporte é uma transferência.</p>'}</div>
  ${A.length&&!m?`<div class="card"><button class="sec" id="nb" style="margin-top:0">+ Ativo</button><button class="sec" id="no" ${P.length?"":"disabled"}>+ Operação (compra ou venda)</button><button class="sec" id="nq" ${H.length?"":"disabled"}>Atualizar cotações</button><button class="sec" id="nr" ${P.length?"":"disabled"}>+ Rendimento</button><button class="sec" id="nir">Relatório de IR</button><button class="sec" id="nrt">Rentabilidade</button></div>`:""}
  ${form}
  ${H.length?`<div class="card"><b>Posições</b>${H.map(p=>{const q=p.price_mode==="quote",res=Number(p.current_value)-Number(p.cost);
    return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(p.ticker||p.name)}</b><b>${mm(p.current_value)}</b></div>
    <div class="mu">${esc(p.name)} · ${ICLS[p.class]} · ${q?`${nq(p.qty)} un. · preço médio ${mm(p.avg_price)}${p.last_value!=null?" · cotação "+mm(p.last_value)+" ("+fdt(p.last_date)+")":" · sem cotação (usa o preço médio)"}`:`custo ${mm(p.cost)}${p.last_value!=null?" · atualizado em "+fdt(p.last_date):" · sem valor informado (usa o custo)"}`}</div>
    <div class="${res<0?"neg":"pos"}" style="font-size:.85rem">Resultado ${mm(res)}</div></div>`;}).join("")}</div>`:""}
  ${(op.data||[]).length?`<div class="card"><b>Últimas operações</b>${op.data.map(o=>`<div class="row"><div><div>${o.side==="buy"?"Compra":(o.net_balance_before!=null&&Number(o.amount)<Number(o.net_balance_before)?"Resgate parcial":"Venda")} · ${esc(o.investment_assets?.ticker||o.investment_assets?.name||"")}</div><div class="mu">${fdt(o.date)}${o.quantity?" · "+nq(o.quantity)+" un.":""}${Number(o.fees)?" · taxas "+mm(o.fees):""}${Number(o.tax_withheld)?" · IR retido "+mm(o.tax_withheld):""}${o.realized_result!=null?" · resultado "+mm(o.realized_result):""}</div></div><div style="white-space:nowrap"><span>${mm(o.amount)}</span><button class="x" data-od="${o.id}">✕</button></div></div>`).join("")}</div>`:""}`;
  if((ri.data||[]).length)$("main").insertAdjacentHTML("beforeend",`<div class="card"><b>Últimos rendimentos</b>${ri.data.map(i=>`<div class="row"><div><div>${KIND[i.kind]} · ${esc(i.investment_assets?.ticker||i.investment_assets?.name||"")}</div><div class="mu">${fdt(i.date)}${Number(i.tax_withheld)?" · IR retido "+mm(i.tax_withheld):""}</div></div><div style="white-space:nowrap"><span class="pos">${mm(i.net)}</span><button class="x" data-ri="${i.id}">✕</button></div></div>`).join("")}</div>`);
  if(A.length&&AL.length)$("main").insertAdjacentHTML("beforeend",`<div class="card"><b>Ativos cadastrados</b>${AL.map(a=>`<div class="row" style="display:block;${a.is_active?"":"opacity:.6"}"><div><b>${esc(a.ticker||a.name)}</b>${a.ticker?" · "+esc(a.name):""}${a.is_active?"":" (inativo)"}</div>
    <div class="mu">${accN(a.account_id)} · ${ICLS[a.class]}${a.rate?" · "+esc(a.rate):""}${a.maturity?" · venc. "+fdt(a.maturity):""}</div>
    <div><button class="lk" data-ae="${a.id}">Editar</button> <button class="lk" data-ai="${a.id}">${a.is_active?"Inativar":"Reativar"}</button> <button class="lk neg" data-ax="${a.id}">Excluir</button></div></div>`).join("")}</div>`);
  const rl=()=>{S.im="";S.ie="";viewInv();};
  $("bk").onclick=()=>go("acc");
  if($("nb"))$("nb").onclick=()=>{S.im="asset";viewInv();};
  if($("no"))$("no").onclick=()=>{S.im="op";viewInv();};
  if($("nq"))$("nq").onclick=()=>{S.im="quo";viewInv();};
  if($("nr"))$("nr").onclick=()=>{S.im="inc";viewInv();};
  if($("nir"))$("nir").onclick=()=>go("ir");
  if($("nrt"))$("nrt").onclick=()=>go("rent");
  ["icx","ocx","qcx","rcx","iec"].forEach(i=>{if($(i))$(i).onclick=rl;});
  if($("ic"))$("ic").onchange=()=>{$("ip").value=["acoes","fiis","cripto"].includes($("ic").value)?"quote":"total";};
  if($("ic"))$("ic").onchange();
  if($("isv"))$("isv").onclick=async()=>{const n=$("in").value.trim(),t=$("it").value.trim().toUpperCase();
    if(!n){alert("Informe o nome.");return;}
    const {error}=await sb.from("investment_assets").insert({household_id:hid,account_id:$("ia").value,class:$("ic").value,price_mode:$("ip").value,ticker:t||null,name:n,cnpj:$("icn").value.trim()||null,rate:$("ir").value.trim()||null,maturity:$("iv").value||null});
    if(error){alert("Erro: "+error.message);return;}rl();};
  const sync=()=>{const a=P.find(x=>x.asset_id===$("oa").value);document.querySelectorAll(".oq").forEach(e=>{e.style.display=a&&a.price_mode==="quote"?"":"none";});
    if($("otx"))$("otx").style.display=a&&a.price_mode==="total"&&$("os").value==="sell"?"":"none";
    if($("otb"))$("otb").style.display=$("otp").value==="p"?"":"none";};
  if($("oa")){$("oa").onchange=sync;$("os").onchange=sync;if($("otp"))$("otp").onchange=sync;sync();}
  if($("osv"))$("osv").onclick=async()=>{const a=P.find(x=>x.asset_id===$("oa").value),q=a.price_mode==="quote",
      qt=q?num($("oqt").value||""):null,pu=q&&$("opu").value?num($("opu").value):null,fe=$("of").value?num($("of").value):0;
    let am=$("ov").value?num($("ov").value):(q&&qt&&pu?r2(qt*pu):NaN);
    if(!$("od").value||!(am>0)||(q&&!(qt>0))||!(fe>=0)){alert("Confira data, quantidade e valores.");return;}
    const sellTot=!q&&$("os").value==="sell",tx=sellTot&&$("otv").value.trim()?r2(num($("otv").value)):0;
    if(sellTot&&!(tx>=0&&tx<am)){alert("O IR retido deve ser zero ou maior e menor que o valor líquido recebido.");return;}
    const par=sellTot&&$("otp").value==="p",bal=par?r2(num($("otbv").value||"")):null;
    if(par&&!(bal>am)){alert("No resgate parcial, o saldo líquido antes do resgate deve ser maior que o valor líquido recebido. Se você resgatou tudo, escolha Total.");return;}
    const dt=$("od").value,{error}=await sb.from("investment_operations").insert({asset_id:a.asset_id,date:dt,side:$("os").value,quantity:qt,unit_price:pu,amount:am,fees:fe,tax_withheld:tx,net_balance_before:par?bal:null});
    if(error){alert("Erro: "+error.message);return;}
    if(par){
      const lv=a.last_value!=null?Number(a.last_value):null;
      if(lv!=null&&a.last_date&&a.last_date<=dt){
        const nv=r2(lv*(1-am/bal)),{error:e2}=await sb.from("investment_snapshots").upsert([{asset_id:a.asset_id,date:dt,value:nv}],{onConflict:"asset_id,date"});
        alert(e2?"Resgate parcial gravado, mas não consegui atualizar o valor da posição restante ("+e2.message+"). Atualize em Atualizar cotações.":"Resgate parcial gravado. O valor atualizado da posição restante foi estimado em "+mm(nv)+" ("+fdt(dt)+"). Se quiser, ajuste em Atualizar cotações.");
      }else alert("Resgate parcial gravado. Atualize o valor da posição restante em Atualizar cotações, para o patrimônio não ficar com o valor antigo.");
    }
    rl();};
  if($("qsv"))$("qsv").onclick=async()=>{const d=$("qd").value,rows=[...document.querySelectorAll("[data-q]")].filter(i=>i.value.trim()).map(i=>({asset_id:i.dataset.q,date:d,value:num(i.value)}));
    if(!d||!rows.length||rows.some(r=>!(r.value>=0))){alert("Informe a data e ao menos um valor válido.");return;}
    const {error}=await sb.from("investment_snapshots").upsert(rows,{onConflict:"asset_id,date"});
    if(error){alert("Erro: "+error.message);return;}rl();};
  const rnv=()=>{const g=num($("rg").value||""),t=$("rt").value?num($("rt").value):0;$("rn").textContent=g>0&&t>=0&&t<=g?"Líquido: "+mm(g-t):"";};
  if($("rg")){$("rg").oninput=rnv;$("rt").oninput=rnv;}
  if($("rsv"))$("rsv").onclick=async()=>{const g=num($("rg").value||""),t=$("rt").value?num($("rt").value):0;
    if(!$("rd").value||!(g>0)||!(t>=0)||t>g){alert("Confira a data, o valor bruto e o IR retido (não pode passar do bruto).");return;}
    const {error}=await sb.from("investment_income").insert({asset_id:$("ra").value,date:$("rd").value,kind:$("rk").value,gross:g,tax_withheld:t});
    if(error){alert("Erro: "+error.message);return;}rl();};
  document.querySelectorAll("[data-ri]").forEach(b=>b.onclick=async()=>{if(!confirm("Apagar este rendimento? O caixa da conta será recalculado."))return;
    const {error}=await sb.from("investment_income").delete().eq("id",b.dataset.ri);
    if(error)alert("Erro: "+error.message);viewInv();});
  document.querySelectorAll("[data-od]").forEach(b=>b.onclick=async()=>{if(!confirm("Apagar esta operação? O preço médio será recalculado."))return;
    const {error}=await sb.from("investment_operations").delete().eq("id",b.dataset.od);
    if(error)alert("Erro: "+error.message);viewInv();});
  document.querySelectorAll("[data-ae]").forEach(b=>b.onclick=()=>{S.im="edit";S.ie=b.dataset.ae;viewInv();});
  if($("esv"))$("esv").onclick=async()=>{const n=$("en").value.trim();
    if(!n){alert("Informe o nome.");return;}
    const {error}=await sb.from("investment_assets").update({ticker:$("et").value.trim().toUpperCase()||null,name:n,cnpj:$("ecn").value.trim()||null,rate:$("er").value.trim()||null,maturity:$("ev").value||null}).eq("id",S.ie);
    if(error){alert("Erro: "+error.message);return;}rl();};
  document.querySelectorAll("[data-ai]").forEach(b=>b.onclick=async()=>{const a=AL.find(x=>x.id===b.dataset.ai);if(!a)return;
    if(a.is_active){
      if(qtyOf(a.id)>0){alert("Este ativo ainda tem posição em carteira. Venda ou resgate tudo antes de inativar.");return;}
      if(!confirm("Inativar este ativo? Ele sai das listas de operação e rendimento, mas o histórico continua guardado."))return;
    }
    const {error}=await sb.from("investment_assets").update({is_active:!a.is_active}).eq("id",a.id);
    if(error)alert("Erro: "+error.message);viewInv();});
  document.querySelectorAll("[data-ax]").forEach(b=>b.onclick=async()=>{const a=AL.find(x=>x.id===b.dataset.ax);if(!a)return;
    const cnt=t=>sb.from(t).select("id",{count:"exact",head:true}).eq("asset_id",a.id),
      [o,i,q]=await Promise.all([cnt("investment_operations"),cnt("investment_income"),cnt("investment_snapshots")]),e=[o,i,q].find(r=>r.error);
    if(e){alert("Erro: "+e.error.message);return;}
    if(o.count>0||i.count>0){alert("Não dá para excluir: este ativo tem "+o.count+" operação(ões) e "+i.count+" rendimento(s). Apague esses lançamentos primeiro (botão ✕ nas listas; isso muda o caixa da conta) ou, se não há posição, apenas inative o ativo.");return;}
    if(!confirm("Excluir o ativo "+(a.ticker||a.name)+" definitivamente?"+(q.count>0?" As "+q.count+" cotação(ões) registrada(s) serão apagadas junto.":"")))return;
    const {error}=await sb.from("investment_assets").delete().eq("id",a.id);
    if(error)alert("Erro: "+error.message);viewInv();});
}
