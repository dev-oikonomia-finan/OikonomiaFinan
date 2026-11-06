function viewAdd(){
  if(!S.accounts.length){$("main").innerHTML='<div class="card">Cadastre uma conta primeiro, na aba <b>Contas</b>.</div>';return;}
  const P=S.pre||{};
  const cats=S.cats.filter(c=>c.kind===S.kind);
  const badCat=!!P.cat&&!cats.some(c=>c.id===P.cat);
  const qs=S.qs.filter(q=>q.kind===S.kind);
  const accSel=P.acc||S.lastAcc;
  $("main").innerHTML=`<div class="card">
   <div class="seg"><button data-k="expense" class="${S.kind==="expense"?"on":""}">Despesa</button><button data-k="income" class="${S.kind==="income"?"on":""}">Receita</button><button data-k="tr">Transferência</button></div>
   ${qs.length?`<div class="chips">${qs.map(q=>`<button data-q="${q.id}" class="${P.qid===q.id?"on":""}">${q.is_favorite?"⭐ ":""}${esc(q.name)}</button>`).join("")}</div>`:""}
   <button class="lk" id="mq">⚙ Gerenciar atalhos</button> <button class="lk" id="mlt">📋 Lançar em lote</button>
   <label><span id="vt">Valor</span><input id="v" inputmode="decimal" placeholder="0,00" value="${fa(P.amt)}"></label>
   <div id="fxw" hidden></div><p id="fxi" class="mu"></p>
   ${S.kind==="expense"?`<label class="ck" id="pcl"><input type="checkbox" id="pc"> Compra parcelada</label>
   <div id="pcw" hidden><label>Nº de parcelas<input id="pn" type="number" min="2" max="48" value="2"></label>
   <label>Parcela atual (1 = compra nova; maior que 1 = compra em andamento)<input id="pa" type="number" min="1" max="48" value="1"></label>
   <label id="pbw" hidden>Gerar também as anteriores, a partir da nº (vazio = não gerar)<input id="pbn" type="number" min="1" max="47" placeholder="ex.: 8"></label>
   <p id="pv" class="mu"></p></div>`:""}
   <label>Categoria<select id="cat">${badCat?'<option value="" selected>Escolha a categoria</option>':""}${catOpts(S.kind,badCat?null:P.cat)}</select></label>
   <label>Conta / cartão<select id="acc">${S.accounts.map(a=>`<option value="${a.id}" ${a.id===accSel?"selected":""}>${esc(a.name)} (${a.currency.trim()})</option>`).join("")}</select></label>
   <label id="hw" hidden>Portador<select id="hd"></select></label><label id="ww" hidden>Carteira<select id="wl"></select></label><p id="wm" class="mu"></p><div id="pin"></div>
   <label>Descrição<input id="desc" value="${esc(P.desc||"")}"></label>
   <label>Data<input id="dt" type="date" value="${esc(P.dt||today())}"></label><p id="fh" class="mu"></p>${(S.trips||[]).length?`
   <label>Viagem ou passeio (opcional)<select id="tp">${tripOpts(P.trip!==undefined?P.trip:tripDefault(P.dt||today()))}</select></label><p id="tpn" class="mu"></p>`:""}
   ${P.qid?"":'<label class="ck"><input type="checkbox" id="fl"> ⭐ Salvar também como atalho</label>'}
   ${S.kind==="expense"?'<div id="bgw"></div>':""}
   <button class="pri" id="save">Salvar</button><p id="msg" class="mu"></p></div>`;
  document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{
    if(b.dataset.k==="tr"){S.tr=null;S.trFrom="add";return go("tr");}
    S.kind=b.dataset.k;S.pre=null;viewAdd();});
  $("mq").onclick=()=>go("qs");$("mlt").onclick=()=>go("lote");
  const pv=()=>{if(!$("pc"))return;const on=$("pc").checked;$("pcw").hidden=!on;
    const n=parseInt($("pn").value),pa=parseInt($("pa").value)||1,run=on&&n>=2&&pa>1&&pa<=n;
    $("pbw").hidden=!run;$("vt").textContent=on?(run?"Valor da parcela":"Valor total"):"Valor";
    const v=num($("v").value),c=S.accounts.find(a=>a.id===$("acc").value).currency.trim();let t="";
    if(on&&n>=2&&v>0){
      if(run){const pb=parseInt($("pbn").value),from=pb>=1&&pb<pa?pb:pa;
        t=`Total da compra: ${fmt(Math.round(v*n*100)/100,c)} (${n}x de ${fmt(v,c)}). Gera as parcelas ${from} a ${n}; a ${pa}ª fica na data informada.`;}
      else t=`${n}x de aprox. ${fmt(v/n,c)} (1ª parcela na data informada)`;}
    $("pv").textContent=t;};
  ["pc","pn","pa","pbn","v","acc"].forEach(i=>{if($(i)){$(i).oninput=pv;$(i).onchange=i==="acc"?$(i).onchange:pv;}});
  document.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{
    const q=S.qs.find(x=>x.id===b.dataset.q);
    if(P.qid===q.id){
      const d=$("desc").value;
      S.pre={cat:$("cat").value,acc:$("acc").value,amt:$("v").value,desc:d.trim()===q.name?"":d,dt:$("dt").value,wal:$("wl").value,trip:$("tp")?$("tp").value:undefined};
      viewAdd();$("desc").focus();return;}
    const ok=id=>S.accounts.some(a=>a.id===id)?id:null;
    S.pre={qid:q.id,cat:q.category_id,acc:ok(q.default_account_id)||S.lastAcc,desc:q.name,amt:q.default_amount,trip:$("tp")?$("tp").value:undefined};
    viewAdd();$("v").focus();});
  const fh=()=>{const c=S.cards.find(x=>x.account_id===$("acc").value),d=$("dt").value;$("fh").textContent=c&&d?"Entra na fatura de "+mlab(stm(c,d)):"";};
  $("dt").oninput=fh;fh();
  if($("tp"))tripWire($("dt"),$("tp"),$("tpn"),P.trip!==undefined);
  const hd=()=>{const L=holdersOf($("acc").value);$("hw").hidden=L.length<2;let sv=null;try{sv=localStorage.getItem("hold_"+$("acc").value)}catch(e){}
    $("hd").innerHTML=L.map(h=>`<option value="${h.id}" ${h.id===sv?"selected":""}>${esc(h.name)}</option>`).join("");};hd();
  const wv=()=>{const a=S.accounts.find(x=>x.id===$("acc").value);
    if(!a||a.type!=="benefit"){$("wm").textContent="";return;}
    if(!$("wl").value){$("wm").textContent="Nenhuma carteira nesta conta. Crie em Contas > ⚙ da conta.";return;}
    const bal=S.wbal[$("wl").value]||0,val=num($("v").value);
    $("wm").textContent=S.kind==="expense"&&val>bal?`⚠️ Saldo da carteira: ${fmt(bal,a.currency)}. Esta compra é maior (faltam ${fmt(val-bal,a.currency)}). Você pode salvar mesmo assim.`:"";};
  const wl=()=>{const a=S.accounts.find(x=>x.id===$("acc").value),ben=!!a&&a.type==="benefit";
    $("ww").hidden=!ben;const fo=!!a&&a.currency.trim()!=="BRL";if($("pcl")){$("pcl").hidden=ben||fo;if((ben||fo)&&$("pc").checked){$("pc").checked=false;pv();}}
    if(!ben){$("wm").textContent="";return;}
    const L=walletsOf(a.id),cur=$("wl").value||P.wal||lsGet("wal_"+a.id)||"";
    $("wl").innerHTML=L.length?L.map(w=>`<option value="${w.id}" ${w.id===cur?"selected":""}>${esc(w.name)} · ${fmt(S.wbal[w.id]||0,a.currency)}</option>`).join(""):'<option value="">(sem carteiras)</option>';
    wv();};
  const fxh=()=>{const a=S.accounts.find(x=>x.id===$("acc").value),p=$("fxi");if(!p)return;
    const c=a?a.currency.trim():"BRL";if(c==="BRL"){p.textContent="";return;}
    const I=S.intl[a.id];if(!I){p.textContent="Carregando custo médio…";return;}
    const v=num($("v").value)||0;
    if(S.kind==="expense")p.textContent=v>I.qty+1e-9?`⚠️ Saldo: ${fmt(I.qty,c)}. Esta despesa é maior e o banco vai recusar. Lance antes a conversão.`:`Saldo ${fmt(I.qty,c)} · custo médio ${I.avg?fx4(I.avg):"—"} por 1 ${c}${v>0&&I.avg?` · esta despesa ≈ ${fmt(v*I.avg,"BRL")}`:""}`;
    else p.textContent=I.qty>0?`Custo médio atual: ${fx4(I.avg)} por 1 ${c}`:"Sem saldo nesta conta: informe a taxa.";};
  const fx=()=>{const a=S.accounts.find(x=>x.id===$("acc").value),w=$("fxw"),c=a?a.currency.trim():"BRL";
    if(c==="BRL"){w.hidden=true;w.innerHTML="";w.dataset.a="";fxh();return;}
    w.hidden=false;
    if(w.dataset.a!==a.id){w.dataset.a=a.id;
      w.innerHTML=S.kind==="expense"?`<label>Valor original, se a compra foi em outra moeda (opcional)<div class="seg"><input id="oa" inputmode="decimal" placeholder="0,00"><input id="oc" maxlength="3" placeholder="EUR" style="max-width:90px;text-transform:uppercase"></div></label>`
        :`<label>Taxa em R$ por 1 ${esc(c)} (opcional)<input id="fi" inputmode="decimal" placeholder="vazio = custo médio atual"></label><div class="mu">Dinheiro que veio de uma conversão deve ser lançado em Transferir. Aqui é só para reembolso ou receita em ${esc(c)}.</div>`;}
    if($("pcl")){$("pcl").hidden=true;if($("pc").checked){$("pc").checked=false;pv();}}
    fxh();};
  $("wl").onchange=wv;$("v").addEventListener("input",wv);wl();
  let bgSch=null;
  $("v").addEventListener("input",fxh);fx();loadIntl().then(()=>{if(S.tab==="add"&&$("fxi"))fxh();if(bgSch)bgSch();});
  loadWallets().then(()=>{if(S.tab==="add"&&$("wl"))wl();});
  $("acc").onchange=()=>{
    pv();fh();hd();wl();fx();
    const q0=P.qid?S.qs.find(x=>x.id===P.qid):null;
    if(!q0||$("acc").value===q0.default_account_id){$("pin").innerHTML="";return;}
    $("pin").innerHTML='<button class="lk" id="pb">📌 Usar esta conta como a conta deste atalho</button>';
    $("pb").onclick=async()=>{const acc=$("acc").value;
      const {error}=await sb.from("quick_entries").update({default_account_id:acc}).eq("id",P.qid);
      if(error)return $("msg").textContent="Erro: "+error.message;
      q0.default_account_id=acc;P.acc=acc;$("pin").innerHTML="";$("msg").textContent="Conta do atalho salva ✓";};};
  /* ===== Cabe na meta? Simulação do impacto desta despesa nas metas, antes de salvar (nada é gravado) =====
     Mesmas regras da budget_progress: categoria e categorias-mãe, mais a meta do Total geral (sem categoria);
     semanal pela data; mensal e anual pela fatura quando o cartão está "pela fatura" (cm()==="stm"); parcelada: cada parcela no mês dela. */
  if(S.kind==="expense"){
    const BG={},hid=S.hid;let tk=0,tm=null;
    const iso=z=>z.getFullYear()+"-"+String(z.getMonth()+1).padStart(2,"0")+"-"+String(z.getDate()).padStart(2,"0");
    const okD=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")&&+v.slice(0,4)>=1900&&+v.slice(0,4)<=2100;
    const br=v=>fmt(v,"BRL");
    /* linhas que o Salvar geraria: [{d: data, v: valor positivo na moeda da conta}] */
    const bgRows=()=>{
      const val=num($("v").value),dt=$("dt").value;if(!(val>0)||!okD(dt))return [];
      const on=!!($("pc")&&$("pc").checked);if(!on)return [{d:dt,v:val}];
      const n=parseInt($("pn").value),pa=parseInt($("pa").value)||1;if(!(n>=2&&n<=48&&pa>=1&&pa<=n))return [];
      const o=[];
      if(pa>1){const pb=parseInt($("pbn").value),from=pb>=1&&pb<pa?pb:pa,vv=Math.round(val*100)/100;for(let i=from;i<=n;i++)o.push({d:dAdd(dt,i-pa),v:vv});return o;}
      const p=Math.round(val/n*100)/100;for(let i=1;i<=n;i++)o.push({d:dAdd(dt,i-1),v:i<n?p:Math.round((val-p*(n-1))*100)/100});return o;};
    const bgRun=async()=>{
      const box=$("bgw");if(!box||S.tab!=="add")return;const my=++tk;
      const cat=$("cat").value,dt=$("dt").value,a=S.accounts.find(x=>x.id===$("acc").value),R=bgRows();
      if(!cat||!a||!R.length){box.innerHTML="";return;}
      const cur=a.currency.trim();let k=1;
      if(cur!=="BRL"){const I=S.intl[a.id];if(!I||!(Number(I.avg)>0)){box.innerHTML='<div class="mu">🎯 Cabe na meta? Esta conta ainda não tem custo médio para converter a despesa em reais.</div>';return;}k=Number(I.avg);}
      const md=cm(),card=md==="stm"?S.cards.find(x=>x.account_id===a.id):null;
      const mOf=d=>card?String(stm(card,d)).slice(0,7):d.slice(0,7);
      const x=new Date(dt+"T12:00:00");x.setDate(x.getDate()-(x.getDay()+6)%7);const w0=iso(x);x.setDate(x.getDate()+6);const w1=iso(x);
      const m0=mOf(dt),y0=m0.slice(0,4);
      const P=[{p:"weekly",ref:dt,R:R.filter(r=>r.d>=w0&&r.d<=w1),lab:`Semanal · ${fdt(w0).slice(0,5)} a ${fdt(w1).slice(0,5)}`},
        {p:"monthly",ref:m0+"-01",R:R.filter(r=>mOf(r.d)===m0),lab:"Mensal · "+new Date(m0+"-01T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})+(card?" (fatura)":"")},
        {p:"yearly",ref:y0+"-01-01",R:R.filter(r=>mOf(r.d).slice(0,4)===y0),lab:"Anual · "+y0+(card?" (fatura)":"")}];
      const key=s=>s.p+"|"+s.ref+"|"+md,need=P.filter(s=>!BG[key(s)]);
      if(need.length){
        if(!box.innerHTML)box.innerHTML='<div class="mu">🎯 Calculando as metas…</div>';
        const rs=await Promise.all(need.map(s=>sb.rpc("budget_progress",{p_household:hid,p_ref:s.ref,p_period:s.p,p_card_mode:md})));
        if(my!==tk||!$("bgw"))return;
        const e=rs.find(r=>r.error);if(e){box.innerHTML=`<div class="mu neg">🎯 Não consegui ler as metas: ${esc(e.error.message)}</div>`;return;}
        need.forEach((s,i)=>{BG[key(s)]=rs[i].data||[];});}
      /* a categoria escolhida e as mães dela (a meta da mãe soma as subcategorias) */
      const anc=new Set();for(let c=cat,i=0;c&&i<20;i++){anc.add(c);c=(S.catsAll.find(z=>z.id===c)||{}).parent_id;}
      const col=p=>p==null?"var(--mu)":p<=80?"var(--grn)":p<=100?"var(--yel)":"var(--red)",em=p=>p==null?"":p<=80?"🟢":p<=100?"🟡":"🔴",pf=p=>p==null?"—":p.toFixed(1).replace(".",",")+"%";
      let html="";
      P.forEach(s=>{const add=Math.round(s.R.reduce((t,r)=>t+r.v*k,0)*100)/100;if(add<0.005)return;
        BG[key(s)].filter(m=>!m.category_id||anc.has(m.category_id)).forEach(m=>{
          const amt=Number(m.budget_amount),sp=Number(m.spent),p0=amt>0?sp/amt*100:null,p1=amt>0?(sp+add)/amt*100:null,r1=amt-sp-add,b0=Math.max(0,Math.min(p0||0,100)),b1=Math.max(0,Math.min(p1||0,100)-b0);
          html+=`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span><b>${esc(m.category_name)}</b> <span class="mu">· ${esc(s.lab)}</span></span><b style="white-space:nowrap"><span style="color:${col(p0)}">${pf(p0)}</span> → <span style="color:${col(p1)}">${pf(p1)}</span> ${em(p1)}</b></div>
            <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(127,127,127,.2);margin:4px 0"><span style="width:${b0}%;background:${col(p0)}"></span><span style="width:${b1}%;background:${col(p1)};opacity:.5"></span></div>
            <div class="mu">${br(sp)} + esta compra ${br(add)} de ${br(amt)} · ${r1>=0?"restariam "+br(r1):"estouraria em "+br(-r1)}</div></div>`;});});
      box.innerHTML=`<div style="margin:10px 0;padding:8px 10px;border:1px dashed var(--ac);border-radius:10px"><b>🎯 Cabe na meta?</b>
        ${html||'<div class="mu">Nenhuma meta para esta categoria (nem meta do Total geral).</div>'}
        ${R.length>1?'<div class="mu">Compra parcelada: cada parcela conta no mês dela; aqui entram só as parcelas de cada período.</div>':""}
        <div class="mu">Simulação: nada é gravado até você tocar em Salvar. Inclui previstos, como no Painel.${card?" Cartão: mensal e anual pela fatura; semanal pela data da compra.":""}${cur!=="BRL"?` Em R$ pelo custo médio (${fx4(k)} por 1 ${esc(cur)}).`:""}</div></div>`;};
    const sch=()=>{clearTimeout(tm);tm=setTimeout(bgRun,300);};bgSch=sch;
    ["v","pc","pn","pa","pbn","cat","acc","dt"].forEach(i=>{const el=$(i);if(el){el.addEventListener("input",sch);el.addEventListener("change",sch);}});
    sch();}
  $("save").onclick=async()=>{
    const val=num($("v").value);
    if(!(val>0))return $("msg").textContent="Informe um valor válido.";
    if($("cat").value===""&&cats.length)return $("msg").textContent="Escolha a categoria.";
    if(!$("dt").value)return $("msg").textContent="Informe a data.";
    const n=$("pc")&&$("pc").checked?parseInt($("pn").value):0;
    if(n&&!(n>=2&&n<=48))return $("msg").textContent="Informe de 2 a 48 parcelas.";
    const pa=n?(parseInt($("pa").value)||1):1;
    if(n&&!(pa>=1&&pa<=n))return $("msg").textContent=`A parcela atual deve ficar entre 1 e ${n}.`;
    const pbRaw=n&&pa>1?$("pbn").value.trim():"",pb=pbRaw?parseInt(pbRaw):0;
    if(pbRaw&&!(pb>=1&&pb<pa))return $("msg").textContent=`Gerar as anteriores a partir da parcela nº entre 1 e ${pa-1}, ou deixe vazio.`;
    const mkq=!!($("fl")&&$("fl").checked),qname=$("desc").value.trim();
    if(mkq){
      if(!qname)return $("msg").textContent="Para salvar como atalho, preencha a descrição: ela será o nome do atalho.";
      if(S.qs.some(q=>q.name.toLowerCase()===qname.toLowerCase()))return $("msg").textContent="Já existe um atalho com esse nome. Mude a descrição ou desmarque a opção de atalho.";
    }
    S.lastAcc=$("acc").value;
    const hl=holdersOf(S.lastAcc),hv=hl.length>1?$("hd").value:(hl[0]?hl[0].id:null);
    if(hl.length>1){try{localStorage.setItem("hold_"+S.lastAcc,hv)}catch(e){}}
    const cat=$("cat").value||null,dt=$("dt").value,tv=$("tp")&&$("tp").value?$("tp").value:null;
    const accO=S.accounts.find(a=>a.id===S.lastAcc),isBen=!!accO&&accO.type==="benefit",wid=isBen?($("wl").value||null):null;
    const oaV=$("oa")&&$("oa").value.trim()?num($("oa").value):null,ocV=$("oc")&&$("oc").value.trim()?$("oc").value.trim().toUpperCase():null,fiV=$("fi")&&$("fi").value.trim()?num($("fi").value):null;
    if((oaV!==null||ocV)&&!(oaV>0&&ocV&&/^[A-Z]{3}$/.test(ocV)))return $("msg").textContent="Valor original: informe o valor e a moeda com 3 letras (ex.: EUR).";
    if(fiV!==null&&!(fiV>0))return $("msg").textContent="A taxa deve ser maior que zero.";
    if(isBen&&!wid)return $("msg").textContent="Escolha a carteira. Se não houver nenhuma, crie em Contas > ⚙ da conta.";
    if(wid){lsSet("wal_"+S.lastAcc,wid);if(S.kind==="income")lsSet("walcat_"+wid,cat||"");}
    $("save").disabled=true;
    const run=n&&pa>1,from=pb||pa;let rows=[];
    if(run){const gid=uid4(),vv=Math.round(val*100)/100;
      for(let i=from;i<=n;i++){const d=dAdd(dt,i-pa);
        rows.push({account_id:S.lastAcc,date:d,amount:-vv,category_id:cat,description:$("desc").value||null,status:d>today()?"planned":"posted",
          installment_group_id:gid,installment_number:i,installment_total:n,card_holder_id:hv,trip_id:tv});}}
    const r=run?await sb.from("transactions").insert(rows)
      :n?await sb.rpc("create_installments",{p_account_id:S.lastAcc,p_first_date:dt,p_total:val,p_n:n,
        p_category_id:cat,p_description:$("desc").value||null,p_card_holder_id:hv})
      :await sb.from("transactions").insert({account_id:S.lastAcc,date:dt,
        amount:S.kind==="expense"?-val:val,category_id:cat,description:$("desc").value||null,
        status:dt>today()?"planned":"posted",card_holder_id:hv,wallet_id:wid,original_amount:oaV,original_currency:oaV!==null?ocV:null,fx_input:fiV,trip_id:tv});
    if(r.error){$("save").disabled=false;return $("msg").textContent="Erro: "+r.error.message;}
    let extra="";
    if(tv&&n&&!run&&r.data){const u=await sb.from("transactions").update({trip_id:tv}).eq("installment_group_id",r.data);if(u.error)extra+=" (a viagem NÃO foi vinculada: "+u.error.message+")";}
    if(mkq){
      const q=await sb.from("quick_entries").insert({household_id:S.hid,user_id:S.uid,name:qname,kind:S.kind,category_id:cat,
        default_account_id:S.lastAcc,use_count:0}).select("id").single();
      extra=q.error?" (o atalho NÃO foi criado: "+q.error.message+")":" · atalho criado ⭐";
    }
    if(P.qid)await sb.from("quick_entries").update({use_count:(S.qs.find(x=>x.id===P.qid)?.use_count||0)+1,last_used_at:new Date().toISOString()}).eq("id",P.qid);
    S.pre=null;await Promise.all([loadQs(),loadWallets()]);viewAdd();$("msg").textContent=(run?`Compra em andamento ✓ Parcelas ${from} a ${n} de ${n} geradas`:n?`Parcelado em ${n}x ✓`:"Salvo ✓")+extra;};
}

function viewQs(){
  const an=id=>S.accounts.find(a=>a.id===id)?.name||"—";
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Atalhos</b>
  <p class="mu" style="margin:6px 0">Estes atalhos são só seus: cada pessoa da família tem os seus. Excluir um atalho não muda nenhum lançamento já feito.</p>
  ${S.qs.length?S.qs.map(q=>`<div class="row" style="display:block">
   <div><b>${esc(q.name)}</b> <span class="mu">${q.kind==="expense"?"despesa":"receita"} · ${esc(catName(q.category_id))} · ${q.use_count}x${q.recurrence?" · 📌 "+(q.recurrence==="monthly"?"mensal, dia "+q.due_day:"anual, "+q.due_day+"/"+MESES[q.due_month-1]+(q.installments?" em "+q.installments+"x":"")):""}</span></div>
   <label>Conta do atalho<select data-acc="${q.id}"><option value="">(sem conta fixa: usa a última conta usada)</option>${S.accounts.map(a=>`<option value="${a.id}" ${a.id===q.default_account_id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   <label>Valor padrão (opcional)<input data-amt="${q.id}" inputmode="decimal" placeholder="0,00" value="${fa(q.default_amount)}"></label>
   <label>Conta fixa (aparece no Lançar em lote)<select data-xr="${q.id}"><option value="">Não</option><option value="monthly" ${q.recurrence==="monthly"?"selected":""}>Mensal</option><option value="yearly" ${q.recurrence==="yearly"?"selected":""}>Anual</option></select></label>
   <div data-xw="${q.id}" style="display:${q.recurrence?"flex":"none"};gap:8px"><label style="flex:1">Dia do vencimento<input data-xd="${q.id}" type="number" min="1" max="31" inputmode="numeric" value="${q.due_day||""}"></label>
    <label style="flex:1;${q.recurrence==="yearly"?"":"display:none"}" data-xmw="${q.id}">Mês<select data-xm="${q.id}">${MESES.map((m,i)=>`<option value="${i+1}" ${q.due_month===i+1?"selected":""}>${m[0].toUpperCase()+m.slice(1)}</option>`).join("")}</select></label>
    <label style="flex:1;${q.recurrence==="yearly"?"":"display:none"}" data-xiw="${q.id}">Parcelas padrão<input data-xi="${q.id}" type="number" min="2" max="48" inputmode="numeric" placeholder="à vista" value="${q.installments||""}"></label></div>
   <button class="x" data-xs="${q.id}">Salvar conta fixa</button>
   <div style="margin-top:8px"><button data-fav="${q.id}">${q.is_favorite?"⭐ Favorito":"☆ Favoritar"}</button> <button data-del="${q.id}">Excluir</button></div></div>`).join(""):'<p class="mu">Nenhum atalho ainda. Na tela Lançar, preencha um lançamento e toque em "Salvar como atalho".</p>'}</div>
  <p id="qmsg" class="neg"></p>`;
  const fail=e=>{if(e)$("qmsg").textContent="Erro: "+e.message;return !!e;};
  $("bk").onclick=()=>go("add");
  /* conta fixa: mensal (dia) ou anual (dia, mês e parcelas padrão); a regra quick_entries_recur_chk confere no banco */
  const xq=(a,id)=>document.querySelector(`[data-${a}="${id}"]`);
  document.querySelectorAll("[data-xr]").forEach(el=>el.onchange=()=>{const id=el.dataset.xr,v=el.value;
    xq("xw",id).style.display=v?"flex":"none";xq("xmw",id).style.display=v==="yearly"?"":"none";xq("xiw",id).style.display=v==="yearly"?"":"none";});
  document.querySelectorAll("[data-xs]").forEach(b=>b.onclick=async()=>{const id=b.dataset.xs,r=xq("xr",id).value,d=parseInt(xq("xd",id).value),mo=parseInt(xq("xm",id).value),it=xq("xi",id).value.trim()?parseInt(xq("xi",id).value):null;
    if(r&&!(d>=1&&d<=31))return $("qmsg").textContent="Informe o dia do vencimento (1 a 31).";
    if(r==="yearly"&&it!==null&&!(it>=2&&it<=48))return $("qmsg").textContent="Parcelas padrão: de 2 a 48, ou vazio para à vista.";
    const u=!r?{recurrence:null,due_day:null,due_month:null,installments:null}:r==="monthly"?{recurrence:"monthly",due_day:d,due_month:null,installments:null}:{recurrence:"yearly",due_day:d,due_month:mo,installments:it};
    const {error}=await sb.from("quick_entries").update(u).eq("id",id);
    if(fail(error))return;
    Object.assign(S.qs.find(q=>q.id===id),u);viewQs();$("qmsg").className="pos";$("qmsg").textContent="Conta fixa salva ✓";});
  document.querySelectorAll("[data-acc]").forEach(el=>el.onchange=async()=>{
    const id=el.dataset.acc;
    const {error}=await sb.from("quick_entries").update({default_account_id:el.value||null}).eq("id",id);
    if(fail(error))return;
    S.qs.find(q=>q.id===id).default_account_id=el.value||null;});
  document.querySelectorAll("[data-amt]").forEach(el=>el.onchange=async()=>{
    const v=num(el.value),id=el.dataset.amt;
    const {error}=await sb.from("quick_entries").update({default_amount:v>0?v:null}).eq("id",id);
    if(fail(error))return;
    S.qs.find(q=>q.id===id).default_amount=v>0?v:null;el.value=v>0?fa(v):"";});
  document.querySelectorAll("[data-fav]").forEach(b=>b.onclick=async()=>{
    const q=S.qs.find(x=>x.id===b.dataset.fav);
    const {error}=await sb.from("quick_entries").update({is_favorite:!q.is_favorite}).eq("id",q.id);
    if(fail(error))return;await loadQs();viewQs();});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
    const q=S.qs.find(x=>x.id===b.dataset.del);
    if(!confirm(`Excluir o atalho "${q.name}"? Isso não pode ser desfeito. Os lançamentos já feitos não mudam.`))return;
    const {data,error}=await sb.from("quick_entries").delete().eq("id",q.id).select("id");
    if(fail(error))return;
    if(!data||!data.length)return $("qmsg").textContent="Não consegui excluir este atalho (talvez ele já tenha sido excluído).";
    await loadQs();viewQs();});
}

