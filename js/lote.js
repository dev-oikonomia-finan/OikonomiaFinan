/* ================= LANÇAR EM LOTE (Etapa 1: conta corrente e cartão) ================= */
/* Várias linhas por seção; cada seção tem UMA conta. Linha vazia é ignorada. Confirmar valida tudo e grava
   num ÚNICO insert em transactions (parcelas geradas aqui, como a compra em andamento): grava tudo ou nada. */
const LOTE_CSS=`<style>
.lbox{container-type:inline-size}
.lr{display:grid;grid-template-columns:1fr 1fr;gap:4px 6px;padding:8px 0;border-bottom:1px solid var(--bd)}
.lr input,.lr select{margin:0;width:100%;box-sizing:border-box;min-width:0}
.lr .ld{order:1}.lr .lv{order:2}.lr .lds{order:3}.lr .lc{order:4}.lr .lp{order:5}.lr .lh{order:6}.lr .lm{order:9;grid-column:1/-1}
.lr.err{background:rgba(220,38,38,.08)}
.lhd{display:none}
/* colunas pela largura do QUADRO (container query), não da janela: se não couber, fica o layout de duas linhas */
@container (min-width:620px){
 .lr.cc,.lhd.cc{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px}
 .lhd.cc{display:grid}.lr.cc .ld{order:1}.lr.cc .lds{order:2}.lr.cc .lc{order:3}.lr.cc .lv{order:4}}
@container (min-width:700px){
 .lr.cd,.lhd.cd{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px 64px}
 .lhd.cd{display:grid}.lr.cd .ld{order:1}.lr.cd .lds{order:2}.lr.cd .lc{order:3}.lr.cd .lv{order:4}.lr.cd .lp{order:5}}
@container (min-width:840px){
 .lr.cdh,.lhd.cdh{grid-template-columns:140px minmax(140px,3fr) minmax(130px,2fr) 110px 64px minmax(110px,1fr)}
 .lhd.cdh{display:grid}.lr.cdh .ld{order:1}.lr.cdh .lds{order:2}.lr.cdh .lc{order:3}.lr.cdh .lv{order:4}.lr.cdh .lp{order:5}.lr.cdh .lh{order:6}}
.lhd{gap:4px 6px;font-size:.8rem}
</style>`;
/* tela larga só no lote: o nucleo liga body.lote-wide ao entrar em "lote" e desliga ao sair */
document.head.insertAdjacentHTML("beforeend",`<style>
body.lote-wide,body.lote-wide #app,body.lote-wide main,body.lote-wide #main,body.lote-wide .wrap{max-width:none!important}
body.lote-wide main,body.lote-wide #main{width:auto!important}
</style>`);
const loteCats=()=>'<option value="">Categoria</option><optgroup label="Despesas">'+catOpts("expense")+'</optgroup><optgroup label="Receitas">'+catOpts("income")+'</optgroup>';
const loteOk=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&+d.slice(0,4)>=1900&&+d.slice(0,4)<=2100;
function viewLote(msg){
  const CC=S.accounts.filter(a=>a.type==="checking"||a.type==="cash"),CD=S.accounts.filter(a=>a.type==="credit_card");
  if(!S.loteSecs){S.loteSecs=[];if(CC.length)S.loteSecs.push({t:"cc",acc:S.lastAcc&&CC.some(a=>a.id===S.lastAcc)?S.lastAcc:CC[0].id});if(CD.length)S.loteSecs.push({t:"cd",acc:CD[0].id});}
  S.loteSecs=S.loteSecs.filter(x=>!x.gone&&(x.t==="cc"?CC:CD).some(a=>a.id===x.acc));
  $("main").innerHTML=LOTE_CSS+`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Lançar em lote</b>
    <p class="mu" style="margin:6px 0">Digite várias linhas e grave tudo de uma vez. Linha vazia é ignorada. A categoria define se é despesa ou receita. No cartão, cada compra cai na fatura pela data (como em Lançar); parcelas: informe o total e o nº de parcelas.</p>
    <datalist id="lqs">${S.qs.map(q=>`<option value="${esc(q.name)}">`).join("")}</datalist></div>
   <div id="lsecs"></div>
   <div class="card">${CC.length?'<button class="sec" id="lacc" style="margin-top:0">＋ Outra conta corrente</button>':""}${CD.length?'<button class="sec" id="lacd">＋ Outro cartão</button>':""}
    <button class="pri" id="lgo">Confirmar e gravar</button><p id="ltm" class="${msg?"pos":"neg"}">${esc(msg||"")}</p></div>`;
  $("bk").onclick=()=>go("add");
  S.loteSecs.forEach((x,i)=>loteSec(i));
  if($("lacc"))$("lacc").onclick=()=>{S.loteSecs.push({t:"cc",acc:CC[0].id});loteSec(S.loteSecs.length-1);};
  if($("lacd"))$("lacd").onclick=()=>{S.loteSecs.push({t:"cd",acc:CD[0].id});loteSec(S.loteSecs.length-1);};
  $("lgo").onclick=loteSave;
}
function loteSec(i){
  const x=S.loteSecs[i],card=x.t==="cd",L=S.accounts.filter(a=>card?a.type==="credit_card":(a.type==="checking"||a.type==="cash"));
  const el=document.createElement("div");el.className="card";el.dataset.sec=i;
  el.innerHTML=`<div class="row" style="border:0;padding:0"><b>${card?"💳 Cartão":"🏦 Conta corrente ou dinheiro"}</b><button class="x" data-lx="${i}" title="Tirar esta seção">✕</button></div>
    <label>${card?"Cartão":"Conta"}<select class="lsa">${L.map(a=>`<option value="${a.id}" ${a.id===x.acc?"selected":""}>${esc(a.name)} (${a.currency.trim()})</option>`).join("")}</select></label>
    <div class="lbox"><div class="lhd"></div><div class="lrows"></div></div>
    <button class="lk lad">＋ linha</button><p class="mu lst"></p>`;
  $("lsecs").appendChild(el);
  const kind=()=>{const H=holdersOf(x.acc);return card?(H.length>1?"cdh":"cd"):"cc";};
  const head=()=>{const k=kind(),h=el.querySelector(".lhd");h.className="lhd "+k;
    h.innerHTML='<span class="mu">Data</span><span class="mu">Descrição</span><span class="mu">Categoria</span><span class="mu">Valor</span>'+(card?'<span class="mu">Parcelas</span>':"")+(k==="cdh"?'<span class="mu">Portador</span>':"");};
  const addRow=d=>{const k=kind(),H=holdersOf(x.acc),r=document.createElement("div");r.className="lr "+k;
    let sv=null;try{sv=localStorage.getItem("hold_"+x.acc)}catch(e){}
    r.innerHTML=`<input type="date" class="ld" value="${d||""}"><input class="lv" inputmode="decimal" placeholder="Valor"><input class="lds" placeholder="Descrição" list="lqs" autocomplete="off"><select class="lc">${loteCats()}</select>`
      +(card?'<input class="lp" type="number" min="1" max="48" inputmode="numeric" placeholder="Parc.">':"")
      +(k==="cdh"?`<select class="lh">${H.map(h=>`<option value="${h.id}" ${h.id===sv?"selected":""}>${esc(h.name)}</option>`).join("")}</select>`:"")
      +'<div class="mu lm"></div>';
    el.querySelector(".lrows").appendChild(r);
    r.querySelectorAll("input,select").forEach(f=>f.addEventListener("input",()=>onEdit(r)));
    r.querySelector(".lc").addEventListener("change",()=>onEdit(r));
    r.querySelector(".lds").addEventListener("change",()=>{const q=S.qs.find(z=>z.name.trim().toLowerCase()===r.querySelector(".lds").value.trim().toLowerCase());
      if(!q)return;const c=r.querySelector(".lc");if(!c.value&&q.category_id&&[...c.options].some(o=>o.value===q.category_id))c.value=q.category_id;
      const v=r.querySelector(".lv");if(!v.value.trim()&&q.default_amount)v.value=fa(q.default_amount);onEdit(r);});};
  const rows=()=>[...el.querySelectorAll(".lr")];
  const filled=r=>!!(r.querySelector(".lv").value.trim()||r.querySelector(".lds").value.trim()||r.querySelector(".lc").value);
  const onEdit=r=>{r.classList.remove("err");const R=rows();if(r===R[R.length-1]&&filled(r))addRow(r.querySelector(".ld").value);info(r);tot();};
  const info=r=>{const m=r.querySelector(".lm");if(r.classList.contains("err"))return;m.textContent="";if(!card||!filled(r))return;
    const cc=S.cards.find(c=>c.account_id===x.acc),d=r.querySelector(".ld").value,n=parseInt(r.querySelector(".lp").value)||1,v=num(r.querySelector(".lv").value||"");
    const t=[];if(cc&&loteOk(d))t.push("fatura "+mlab(stm(cc,d)));if(n>=2&&v>0)t.push(`${n}x de aprox. ${fmt(v/n,"BRL")}`);m.textContent=t.join(" · ");};
  const tot=()=>{const cur=(S.accounts.find(a=>a.id===x.acc)||{currency:"BRL"}).currency.trim();let e=0,inc=0,n=0;const F={};
    const cc=card&&S.cards.find(c=>c.account_id===x.acc);
    rows().filter(filled).forEach(r=>{const v=num(r.querySelector(".lv").value||""),c=catById(r.querySelector(".lc").value);if(!(v>0))return;n++;
      if(c&&c.kind==="income")inc+=v;else e+=v;
      if(cc){const d=r.querySelector(".ld").value,np=parseInt(r.querySelector(".lp").value)||1;if(loteOk(d)){const sg=c&&c.kind==="income"?-1:1;
        if(np>=2){const vv=Math.round(v/np*100)/100;for(let k=0;k<np;k++){const m=stm(cc,dAdd(d,k)),pv=k<np-1?vv:Math.round((v-vv*(np-1))*100)/100;F[m]=(F[m]||0)+sg*pv;}}
        else{const m=stm(cc,d);F[m]=(F[m]||0)+sg*v;}}}});
    el.querySelector(".lst").textContent=n?`${n} linha(s) · ${card?"compras":"despesas"} ${fmt(e,cur)}${inc?" · "+(card?"estornos":"receitas")+" "+fmt(inc,cur):""}`
      +(Object.keys(F).length?" · por fatura: "+Object.keys(F).sort().map(m=>mlab(m).replace(" de "," ")+" "+fmt(F[m],cur)).join(" · "):""):"";};
  el.querySelector(".lsa").onchange=()=>{x.acc=el.querySelector(".lsa").value;head();
    /* troca de conta: refaz as linhas (o portador depende do cartão), mantendo o que foi digitado */
    const keep=rows().map(r=>({d:r.querySelector(".ld").value,v:r.querySelector(".lv").value,s:r.querySelector(".lds").value,c:r.querySelector(".lc").value,p:r.querySelector(".lp")?r.querySelector(".lp").value:""}));
    el.querySelector(".lrows").innerHTML="";keep.forEach(k=>{addRow(k.d);const r=rows().pop();r.querySelector(".lv").value=k.v;r.querySelector(".lds").value=k.s;r.querySelector(".lc").value=k.c;if(r.querySelector(".lp"))r.querySelector(".lp").value=k.p;info(r);});
    if(!keep.length||filled(rows().pop()))addRow("");tot();};
  el.querySelector(".lad").onclick=()=>{const R=rows();addRow(R.length?R[R.length-1].querySelector(".ld").value:"");};
  el.querySelector("[data-lx]").onclick=()=>{if(rows().some(filled)&&!confirm("Tirar esta seção? As linhas digitadas nela serão descartadas."))return;x.gone=true;el.remove();};
  head();for(let k=0;k<3;k++)addRow("");
}
async function loteSave(){
  const say=(t,ok)=>{$("ltm").className=ok?"pos":"neg";$("ltm").textContent=t;};
  const out=[],bad=[];let nL=0;
  document.querySelectorAll("#lsecs [data-sec]").forEach(el=>{const x=S.loteSecs[+el.dataset.sec];if(!x||x.gone)return;
    const acc=S.accounts.find(a=>a.id===x.acc),card=x.t==="cd",H=holdersOf(x.acc);
    el.querySelectorAll(".lr").forEach(r=>{r.classList.remove("err");
      const g=c=>r.querySelector(c),v=num(g(".lv").value||""),d=g(".ld").value,desc=g(".lds").value.trim()||null,cid=g(".lc").value,c=catById(cid),np=g(".lp")?(g(".lp").value.trim()?parseInt(g(".lp").value):1):1;
      if(!(g(".lv").value.trim()||desc||cid))return;
      const e=[];
      if(!loteOk(d))e.push("data");
      if(!(v>0)||Math.round(v*100)/100!==v)e.push("valor (maior que zero, até 2 casas)");
      if(!c&&S.cats.length)e.push("categoria");
      if(!(np>=1&&np<=48))e.push("parcelas de 1 a 48");
      if(np>=2&&c&&c.kind==="income")e.push("parcelas só em despesa");
      if(np>=2&&acc.currency.trim()!=="BRL")e.push("parcelas só em conta em reais");
      if(e.length){r.classList.add("err");g(".lm").textContent="Corrija: "+e.join(", ")+".";bad.push(r);return;}
      const sg=c&&c.kind==="income"?1:-1,hv=H.length>1?(g(".lh")?g(".lh").value:null):(H[0]?H[0].id:null);
      const base={account_id:x.acc,category_id:cid||null,description:desc,card_holder_id:card?hv:null};
      nL++;
      if(np>=2){const gid=uid4(),vv=Math.round(v/np*100)/100;
        for(let k=1;k<=np;k++){const dk=dAdd(d,k-1),pv=k<np?vv:Math.round((v-vv*(np-1))*100)/100;
          out.push({...base,date:dk,amount:-pv,status:dk>today()?"planned":"posted",installment_group_id:gid,installment_number:k,installment_total:np});}}
      else out.push({...base,date:d,amount:sg*v,status:d>today()?"planned":"posted"});
      if(card&&H.length>1&&hv){try{localStorage.setItem("hold_"+x.acc,hv)}catch(e){}}});});
  if(bad.length){bad[0].scrollIntoView({block:"center"});return say(`${bad.length} linha(s) com erro (em vermelho). Nada foi gravado.`);}
  if(!out.length)return say("Nenhuma linha preenchida.");
  if(!confirm(`Gravar ${nL} lançamento(s)${out.length>nL?` (${out.length} linhas no banco, contando as parcelas)`:""}?`))return;
  $("lgo").disabled=true;
  const {error}=await sb.from("transactions").insert(out);
  if(error){$("lgo").disabled=false;return say("Nada foi gravado. Erro do banco: "+error.message);}
  viewLote(`${nL} lançamento(s) gravado(s) ✓`);
}
