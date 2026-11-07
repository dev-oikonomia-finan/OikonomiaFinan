/* ================= PROJEÇÃO DE PATRIMÔNIO (aberta pelo botão 📈 do Painel) =================
   Ponto de partida: Saldo geral do Painel (S.pjBase, gravado pelo Painel ao abrir esta tela).
   Economia por mês: média do Resultado (period_summary) dos últimos 12 meses fechados que têm lançamentos; editável.
   Cenários: 1 como está hoje; 2 dentro da meta (receita média − meta mensal do Total geral); 3 economizando X% a mais na categoria Y.
   Conta: juros compostos mensais sobre o patrimônio todo + economia no fim de cada mês. Campos no aparelho.
   Desde 06/11/2026: seletor de previdência e FGTS (começa igual ao Painel) e "Salvar esta projeção" (projection_snapshots, congelada,
   valores de 1 a 20 anos); tela "Projeções salvas" (viewPjs, rota pjs) compara com as fotos mensais do patrimônio (patrimony_snapshots,
   gravadas pelo Painel). Script: projecoes_salvas.sql. */
let PJ=null,PJT=null,PJS=null;
const PJ_PV={none:"Sem previdência e FGTS",own:"Com previdência e FGTS: só o resgatável",all:"Com previdência e FGTS: resgatável + potencial",nm:"Com previdência e FGTS: resgatável + potencial − multa FGTS"};
/* patrimônio com a forma de previdência e FGTS escolhida; b = {base (sem previdência e FGTS), own, all, nm} */
const pjVal=(b,m)=>Number(b.base||0)+(m==="own"?Number(b.own||0):m==="all"?Number(b.all||0):m==="nm"?Number(b.nm||0):0);
/* valor futuro: juros compostos mensais (taxa ao ano em %) e economia no fim de cada mês */
const pjFv=(p0,ratePct,pmt,m)=>{const i=Math.pow(1+ratePct/100,1/12)-1;return Math.abs(i)<1e-12?p0+pmt*m:p0*Math.pow(1+i,m)+pmt*(Math.pow(1+i,m)-1)/i;};
const pjMl=m=>MESES[+m.slice(5,7)-1].slice(0,3)+"/"+m.slice(0,4);
/* linhas do cenário 3 (no aparelho, chave pjl): [{c: categoria, x: "% a mais"}]; migra a versão de 1 categoria (pjc/pjx) */
function pjLs(){let L=null;try{L=JSON.parse(lsGet("pjl")||"null");}catch(e){}
  if(!Array.isArray(L)){const c=lsGet("pjc");L=[{c:c||"",x:lsGet("pjx")||"10"}];}
  return L.filter(l=>l&&typeof l==="object").map(l=>({c:String(l.c||""),x:String(l.x==null?"10":l.x)}));}
function pjSave(L){lsSet("pjl",JSON.stringify(L));}
function pjSch(){clearTimeout(PJT);PJT=setTimeout(calcProj,250);}
/* desenha as linhas de categoria do cenário 3 (o valor por mês de cada uma é preenchido por calcProj) */
function pjLines(){const box=$("pjcl");if(!box)return;const L=pjLs();
  box.innerHTML=L.length?L.map((l,i)=>`<div class="row" style="display:block"><div style="display:flex;gap:6px;align-items:center">
    <select data-ci="${i}" style="flex:2;min-width:0"><option value="">(escolha a categoria)</option>${catOpts("expense",l.c||null)}</select>
    <input data-cx="${i}" inputmode="decimal" value="${esc(l.x)}" style="width:64px" aria-label="% a mais"><span>%</span>
    <button class="x" data-cd="${i}" title="Retirar esta categoria">✕</button></div>
    <div class="mu" id="pjv${i}">${l.c?"Calculando…":""}</div></div>`).join(""):'<p class="mu">Nenhuma categoria. Toque em “+ Adicionar categoria”.</p>';
  box.querySelectorAll("[data-ci]").forEach(el=>el.onchange=()=>{const L=pjLs();L[+el.dataset.ci].c=el.value;pjSave(L);calcProj();});
  box.querySelectorAll("[data-cx]").forEach(el=>el.addEventListener("input",()=>{const L=pjLs();L[+el.dataset.cx].x=el.value.trim();pjSave(L);pjSch();}));
  box.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{const L=pjLs();L.splice(+b.dataset.cd,1);pjSave(L);pjLines();calcProj();});}
async function viewProj(){
  const hid=S.hid,base=S.pjBase&&S.pjBase.base!=null?S.pjBase:{base:0,own:0,all:0,nm:0,temPrev:false,pvDef:"none"};
  $("main").innerHTML='<div class="card mu" id="pjw">Carregando…</div>';try{window.scrollTo(0,0);}catch(e){}
  const curM=today().slice(0,8)+"01",M=[];for(let k=12;k>=1;k--)M.push(mAdd(curM,-k));
  const [ms,bp]=await Promise.all([
    Promise.all(M.map(m=>sb.rpc("period_summary",{p_household:hid,p_from:m,p_to:mAdd(m,1),p_card_mode:cm()}))),
    sb.rpc("budget_progress",{p_household:hid,p_ref:today(),p_period:"monthly",p_card_mode:cm()})]);
  if(!$("pjw")||S.hid!==hid)return;
  const e=ms.find(r=>r.error);
  if(e){$("pjw").className="card neg";$("pjw").textContent=e.error.message;return;}
  const MS=M.map((m,i)=>{const r=(ms[i].data&&ms[i].data[0])||{};return {m,inc:Number(r.income)||0,exp:Number(r.expense)||0};});
  const tot=bp.error?null:(bp.data||[]).find(x=>!x.category_id);
  PJ={hid,base,pv:base.temPrev?(base.pvDef||"none"):"none",curM,M,MS,meta:tot?Number(tot.budget_amount):null,metaErr:bp.error?bp.error.message:null,cs:{}};
  drawProj();}

function drawProj(){
  const P=PJ;if(!P||!$("pjw"))return;
  const br=v=>fmt(v,"BRL"),ml=m=>new Date(m+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).replace(".","");
  const W=P.MS.filter(x=>Math.abs(x.inc)>=0.005||Math.abs(x.exp)>=0.005),n=W.length;
  P.W=W;P.avgR=n?Math.round(W.reduce((t,x)=>t+x.inc+x.exp,0)/n*100)/100:0;P.avgI=n?W.reduce((t,x)=>t+x.inc,0)/n:0;
  const g=(k,d)=>{const v=lsGet(k);return v==null||v===""?d:v;};
  const sv=lsGet("pjs");
  const p0=pjVal(P.base,P.pv);
  $("main").innerHTML=`<div class="card" id="pjw"><button class="lk" id="pjbk">← Painel</button> <b>📈 Projeção de patrimônio</b> <button class="lk" id="pjlist">📂 Projeções salvas</button>
    <div class="row"><span>Patrimônio hoje<span class="mu" style="display:block" id="pjpl">Saldo geral do Painel · ${esc(PJ_PV[P.pv])}</span></span><b id="pjp0" class="${p0<0?"neg":"pos"}">${br(p0)}</b></div>
    ${P.base.temPrev?`<label>Previdência e FGTS na projeção<select id="pjpv">${Object.keys(PJ_PV).map(k=>`<option value="${k}" ${P.pv===k?"selected":""}>${PJ_PV[k]}</option>`).join("")}</select></label><div class="mu">Começa igual ao Painel; mudar aqui não muda o Painel.</div>`:""}
    <label>Economia por mês (R$; negativo se gasta mais do que recebe)<input id="pjs" inputmode="decimal" value="${fa(sv==null||sv===""?P.avgR:Number(sv))}"></label>
    <div class="mu">${n?`Média do Resultado de ${n} ${n===1?"mês":"meses"} com lançamentos (${ml(W[0].m)} a ${ml(W[n-1].m)}): <b>${br(P.avgR)}</b>`:"Nenhum mês fechado com lançamentos nos últimos 12: informe a economia por mês."}${n?' · <button class="lk" id="pjavg">usar a média</button>':""}</div>
    ${n?`<details><summary class="mu">Ver mês a mês</summary>${P.MS.map(x=>`<div class="row"><span>${ml(x.m)}${W.includes(x)?"":' <span class="mu">(sem lançamentos, fora da média)</span>'}</span><span class="mu">${br(x.inc)} ${br(x.exp)} = <b class="${x.inc+x.exp<0?"neg":"pos"}">${br(x.inc+x.exp)}</b></span></div>`).join("")}<div class="mu">Receitas, despesas e Resultado de cada mês, pelas regras do Resultado do Painel (contas corrente, dinheiro, cartão e vale; sem transferências; cartão ${cm()==="stm"?"pela fatura":"pela compra"}).</div></details>`:""}
    <div style="display:flex;gap:8px"><label style="flex:1">Rendimento ao ano (%)<input id="pjr" inputmode="decimal" value="${esc(g("pjr","5"))}"></label><label style="flex:1">Anos<input id="pjn" type="number" min="1" max="60" inputmode="numeric" value="${esc(g("pjn","20"))}"></label></div>
    <div class="mu">Use um rendimento acima da inflação (ex.: 5%) para ver os valores em dinheiro de hoje.</div>
    <div style="margin-top:10px"><b>Cenário 3: economizar nas categorias</b><div class="mu">Escolha as categorias e quanto % a menos gastaria em cada uma.</div></div>
    <div id="pjcl"></div><button class="lk" id="pjadd">+ Adicionar categoria</button><div id="pjct"></div>
    </div><div class="card" id="pjres"></div>
    <div class="card"><b>💾 Salvar esta projeção</b><div class="mu">Guarda o patrimônio de partida, os campos acima e o valor de cada cenário ano a ano, de 1 a 20 anos, para comparar no futuro com o patrimônio real. Depois de salva, a projeção não muda (só o nome).</div>
    <label>Nome<input id="pjnm" maxlength="80" value="Projeção ${pjMl(P.curM)}"></label><button class="pri" id="pjsv">💾 Salvar esta projeção</button><p id="pjsm" class="mu"></p></div>`;
  $("pjbk").onclick=()=>go("dash");$("pjlist").onclick=()=>go("pjs");$("pjsv").onclick=pjSaveSnap;
  if($("pjpv"))$("pjpv").onchange=()=>{P.pv=$("pjpv").value;const v=pjVal(P.base,P.pv);$("pjp0").textContent=br(v);$("pjp0").className=v<0?"neg":"pos";$("pjpl").textContent="Saldo geral do Painel · "+PJ_PV[P.pv];calcProj();};
  if($("pjavg"))$("pjavg").onclick=()=>{lsSet("pjs","");drawProj();};
  $("pjs").addEventListener("input",()=>{lsSet("pjs",String(num($("pjs").value)));pjSch();});
  [["pjr","pjr"],["pjn","pjn"]].forEach(([i,k])=>$(i).addEventListener("input",()=>{lsSet(k,$(i).value.trim());pjSch();}));
  $("pjadd").onclick=()=>{const L=pjLs();L.push({c:"",x:"10"});pjSave(L);pjLines();calcProj();};
  pjLines();calcProj();}

/* gasto médio por mês da categoria (e subcategorias) nos mesmos meses da média; pela data da compra; estornos abatem */
async function pjCatAvg(cat){
  const P=PJ;if(P.cs[cat]!==undefined)return P.cs[cat];
  const ids=[cat];for(let i=0;i<ids.length;i++)S.catsAll.filter(z=>z.parent_id===ids[i]).forEach(z=>ids.push(z.id));
  const r=await ddAll(()=>sb.from("transactions").select("id,date,amount,fx_rate_to_base").eq("household_id",P.hid).is("transfer_group_id",null).in("category_id",ids).gte("date",P.M[0]).lt("date",P.curM).order("id"));
  if(r.error)return {error:r.error.message};
  const ok=new Set(P.W.map(x=>x.m.slice(0,7))),tot=r.data.filter(t=>ok.has(t.date.slice(0,7))).reduce((s,t)=>s-Number(t.amount)*Number(t.fx_rate_to_base||1),0);
  return P.cs[cat]={v:P.W.length?Math.round(tot/P.W.length*100)/100:0};}

async function calcProj(){
  const P=PJ,box=$("pjres");if(!P||!box)return;
  const br=v=>fmt(v,"BRL"),save=num($("pjs").value),a=num($("pjr").value)/100,N=Math.max(1,Math.min(60,parseInt($("pjn").value)||20));
  if(!(a>-1)||a>1){P.last=null;box.innerHTML='<p class="neg">Informe um rendimento entre −100% e 100% ao ano.</p>';return;}
  const p0=pjVal(P.base,P.pv),fv=(pmt,m)=>pjFv(p0,a*100,pmt,m);
  /* cenário 3: soma o valor por mês de cada linha; categoria repetida, ou subcategoria de outra linha, não entra (contaria duas vezes) */
  const my=P.tk=(P.tk||0)+1,LN=pjLs(),idx=LN.map((l,j)=>j).filter(j=>LN[j].c);
  const rs=await Promise.all(idx.map(j=>pjCatAvg(LN[j].c)));
  if(!$("pjres")||my!==P.tk)return;
  const up=c=>{const o=[];for(let z=(S.catsAll.find(y=>y.id===c)||{}).parent_id,k=0;z&&k<20;k++){o.push(z);z=(S.catsAll.find(y=>y.id===z)||{}).parent_id;}return o;};
  let c3=null,c3msg="",sumX=0,sumAvg=0;const parts=[],lines=[];
  idx.forEach((j,q)=>{const l=LN[j],r=rs[q],el=$("pjv"+j),pc=num(l.x);
    const dup=idx.slice(0,q).some(k=>LN[k].c===l.c),anc=up(l.c).find(a=>idx.some(k=>k!==j&&LN[k].c===a));
    let t;
    if(r.error)t=`<span class="neg">${esc(r.error)}</span>`;
    else if(!(pc>=0&&pc<=100))t='<span class="neg">Informe um % entre 0 e 100.</span>';
    else{const v=Math.round(r.v*pc)/100;
      t=`gasto médio ${br(r.v)} por mês · ${String(pc).replace(".",",")}% = <b>${br(v)} por mês</b>`;
      if(dup)t+=' · <span class="neg">⚠️ categoria repetida: não entra no total</span>';
      else if(anc)t+=` · <span class="neg">⚠️ já está dentro de ${esc(catName(anc))}: não entra no total</span>`;
      else{sumX+=v;sumAvg+=r.v;parts.push(`${catName(l.c)} ${String(pc).replace(".",",")}%`);lines.push({c:l.c,name:catName(l.c),pct:pc,avg:r.v,val:v});}}
    if(el)el.innerHTML=t;});
  if(rs.some(r=>r.error))c3msg='<p class="neg">Não consegui ler o gasto de alguma categoria.</p>';
  const avgE=P.W.length?P.W.reduce((t,x)=>t-x.exp,0)/P.W.length:0;sumX=Math.round(sumX*100)/100;
  if($("pjct"))$("pjct").innerHTML=parts.length?`<div class="row" style="border-top:2px solid var(--ac)"><span>Total economizado por mês<span class="mu" style="display:block">${sumAvg>0?(sumX/sumAvg*100).toFixed(1).replace(".",",")+"% do gasto dessas categorias":""}${avgE>0?(sumAvg>0?" · ":"")+(sumX/avgE*100).toFixed(1).replace(".",",")+"% das despesas médias do mês ("+br(avgE)+")":""}</span></span><b>${br(sumX)}</b></div>`:"";
  if(parts.length)c3={extra:sumX,lab:parts.join(", ")};
  /* txt = texto puro do cenário (vai para a projeção salva); sub = o mesmo, escapado para a tela */
  const SC=[{k:1,t:"Como está hoje",pmt:save,txt:`guardando ${br(save)} por mês`,c:"var(--ac)"}];
  if(P.meta!=null&&P.W.length)SC.push({k:2,t:"Dentro da meta",pmt:Math.round((P.avgI-P.meta)*100)/100,txt:`receita média ${br(P.avgI)} − meta mensal do Total geral ${br(P.meta)}`,c:"#2563eb"});
  if(c3)SC.push({k:3,t:"Economizando nas categorias",pmt:Math.round((save+c3.extra)*100)/100,txt:`${c3.lab} · ${br(c3.extra)} a mais guardados por mês`,c:"#d97706"});
  SC.forEach(s=>{s.sub=esc(s.txt);});
  P.last={SC,p0,rate:a*100,save,lines};
  const H=[...new Set([1,5,10,N].filter(h=>h<=N))].sort((p,q)=>p-q);
  const blk=s=>`<div class="row" style="display:block"><div><b style="color:${s.c}">● ${s.k}. ${esc(s.t)}</b></div><div class="mu">${s.sub}</div>
    ${H.map(h=>{const v=fv(s.pmt,h*12),d=v-fv(SC[0].pmt,h*12);return `<div style="display:flex;justify-content:space-between;gap:8px"><span>Em ${h} ${h===1?"ano":"anos"}</span><span><b class="${v<0?"neg":""}">${br(v)}</b>${s.k>1&&Math.abs(d)>=0.5?` <span class="mu">(${d>0?"+":"−"}${br(Math.abs(d))})</span>`:""}</span></div>`;}).join("")}</div>`;
  /* gráfico: um ponto por ano, de 0 a N */
  const Y=SC.map(s=>Array.from({length:N+1},(_,y)=>fv(s.pmt,y*12))),all=Y.flat().concat([0]),lo=Math.min(...all),hi=Math.max(...all),rg=hi-lo||1;
  const Wd=340,Ht=170,L=4,R=4,T=14,B=18,px=y=>L+(Wd-L-R)*y/N,py=v=>T+(Ht-T-B)*(1-(v-lo)/rg);
  const kf=v=>{const s=Math.abs(v)>=1e6?(v/1e6).toFixed(1).replace(".",",")+" mi":Math.abs(v)>=1e3?Math.round(v/1e3)+" mil":Math.round(v)+"";return "R$ "+s;};
  const svg=`<svg viewBox="0 0 ${Wd} ${Ht}" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="Patrimônio projetado por ano">
    <line x1="${L}" x2="${Wd-R}" y1="${py(0)}" y2="${py(0)}" stroke="currentColor" stroke-opacity=".25"/>
    ${Y.map((ys,j)=>`<polyline fill="none" stroke="${SC[j].c}" stroke-width="2.2" stroke-linejoin="round" points="${ys.map((v,y)=>px(y).toFixed(1)+","+py(v).toFixed(1)).join(" ")}"/>`).join("")}
    <text x="${L}" y="10" font-size="10" fill="currentColor" fill-opacity=".6">${kf(hi)}</text>
    <text x="${L}" y="${Ht-4}" font-size="10" fill="currentColor" fill-opacity=".6">hoje</text>
    <text x="${Wd-R}" y="${Ht-4}" font-size="10" fill="currentColor" fill-opacity=".6" text-anchor="end">${N} ${N===1?"ano":"anos"}</text></svg>`;
  box.innerHTML=`<b>Patrimônio projetado</b>${svg}${SC.map(blk).join("")}
    ${P.meta==null?`<div class="mu">Cenário 2 (dentro da meta): ${P.metaErr?"não consegui ler as metas: "+esc(P.metaErr):"crie uma meta mensal do Total geral (sem categoria) em 🎯 Gerenciar metas."}</div>`:""}
    ${idx.length?c3msg:'<div class="mu">Cenário 3: escolha ao menos uma categoria acima.</div>'}
    <div class="mu" style="margin-top:6px">Estimativa: o rendimento é aplicado ao patrimônio todo, todo mês, e a economia é guardada no fim de cada mês; sem imposto nem taxas. Entre parênteses, a diferença para o cenário 1.${c3?" O gasto médio da categoria conta pela data da compra, nos mesmos meses da média.":""} Os campos ficam salvos só neste aparelho; para guardar a projeção para a família, use “💾 Salvar esta projeção”.</div>`;}

/* ---------- salvar a projeção (congelada) ---------- */
async function pjSaveSnap(){
  const P=PJ,msg=t=>{if($("pjsm"))$("pjsm").textContent=t;};if(!P)return;
  const nm=$("pjnm").value.trim();if(!nm)return msg("Informe um nome para a projeção.");
  $("pjsv").disabled=true;msg("Calculando…");
  await calcProj();const L=P.last;
  if(!L||!$("pjsv")){if($("pjsv"))$("pjsv").disabled=false;return msg("Corrija os campos acima antes de salvar.");}
  const r2=v=>Math.round(v*100)/100,t0=today(),years=[];
  for(let n=1;n<=20;n++){const o={n,date:dAdd(t0,12*n)};L.SC.forEach(s=>{o["s"+s.k]=r2(pjFv(L.p0,L.rate,s.pmt,12*n));});years.push(o);}
  const row={household_id:P.hid,name:nm,base_date:t0,prev_mode:P.pv,base_value:r2(L.p0),monthly_saving:r2(L.save),annual_rate:Math.round(L.rate*10000)/10000,
    scenarios:L.SC.map(s=>({k:s.k,t:s.t,pmt:r2(s.pmt),sub:s.txt})),years,
    params:{avgR:P.avgR,avgI:r2(P.avgI),months:(P.W||[]).map(x=>x.m),meta:P.meta,cm:cm(),lines:L.lines,prev_label:PJ_PV[P.pv]}};
  const {error}=await sb.from("projection_snapshots").insert(row);
  if(!$("pjsv"))return;$("pjsv").disabled=false;
  if(error)return msg("Erro: "+error.message+(/projection_snapshots/.test(error.message)?" (rode o script projecoes_salvas.sql no Supabase)":""));
  msg("Projeção salva ✓ Veja em 📂 Projeções salvas, no topo.");}

/* ---------- PROJEÇÕES SALVAS (rota pjs): previsto × realizado ---------- */
async function viewPjs(){
  const hid=S.hid;$("main").innerHTML='<div class="card mu" id="psw">Carregando as projeções salvas…</div>';try{window.scrollTo(0,0);}catch(e){}
  const [ps,fs]=await Promise.all([sb.from("projection_snapshots").select("*").eq("household_id",hid).order("created_at",{ascending:false}),
    sb.from("patrimony_snapshots").select("month,value_base,prev_own,prev_all,prev_nm,updated_at").eq("household_id",hid).order("month")]);
  if(!$("psw")||S.hid!==hid||S.tab!=="pjs")return;
  const e=ps.error||fs.error;
  if(e){$("psw").className="card";$("psw").innerHTML=`<button class="lk" id="psbk">← Projeção</button><p class="neg">${esc(e.message)}</p><p class="mu">Se a tabela não existe, rode o script projecoes_salvas.sql no Supabase.</p>`;$("psbk").onclick=()=>go("proj");return;}
  PJS={L:ps.data||[],F:(fs.data||[]).map(f=>({m:f.month,base:Number(f.value_base),own:Number(f.prev_own),all:Number(f.prev_all),nm:Number(f.prev_nm)}))};
  drawPjs();}

function drawPjs(){
  const D=PJS;if(!D||!$("psw"))return;
  const br=v=>fmt(Number(v)||0,"BRL"),t0=today(),curM=t0.slice(0,8)+"01",COL={1:"var(--ac)",2:"#2563eb",3:"#d97706"};
  const mb=(a,b)=>{const [y1,m1,d1]=a.split("-").map(Number),[y2,m2,d2]=b.split("-").map(Number);return (y2-y1)*12+(m2-m1)-(d2<d1?1:0);};
  const mi=m=>+m.slice(0,4)*12+ +m.slice(5,7)-1,ph=m=>D.F.find(f=>f.m===m);
  /* patrimônio de hoje: o que o Painel acabou de calcular (S.pjBase) ou, sem ele, a foto deste mês */
  const now=S.pjBase&&S.pjBase.base!=null?S.pjBase:(ph(curM)||null);
  const dif=(r,p)=>{const d=r-p,q=Math.abs(p)>=0.005?d/Math.abs(p)*100:null;
    return `<span class="${d>=0?"pos":"neg"}" style="white-space:nowrap">${d>=0?"✅ +":"⚠️ −"}${br(Math.abs(d))}${q==null?"":" ("+(q>=0?"+":"−")+Math.abs(q).toFixed(1).replace(".",",")+"%)"}</span>`;};
  const kf=v=>{const s=Math.abs(v)>=1e6?(v/1e6).toFixed(1).replace(".",",")+" mi":Math.abs(v)>=1e3?Math.round(v/1e3)+" mil":Math.round(v)+"";return "R$ "+s;};
  const card=(p,ix)=>{
    const SC=p.scenarios||[],Y=p.years||[],rate=Number(p.annual_rate),p0=Number(p.base_value),el=mb(p.base_date,t0),mode=p.prev_mode,lines=(p.params||{}).lines||[];
    const nowR=now?pjVal(now,mode):null,nxt=Y.find(y=>y.date>t0);
    const hoje=`<b style="display:block;margin-top:8px">Hoje · ${Math.max(el,0)} ${el===1?"mês":"meses"} depois</b>`
      +(nowR==null?'<div class="mu">Abra o Painel para ter o patrimônio de hoje.</div>':`<div class="row"><span>Realizado</span><b>${br(nowR)}</b></div>`
        +SC.map(s=>{const v=pjFv(p0,rate,Number(s.pmt),Math.max(el,0));return `<div class="row"><span style="color:${COL[s.k]}">● ${esc(s.t)}: previsto ${br(v)}</span>${el>=1?dif(nowR,v):""}</div>`;}).join("")
        +(el<1?'<div class="mu">Salva neste mês: a comparação começa no próximo mês.</div>':""))
      +(nxt?`<div class="mu" style="margin-top:4px">Próximo alvo: ${fdt(nxt.date)} (${nxt.n} ${nxt.n===1?"ano":"anos"}) · ${SC.map(s=>esc(s.t)+" "+br(nxt["s"+s.k])).join(" · ")}</div>`:"");
    const ys=Y.map(y=>{const past=y.date<=t0,f=past?(y.date.slice(0,8)+"01"===curM&&now?now:ph(y.date.slice(0,8)+"01")):null,r=f?pjVal(f,mode):null;
      return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span><b>${y.date.slice(0,4)}</b> <span class="mu">· ${y.n} ${y.n===1?"ano":"anos"} (${fdt(y.date)})</span></span><span>${past?(r==null?'<span class="mu">sem foto do mês</span>':"realizado <b>"+br(r)+"</b>"):'<span class="mu">ainda não chegou</span>'}</span></div>
        ${SC.map(s=>`<div class="mu" style="display:flex;justify-content:space-between;gap:8px"><span style="color:${COL[s.k]}">● ${esc(s.t)}</span><span>${br(y["s"+s.k])}${r!=null?" · "+dif(r,y["s"+s.k]):""}</span></div>`).join("")}</div>`;}).join("");
    /* gráfico: cenários (pontos anuais salvos) e pontos do realizado (fotos mensais desde a data da projeção) */
    const XM=Y.length?Y[Y.length-1].n*12:240,b0=mi(p.base_date.slice(0,8)+"01");
    const RP=D.F.map(f=>({x:mi(f.m)-b0,v:f.m===curM&&now?nowR:pjVal(f,mode)})).filter(q=>q.x>=0&&q.x<=XM);
    if(now&&!ph(curM)&&mi(curM)-b0>=0)RP.push({x:mi(curM)-b0,v:nowR});
    const LS=SC.map(s=>[{x:0,v:p0}].concat(Y.map(y=>({x:y.n*12,v:Number(y["s"+s.k])})))),all=LS.flat().map(q=>q.v).concat(RP.map(q=>q.v),[0]);
    const lo=Math.min(...all),hi=Math.max(...all),rg=hi-lo||1,Wd=340,Ht=170,Lp=4,Rp=4,T=14,B=18,px=x=>Lp+(Wd-Lp-Rp)*x/XM,py=v=>T+(Ht-T-B)*(1-(v-lo)/rg);
    const svg=`<svg viewBox="0 0 ${Wd} ${Ht}" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="Projeção salva e patrimônio realizado">
      <line x1="${Lp}" x2="${Wd-Rp}" y1="${py(0)}" y2="${py(0)}" stroke="currentColor" stroke-opacity=".25"/>
      ${LS.map((L,j)=>`<polyline fill="none" stroke="${COL[SC[j].k]}" stroke-width="2" stroke-linejoin="round" points="${L.map(q=>px(q.x).toFixed(1)+","+py(q.v).toFixed(1)).join(" ")}"/>`).join("")}
      ${RP.map(q=>`<circle cx="${px(q.x).toFixed(1)}" cy="${py(q.v).toFixed(1)}" r="3" fill="currentColor"/>`).join("")}
      <text x="${Lp}" y="10" font-size="10" fill="currentColor" fill-opacity=".6">${kf(hi)}</text>
      <text x="${Lp}" y="${Ht-4}" font-size="10" fill="currentColor" fill-opacity=".6">${fdt(p.base_date)}</text>
      <text x="${Wd-Rp}" y="${Ht-4}" font-size="10" fill="currentColor" fill-opacity=".6" text-anchor="end">${Y.length?fdt(Y[Y.length-1].date):""}</text></svg>
      <div class="mu">Linhas: cenários salvos · pontos: patrimônio real (fotos mensais)</div>`;
    return `<div class="card"><details ${ix===0?"open":""}><summary><b>${esc(p.name)}</b> <span class="mu">· salva em ${fdt(p.base_date)}</span></summary>
      <div class="mu">${esc(PJ_PV[mode]||mode)} · partida ${br(p0)} · economia ${br(p.monthly_saving)} por mês · rendimento ${String(rate).replace(".",",")}% ao ano${lines.length?" · categorias: "+esc(lines.map(l=>l.name+" "+String(l.pct).replace(".",",")+"%").join(", ")):""}</div>
      ${svg}${hoje}
      <details style="margin-top:8px"><summary><b>Alvos ano a ano (${Y.length})</b></summary>${ys}<div class="mu">Realizado = foto do patrimônio do mês do alvo, com a mesma forma de previdência e FGTS da projeção.</div></details>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="x" data-prn="${p.id}">✏️ Renomear</button><button class="x" data-pdl="${p.id}">✕ Excluir</button></div></details></div>`;};
  const nF=D.F.length;
  $("main").innerHTML=`<div class="card" id="psw"><button class="lk" id="psbk">← Projeção</button> <b>📂 Projeções salvas</b>
    <div class="mu">Fotos do patrimônio real: ${nF} ${nF===1?"mês":"meses"}${nF?" (desde "+pjMl(D.F[0].m)+")":""}. A foto do mês é gravada quando alguém abre o Painel; vale a última abertura do mês. Cada projeção é comparada com a mesma forma de previdência e FGTS com que foi salva.</div><p id="psm" class="neg"></p></div>
    ${D.L.length?D.L.map(card).join(""):'<div class="card mu">Nenhuma projeção salva ainda. Na Projeção, use “💾 Salvar esta projeção”.</div>'}`;
  $("psbk").onclick=()=>go("proj");
  document.querySelectorAll("[data-prn]").forEach(b=>b.onclick=async()=>{const p=D.L.find(x=>x.id===b.dataset.prn),nm=(window.prompt("Novo nome da projeção:",p.name)||"").trim();
    if(!nm||nm===p.name)return;const {error}=await sb.from("projection_snapshots").update({name:nm.slice(0,80)}).eq("id",p.id);
    if(error)return $("psm").textContent="Erro: "+error.message;viewPjs();});
  document.querySelectorAll("[data-pdl]").forEach(b=>b.onclick=async()=>{const p=D.L.find(x=>x.id===b.dataset.pdl);
    if(!confirm(`Excluir a projeção "${p.name}"? Isso não pode ser desfeito.`))return;
    const {data,error}=await sb.from("projection_snapshots").delete().eq("id",p.id).select("id");
    if(error)return $("psm").textContent="Erro: "+error.message;if(!data||!data.length)return $("psm").textContent="Não consegui excluir (talvez já tenha sido excluída).";viewPjs();});}
