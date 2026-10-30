/* ================= VERSÍCULOS ================= */
const refv=v=>`${v.book} ${v.chapter}:${v.verse_start}${v.verse_end?"-"+v.verse_end:""}`;
// scope: "own" = só a família atual | "all" = todas as famílias das quais a pessoa faz parte
const famName=id=>(S.hs.find(h=>h.id===id)||{}).name||"Família";
function verQuery(scope,onlyActive){
  let q=sb.from("bible_verses").select("*");
  q=scope==="all"?q.in("household_id",S.hs.map(h=>h.id)):q.eq("household_id",S.hid);
  if(onlyActive)q=q.eq("is_active",true);
  return q.order("created_at").order("id");
}
async function splash(){
  const s=await sb.from("verse_settings").select("*").eq("household_id",S.hid).eq("user_id",S.uid).maybeSingle();
  const st=s.data;
  if(st&&st.splash===false)return;
  const scope=st&&st.verse_scope==="all"?"all":"own";
  const v=await verQuery(scope,true);
  const L=v.data||[];
  if(v.error||!L.length)return;
  const mode=st?st.verse_order:"random",last=st?st.last_id:null;let x;
  if(mode==="sequential"){const i=L.findIndex(a=>a.id===last);x=L[(i+1)%L.length];}
  else{const c=L.length>1?L.filter(a=>a.id!==last):L;x=c[Math.floor(Math.random()*c.length)];}
  sb.from("verse_settings").upsert({household_id:S.hid,user_id:S.uid,verse_order:mode,splash:st?st.splash:true,verse_scope:scope,last_id:x.id},{onConflict:"household_id,user_id"}).then(()=>{});
  const d=document.createElement("div");
  d.style.cssText="position:fixed;inset:0;z-index:99;background:var(--bg);color:var(--tx);display:flex;justify-content:center;align-items:center;padding:calc(32px + env(safe-area-inset-top)) 28px 32px;text-align:center;cursor:pointer";
  d.innerHTML=`<div style="max-width:520px"><div style="font-size:1.3rem;line-height:1.6;font-style:italic">“${esc(x.text)}”</div><div style="margin-top:20px;font-weight:700;color:var(--ac)">${esc(refv(x))}</div>${x.version?`<div class="mu" style="font-size:.8rem;margin-top:2px">${esc(x.version)}</div>`:""}<div class="mu" style="margin-top:40px">Toque para continuar</div></div>`;
  document.body.appendChild(d);
  return new Promise(res=>{d.onclick=()=>{d.remove();res();};});
}
async function viewVer(msg){
  const s=await sb.from("verse_settings").select("*").eq("household_id",S.hid).eq("user_id",S.uid).maybeSingle();
  const scope=s.data&&s.data.verse_scope==="all"?"all":"own";
  const v=await verQuery(scope,false);
  if(v.data)v.data.sort((a,b)=>a.book.localeCompare(b.book,"pt")||a.chapter-b.chapter||a.verse_start-b.verse_start);
  if(S.tab!=="ver")return;
  if(v.error){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(v.error.message)}</p><p class="mu">Se a tabela não existe, rode o script versiculos.sql no Supabase.</p></div>`;$("bk").onclick=()=>go("acc");return;}
  const L=v.data||[],st=s.data||{verse_order:"random",splash:true},multi=S.hs.length>1,E=L.find(x=>x.id===S.vid)||{};
  const VERS=[...new Set(L.map(x=>(x.version||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt"));
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Versículos</b>
   <label>Ordem de exibição<select id="vo"><option value="random" ${st.verse_order==="random"?"selected":""}>Aleatória</option><option value="sequential" ${st.verse_order==="sequential"?"selected":""}>Sequencial</option></select></label>
   ${multi?`<label>Versículos exibidos<select id="vsc"><option value="own" ${scope==="own"?"selected":""}>Apenas da família atual (${esc(famName(S.hid))})</option><option value="all" ${scope==="all"?"selected":""}>De todas as minhas famílias</option></select></label>`:""}
   <label class="ck"><input type="checkbox" id="vs" ${st.splash!==false?"checked":""}> Mostrar versículo ao abrir o app</label>
   <button class="sec" id="vsv">Salvar configuração</button></div>
  <div class="card"><b>${E.id?"Editar versículo":"Novo versículo"}</b>
   <label>Livro<input id="vb" value="${esc(E.book||"")}" placeholder="Ex.: Mateus"></label>
   <div style="display:flex;gap:8px"><label style="flex:1">Capítulo<input id="vc" type="number" min="1" value="${E.chapter||""}"></label><label style="flex:1">Versículo<input id="vv" type="number" min="1" value="${E.verse_start||""}"></label><label style="flex:1">Até (opc.)<input id="ve" type="number" min="1" value="${E.verse_end||""}"></label></div>
   <label>Versão da Bíblia<input id="vver" list="vvers" autocomplete="off" value="${esc(E.id?(E.version||""):(lsGet("ver_last")||""))}" placeholder="Ex.: Nova Versão Internacional"></label>
   <datalist id="vvers">${VERS.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
   <label>Texto<textarea id="vtx" rows="5">${esc(E.text||"")}</textarea></label>
   <button class="pri" id="vsave">${E.id?"Salvar alterações":"Adicionar"}</button>${E.id?'<button class="sec" id="vcan">Cancelar edição</button>':""}
   <p id="vm" class="${msg?"pos":"neg"}">${esc(msg||"")}</p></div>
  <div class="card"><b>Cadastrados (${L.length})</b>${L.map(x=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(refv(x))}${x.is_active?"":" (inativo)"}${scope==="all"&&multi?` <span class="mu">· ${esc(famName(x.household_id))}</span>`:""}</b><span style="white-space:nowrap"><button class="x" data-ve="${x.id}">✏️</button><button class="x" data-vt="${x.id}">${x.is_active?"Desativar":"Ativar"}</button><button class="x" data-vd="${x.id}">✕</button></span></div>${x.version?`<div class="mu" style="font-size:.8rem">${esc(x.version)}</div>`:""}<div class="mu">${esc(x.text)}</div></div>`).join("")||'<p class="mu">Nenhum versículo ainda.</p>'}</div>`;
  const say=t=>{$("vm").className="neg";$("vm").textContent=t;};
  $("bk").onclick=()=>{S.vid=null;go("acc");};
  $("vsv").onclick=async()=>{const {error}=await sb.from("verse_settings").upsert({household_id:S.hid,user_id:S.uid,verse_order:$("vo").value,splash:$("vs").checked,verse_scope:$("vsc")?$("vsc").value:scope,last_id:st.last_id||null},{onConflict:"household_id,user_id"});
    if(error)return say("Erro: "+error.message);viewVer("Configuração salva ✓");};
  $("vsave").onclick=async()=>{
    const b=$("vb").value.trim(),c=+$("vc").value,vs=+$("vv").value,ve=$("ve").value?+$("ve").value:null,t=$("vtx").value.trim();
    if(!b||!(c>=1)||!(vs>=1)||!t)return say("Preencha livro, capítulo, versículo e texto.");
    if(ve!==null&&ve<=vs)return say("O versículo final deve ser maior que o inicial (ou deixe em branco).");
    const vr=$("vver").value.trim()||null;
    const row={household_id:E.id?E.household_id:S.hid,book:b,chapter:c,verse_start:vs,verse_end:ve,text:t,version:vr};
    const {error}=E.id?await sb.from("bible_verses").update(row).eq("id",E.id):await sb.from("bible_verses").insert(row);
    if(error)return say("Erro: "+error.message);if(vr)lsSet("ver_last",vr);S.vid=null;viewVer("Salvo ✓");};
  if($("vcan"))$("vcan").onclick=()=>{S.vid=null;viewVer();};
  document.querySelectorAll("[data-ve]").forEach(b=>b.onclick=()=>{S.vid=b.dataset.ve;viewVer().then(()=>window.scrollTo(0,0));});
  document.querySelectorAll("[data-vt]").forEach(b=>b.onclick=async()=>{const x=L.find(y=>y.id===b.dataset.vt);
    const {error}=await sb.from("bible_verses").update({is_active:!x.is_active}).eq("id",x.id);if(error)return say("Erro: "+error.message);viewVer();});
  document.querySelectorAll("[data-vd]").forEach(b=>b.onclick=async()=>{if(!confirm("Apagar este versículo?"))return;
    const {error}=await sb.from("bible_verses").delete().eq("id",b.dataset.vd);if(error)return say("Erro: "+error.message);viewVer();});
}

