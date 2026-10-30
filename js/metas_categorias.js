/* ================= METAS ================= */
async function viewMetas(msg){
  const {data,error}=await sb.from("budgets").select("*").eq("household_id",S.hid).order("created_at");
  if(error){$("main").innerHTML=`<div class="card neg">${esc(error.message)}</div>`;return;}
  const E=S.me?data.find(b=>b.id===S.me):null;if(S.me&&!E)S.me=null;
  const PN={weekly:"semanal",monthly:"mensal",yearly:"anual"},ORD={weekly:0,monthly:1,yearly:2};
  const fd=x=>x?x.split("-").reverse().join("/"):"";
  const lab=b=>b.category_id?(()=>{const c=catById(b.category_id);return c?catLabel(c)+(c.is_active?"":" (arquivada)"):"Categoria removida";})():"Total geral";
  const L=data.slice().sort((a,b)=>ORD[a.period]-ORD[b.period]||(a.category_id?1:0)-(b.category_id?1:0)||lab(a).localeCompare(lab(b),"pt-BR"));
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar ao Painel</button> <b>Metas</b>
   ${L.length?L.map(b=>`<div class="row"><div><div>${esc(lab(b))}</div><div class="mu">${PN[b.period]} · a partir de ${fd(b.valid_from)}${b.valid_to?" até "+fd(b.valid_to):""}</div></div>
     <div style="text-align:right;white-space:nowrap">${mm(b.amount)}<button class="x" data-me="${b.id}">✏️</button><button class="x" data-md="${b.id}">✕</button></div></div>`).join(""):'<p class="mu">Nenhuma meta ainda. Use o formulário abaixo.</p>'}</div>
  <div class="card"><b>${E?"Editar meta":"Nova meta"}</b>
   <label>Categoria<select id="mc"><option value="">Total geral</option>${catOpts("expense",E?E.category_id:null)}</select></label>
   <label>Período<select id="mp">${Object.entries(PN).map(([k,v])=>`<option value="${k}" ${(E?E.period:"monthly")===k?"selected":""}>${v[0].toUpperCase()+v.slice(1)}</option>`).join("")}</select></label>
   <label>Valor da meta (R$)<input id="ma" inputmode="decimal" placeholder="0,00" value="${E?f2(E.amount):""}"></label>
   <label>Válida a partir de<input id="mf" type="date" value="${E?E.valid_from:today().slice(0,8)+"01"}"></label>
   <label>Válida até (opcional)<input id="mt" type="date" value="${E?.valid_to||""}"></label>
   <button class="pri" id="ms">${E?"Salvar alterações":"Adicionar meta"}</button>
   ${E?'<button class="sec" id="mx">Cancelar edição</button>':""}
   <p id="mm2" class="${msg?"pos":"neg"}">${esc(msg||"")}</p>
   <p class="mu">Uma meta numa categoria-mãe soma também as subcategorias. Meta sem categoria é o "Total geral" de despesas.</p>
   <button class="lk" id="mgc">🏷 Gerenciar categorias</button></div>`;
  $("bk").onclick=()=>{S.me=null;go("dash");};
  $("mgc").onclick=()=>{S.catFrom="metas";go("cat");};
  if($("mx"))$("mx").onclick=()=>{S.me=null;viewMetas();};
  document.querySelectorAll("[data-me]").forEach(b=>b.onclick=async()=>{S.me=b.dataset.me;await viewMetas();window.scrollTo(0,document.body.scrollHeight);});
  document.querySelectorAll("[data-md]").forEach(b=>b.onclick=async()=>{
    const m=data.find(x=>x.id===b.dataset.md);
    if(!confirm(`Apagar a meta "${lab(m)}" (${PN[m.period]})?`))return;
    const {error}=await sb.from("budgets").delete().eq("id",m.id);
    if(error)return alert("Erro: "+error.message);
    if(S.me===m.id)S.me=null;
    viewMetas("Meta apagada ✓");});
  $("ms").onclick=async()=>{
    const v=num($("ma").value),vf=$("mf").value,vt=$("mt").value||null,cat=$("mc").value||null,per=$("mp").value;
    const say=t=>{$("mm2").className="neg";$("mm2").textContent=t;};
    if(!(v>0))return say("Informe um valor maior que zero.");
    if(!vf)return say("Informe a data de início.");
    if(vt&&vt<vf)return say('"Válida até" não pode ser anterior a "Válida a partir de".');
    const dup=data.find(b=>b.id!==(E&&E.id)&&(b.category_id||null)===cat&&b.period===per&&vf<=(b.valid_to||"9999-12-31")&&b.valid_from<=(vt||"9999-12-31"));
    if(dup)return say("Já existe uma meta para essa categoria e período nessas datas. Edite a existente.");
    $("ms").disabled=true;
    const row={category_id:cat,period:per,amount:v,valid_from:vf,valid_to:vt};
    const {error}=E?await sb.from("budgets").update(row).eq("id",E.id):await sb.from("budgets").insert({household_id:S.hid,...row});
    if(error){$("ms").disabled=false;return say("Erro: "+error.message);}
    S.me=null;viewMetas(E?"Meta atualizada ✓":"Meta criada ✓");};
}

/* ================= CATEGORIAS ================= */
const catDup=(name,kind,par,except)=>S.catsAll.some(c=>c.is_active&&c.id!==except&&c.kind===kind&&(c.parent_id||null)===(par||null)&&c.name.trim().toLowerCase()===name.trim().toLowerCase());
const motherOpts=(kind,sel,excl)=>'<option value="">(nenhuma: categoria principal)</option>'+catSort(S.catsAll.filter(c=>c.kind===kind&&!c.parent_id&&c.id!==excl&&(c.is_active||c.id===sel))).map(c=>`<option value="${c.id}" ${c.id===sel?"selected":""}>${esc(c.name)}${c.is_active?"":" (arquivada)"}</option>`).join("");

async function viewCat(){
  await loadCats();
  const msg=S.cmsg;S.cmsg="";
  const act=S.catsAll.filter(c=>c.is_active),ids=new Set(act.map(c=>c.id)),arq=catSort(S.catsAll.filter(c=>!c.is_active));
  const roots=k=>catSort(act.filter(c=>c.kind===k&&(!c.parent_id||!ids.has(c.parent_id))));
  const kids=id=>catSort(act.filter(c=>c.parent_id===id));
  const row=(c,lv)=>`<div class="row" style="padding-left:${lv*22}px"><div>${lv?"↳ ":""}${esc(lv?c.name:catLabel(c))}</div><button class="x" data-ce="${c.id}">✏️</button></div>`;
  const sec=(k,t)=>`<div class="card"><b>${t}</b>${roots(k).map(r=>row(r,0)+kids(r.id).map(c=>row(c,1)).join("")).join("")||'<p class="mu">Nenhuma.</p>'}</div>`;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Categorias</b>
   <label>Nome<input id="cn" placeholder="Ex.: Combustível"></label>
   <label>Tipo<select id="ck"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
   <label>Categoria-mãe (para criar uma subcategoria)<select id="cm">${motherOpts("expense")}</select></label>
   <button class="pri" id="ca">Adicionar categoria</button><p id="cmsg" class="${msg?"pos":"neg"}">${esc(msg)}</p></div>
  ${sec("expense","Despesas")}${sec("income","Receitas")}
  ${arq.length?`<div class="card"><details><summary>Arquivadas (${arq.length})</summary>${arq.map(c=>`<div class="row"><div>${esc(catLabel(c))} <span class="mu">${c.kind==="expense"?"despesa":"receita"}</span></div><button class="x" data-re="${c.id}">Reativar</button></div>`).join("")}</details></div>`:""}`;
  const say=t=>{$("cmsg").className="neg";$("cmsg").textContent=t;};
  $("bk").onclick=()=>go(S.catFrom==="metas"?"metas":"acc");
  $("ck").onchange=()=>{$("cm").innerHTML=motherOpts($("ck").value);};
  document.querySelectorAll("[data-ce]").forEach(b=>b.onclick=()=>{S.ce=b.dataset.ce;go("cated");});
  $("ca").onclick=async()=>{
    const name=$("cn").value.trim(),kind=$("ck").value,par=$("cm").value||null;
    if(!name)return say("Informe o nome da categoria.");
    if(par){const p=catById(par);if(!p||p.parent_id||p.kind!==kind||!p.is_active)return say("Categoria-mãe inválida.");}
    if(catDup(name,kind,par))return say("Já existe uma categoria com esse nome nesse lugar.");
    $("ca").disabled=true;
    const {error}=await sb.from("categories").insert({household_id:S.hid,name,kind,parent_id:par});
    if(error){$("ca").disabled=false;return say("Erro: "+error.message);}
    S.cmsg=`"${name}" criada ✓`;viewCat();};
  document.querySelectorAll("[data-re]").forEach(b=>b.onclick=async()=>{
    const c=catById(b.dataset.re),p=c.parent_id&&catById(c.parent_id);
    if(p&&!p.is_active)return say(`Reative primeiro a categoria-mãe "${p.name}".`);
    if(catDup(c.name,c.kind,c.parent_id,c.id))return say("Já existe uma categoria ativa com esse nome nesse lugar.");
    const {error}=await sb.from("categories").update({is_active:true}).eq("id",c.id);
    if(error)return say("Erro: "+error.message);
    S.cmsg=`"${c.name}" reativada ✓`;viewCat();});
}

function viewCatEdit(){
  const c=catById(S.ce);if(!c)return go("cat");
  const filhas=S.catsAll.filter(x=>x.parent_id===c.id),ativas=filhas.filter(x=>x.is_active);
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Editar categoria</b> <span class="mu">${c.kind==="expense"?"despesa":"receita"}${c.is_active?"":" · arquivada"}</span>
   <label>Nome<input id="cn" value="${esc(c.name)}"></label>
   <label>Categoria-mãe<select id="cm" ${filhas.length?"disabled":""}>${motherOpts(c.kind,c.parent_id,c.id)}</select></label>
   ${filhas.length?`<p class="mu">Esta categoria tem ${filhas.length} subcategoria(s), por isso não pode virar subcategoria de outra. O tipo (despesa ou receita) não pode ser mudado.</p>`:'<p class="mu">O tipo (despesa ou receita) não pode ser mudado.</p>'}
   <button class="pri" id="cs">Salvar alterações</button>
   <button class="sec" id="cr">${c.is_active?"Arquivar":"Reativar"}</button>
   <button class="sec neg" id="cdel">Apagar de vez</button>
   <p id="cmsg" class="neg"></p></div>`;
  const say=t=>{$("cmsg").textContent=t;};
  $("bk").onclick=()=>go("cat");
  const cnt=async(t,col)=>{const r=await sb.from(t).select("id",{count:"exact",head:true}).eq(col,c.id);return r.error?null:(r.count||0);};
  $("cs").onclick=async()=>{
    const name=$("cn").value.trim(),par=$("cm").value||null;
    if(!name)return say("Informe o nome da categoria.");
    if(par){const p=catById(par);if(!p||p.parent_id||p.kind!==c.kind||par===c.id)return say("Categoria-mãe inválida.");if(filhas.length)return say("Esta categoria tem subcategorias e não pode virar subcategoria.");}
    if(c.is_active&&catDup(name,c.kind,par,c.id))return say("Já existe uma categoria com esse nome nesse lugar.");
    $("cs").disabled=true;
    const {error}=await sb.from("categories").update({name,parent_id:par}).eq("id",c.id);
    if(error){$("cs").disabled=false;return say("Erro: "+error.message);}
    S.cmsg="Categoria atualizada ✓";go("cat");};
  $("cr").onclick=async()=>{
    if(!c.is_active){
      const p=c.parent_id&&catById(c.parent_id);
      if(p&&!p.is_active)return say(`Reative primeiro a categoria-mãe "${p.name}".`);
      if(catDup(c.name,c.kind,c.parent_id,c.id))return say("Já existe uma categoria ativa com esse nome nesse lugar.");
      const {error}=await sb.from("categories").update({is_active:true}).eq("id",c.id);
      if(error)return say("Erro: "+error.message);
      S.cmsg=`"${c.name}" reativada ✓`;return go("cat");}
    const idsA=[c.id,...ativas.map(x=>x.id)];
    const nb=await sb.from("budgets").select("id",{count:"exact",head:true}).in("category_id",idsA);
    const txt=`Arquivar "${c.name}"${ativas.length?` e suas ${ativas.length} subcategoria(s)`:""}? Some do Lançar e das metas novas; os lançamentos antigos mantêm o nome.`+(nb.count?` Existem ${nb.count} meta(s) ligada(s): elas continuam existindo (apague em Metas se quiser).`:"");
    if(!confirm(txt))return;
    const {error}=await sb.from("categories").update({is_active:false}).in("id",idsA);
    if(error)return say("Erro: "+error.message);
    S.cmsg=`"${c.name}" arquivada ✓`;go("cat");};
  $("cdel").onclick=async()=>{
    if(filhas.length)return say(`Tem ${filhas.length} subcategoria(s) (inclusive arquivadas). Apague-as antes, ou arquive esta categoria.`);
    const [t,b,q]=await Promise.all([cnt("transactions","category_id"),cnt("budgets","category_id"),sb.rpc("count_quick_entries_by_category",{p_category_id:c.id}).then(r=>r.error?null:(r.data||0))]);
    if(t==null||b==null||q==null)return say("Não consegui verificar o uso da categoria. Tente de novo.");
    if(t)return say(`Tem ${t} lançamento(s). Arquive em vez de apagar.`);
    if(b)return say(`Tem ${b} meta(s) ligada(s). Apague as metas ou arquive a categoria.`);
    if(q)return say(`É usada em ${q} atalho(s) da família (seus ou de outra pessoa). Exclua ou ajuste esses atalhos, ou arquive a categoria.`);
    if(!confirm(`Apagar "${c.name}" de vez? Isso não pode ser desfeito.`))return;
    const {error}=await sb.from("categories").delete().eq("id",c.id);
    if(error)return say("Erro: "+error.message);
    S.cmsg=`"${c.name}" apagada ✓`;S.ce=null;go("cat");};
}

