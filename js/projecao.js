/* ================= PROJEÇÃO DE PATRIMÔNIO (aberta pelo botão 📈 do Painel) =================
   Ponto de partida: Saldo geral do Painel (S.pjBase, gravado pelo Painel ao abrir esta tela).
   Economia por mês: média do Resultado (period_summary) dos últimos 12 meses fechados que têm lançamentos; editável.
   Cenários: 1 como está hoje; 2 dentro da meta (receita média − meta mensal do Total geral); 3 economizando X% a mais na categoria Y.
   Conta: juros compostos mensais sobre o patrimônio todo + economia no fim de cada mês. Nada é gravado no banco (preferências no aparelho). */
let PJ=null,PJT=null;
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
  const hid=S.hid,base=S.pjBase||{geral:0,lab:""};
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
  PJ={hid,base,curM,M,MS,meta:tot?Number(tot.budget_amount):null,metaErr:bp.error?bp.error.message:null,cs:{}};
  drawProj();}

function drawProj(){
  const P=PJ;if(!P||!$("pjw"))return;
  const br=v=>fmt(v,"BRL"),ml=m=>new Date(m+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).replace(".","");
  const W=P.MS.filter(x=>Math.abs(x.inc)>=0.005||Math.abs(x.exp)>=0.005),n=W.length;
  P.W=W;P.avgR=n?Math.round(W.reduce((t,x)=>t+x.inc+x.exp,0)/n*100)/100:0;P.avgI=n?W.reduce((t,x)=>t+x.inc,0)/n:0;
  const g=(k,d)=>{const v=lsGet(k);return v==null||v===""?d:v;};
  const sv=lsGet("pjs");
  $("main").innerHTML=`<div class="card" id="pjw"><button class="lk" id="pjbk">← Painel</button> <b>📈 Projeção de patrimônio</b>
    <div class="row"><span>Patrimônio hoje<span class="mu" style="display:block">Saldo geral do Painel${P.base.lab?" ("+esc(P.base.lab)+")":""}</span></span><b class="${P.base.geral<0?"neg":"pos"}">${br(P.base.geral)}</b></div>
    <label>Economia por mês (R$; negativo se gasta mais do que recebe)<input id="pjs" inputmode="decimal" value="${fa(sv==null||sv===""?P.avgR:Number(sv))}"></label>
    <div class="mu">${n?`Média do Resultado de ${n} ${n===1?"mês":"meses"} com lançamentos (${ml(W[0].m)} a ${ml(W[n-1].m)}): <b>${br(P.avgR)}</b>`:"Nenhum mês fechado com lançamentos nos últimos 12: informe a economia por mês."}${n?' · <button class="lk" id="pjavg">usar a média</button>':""}</div>
    ${n?`<details><summary class="mu">Ver mês a mês</summary>${P.MS.map(x=>`<div class="row"><span>${ml(x.m)}${W.includes(x)?"":' <span class="mu">(sem lançamentos, fora da média)</span>'}</span><span class="mu">${br(x.inc)} ${br(x.exp)} = <b class="${x.inc+x.exp<0?"neg":"pos"}">${br(x.inc+x.exp)}</b></span></div>`).join("")}<div class="mu">Receitas, despesas e Resultado de cada mês, pelas regras do Resultado do Painel (contas corrente, dinheiro, cartão e vale; sem transferências; cartão ${cm()==="stm"?"pela fatura":"pela compra"}).</div></details>`:""}
    <div style="display:flex;gap:8px"><label style="flex:1">Rendimento ao ano (%)<input id="pjr" inputmode="decimal" value="${esc(g("pjr","5"))}"></label><label style="flex:1">Anos<input id="pjn" type="number" min="1" max="60" inputmode="numeric" value="${esc(g("pjn","20"))}"></label></div>
    <div class="mu">Use um rendimento acima da inflação (ex.: 5%) para ver os valores em dinheiro de hoje.</div>
    <div style="margin-top:10px"><b>Cenário 3: economizar nas categorias</b><div class="mu">Escolha as categorias e quanto % a menos gastaria em cada uma.</div></div>
    <div id="pjcl"></div><button class="lk" id="pjadd">+ Adicionar categoria</button><div id="pjct"></div>
    </div><div class="card" id="pjres"></div>`;
  $("pjbk").onclick=()=>go("dash");
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
  if(!(a>-1)||a>1){box.innerHTML='<p class="neg">Informe um rendimento entre −100% e 100% ao ano.</p>';return;}
  const i=Math.pow(1+a,1/12)-1,fv=(pmt,m)=>Math.abs(i)<1e-12?P.base.geral+pmt*m:P.base.geral*Math.pow(1+i,m)+pmt*(Math.pow(1+i,m)-1)/i;
  /* cenário 3: soma o valor por mês de cada linha; categoria repetida, ou subcategoria de outra linha, não entra (contaria duas vezes) */
  const my=P.tk=(P.tk||0)+1,LN=pjLs(),idx=LN.map((l,j)=>j).filter(j=>LN[j].c);
  const rs=await Promise.all(idx.map(j=>pjCatAvg(LN[j].c)));
  if(!$("pjres")||my!==P.tk)return;
  const up=c=>{const o=[];for(let z=(S.catsAll.find(y=>y.id===c)||{}).parent_id,k=0;z&&k<20;k++){o.push(z);z=(S.catsAll.find(y=>y.id===z)||{}).parent_id;}return o;};
  let c3=null,c3msg="",sumX=0,sumAvg=0;const parts=[];
  idx.forEach((j,q)=>{const l=LN[j],r=rs[q],el=$("pjv"+j),pc=num(l.x);
    const dup=idx.slice(0,q).some(k=>LN[k].c===l.c),anc=up(l.c).find(a=>idx.some(k=>k!==j&&LN[k].c===a));
    let t;
    if(r.error)t=`<span class="neg">${esc(r.error)}</span>`;
    else if(!(pc>=0&&pc<=100))t='<span class="neg">Informe um % entre 0 e 100.</span>';
    else{const v=Math.round(r.v*pc)/100;
      t=`gasto médio ${br(r.v)} por mês · ${String(pc).replace(".",",")}% = <b>${br(v)} por mês</b>`;
      if(dup)t+=' · <span class="neg">⚠️ categoria repetida: não entra no total</span>';
      else if(anc)t+=` · <span class="neg">⚠️ já está dentro de ${esc(catName(anc))}: não entra no total</span>`;
      else{sumX+=v;sumAvg+=r.v;parts.push(`${catName(l.c)} ${String(pc).replace(".",",")}%`);}}
    if(el)el.innerHTML=t;});
  if(rs.some(r=>r.error))c3msg='<p class="neg">Não consegui ler o gasto de alguma categoria.</p>';
  const avgE=P.W.length?P.W.reduce((t,x)=>t-x.exp,0)/P.W.length:0;sumX=Math.round(sumX*100)/100;
  if($("pjct"))$("pjct").innerHTML=parts.length?`<div class="row" style="border-top:2px solid var(--ac)"><span>Total economizado por mês<span class="mu" style="display:block">${sumAvg>0?(sumX/sumAvg*100).toFixed(1).replace(".",",")+"% do gasto dessas categorias":""}${avgE>0?(sumAvg>0?" · ":"")+(sumX/avgE*100).toFixed(1).replace(".",",")+"% das despesas médias do mês ("+br(avgE)+")":""}</span></span><b>${br(sumX)}</b></div>`:"";
  if(parts.length)c3={extra:sumX,lab:parts.join(", ")};
  const SC=[{k:1,t:"Como está hoje",pmt:save,sub:`guardando ${br(save)} por mês`,c:"var(--ac)"}];
  if(P.meta!=null&&P.W.length)SC.push({k:2,t:"Dentro da meta",pmt:Math.round((P.avgI-P.meta)*100)/100,sub:`receita média ${br(P.avgI)} − meta mensal do Total geral ${br(P.meta)}`,c:"#2563eb"});
  if(c3)SC.push({k:3,t:"Economizando nas categorias",pmt:save+c3.extra,sub:`${esc(c3.lab)} · ${br(c3.extra)} a mais guardados por mês`,c:"#d97706"});
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
    <div class="mu" style="margin-top:6px">Estimativa: o rendimento é aplicado ao patrimônio todo, todo mês, e a economia é guardada no fim de cada mês; sem imposto nem taxas. Entre parênteses, a diferença para o cenário 1.${c3?" O gasto médio da categoria conta pela data da compra, nos mesmos meses da média.":""} Nada é gravado: os campos ficam salvos só neste aparelho.</div>`;}
