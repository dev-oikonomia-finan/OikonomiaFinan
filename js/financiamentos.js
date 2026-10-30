/* ================= FINANCIAMENTOS ================= */
const fdt=x=>x?x.split("-").reverse().join("/"):"";
async function viewLoans(msg){
  await loadLoans();
  const {data,error}=await sb.from("loan_progress").select("*").eq("household_id",S.hid).order("name");
  if(S.tab!=="loans")return;
  if(error){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar ao Painel</button><p class="neg">${esc(error.message)}</p><p class="mu">Se a tabela ou a view não existe, rode o script financiamentos.sql no SQL Editor do Supabase.</p></div>`;$("bk").onclick=()=>go("dash");return;}
  const L=data||[],an=id=>S.accounts.find(a=>a.id===id)?.name||"—";
  const base=S.accounts.filter(a=>a.type!=="credit_card"),accs=base.length?base:S.accounts;
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar ao Painel</button> <b>Financiamentos e empréstimos</b>
   ${L.length?L.map(l=>{const pc=Number(l.paid_count),tot=Number(l.total_installments),rem=Number(l.remaining_count),pct=tot?Math.min(100,pc/tot*100):0;
     return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(l.name)}</b><span class="mu">${l.kind==="sac"?"SAC":"Parcela fixa"}</span></div>
      <div class="mu">${pc} de ${tot} pagas · ${rem>0?"faltam "+rem:"quitado ✓"} · conta sugerida: ${esc(an(l.account_id))}</div>
      <div class="bar"><i style="width:${pct}%;background:var(--ac)"></i></div>
      ${rem>0?`<div class="mu">Próxima (${l.next_number}/${tot}): ${mm(l.next_amount)} em ${fdt(l.next_date)} · ainda a pagar ${mm(l.remaining_amount)}</div>`:""}
      <div style="margin-top:8px"><button data-lp="${l.installment_group_id}">Ver parcelas</button> <button data-la="${l.contract_id}">Antecipar</button> <button class="neg" data-ld="${l.contract_id}">Apagar</button></div></div>`;}).join(""):'<p class="mu">Nenhum contrato ainda. Use o formulário abaixo.</p>'}</div>
  <div class="card"><b>Novo contrato</b>
   <label>Nome<input id="ln" placeholder="Ex.: Financiamento do carro"></label>
   <label>Tipo<select id="lkd"><option value="fixed">Parcela fixa</option><option value="sac">SAC (parcelas decrescentes)</option></select></label>
   <label>Conta sugerida para pagar as parcelas<select id="lac">${accs.map(a=>`<option value="${a.id}">${esc(a.name)} (${a.currency.trim()})</option>`).join("")}</select></label>
   <label>Categoria<select id="lct">${catOpts("expense",null,true)}</select></label>
   <label>Total de parcelas do contrato<input id="lto" type="number" min="1" inputmode="numeric"></label>
   <label>Quantas já foram pagas<input id="lpd" type="number" min="0" inputmode="numeric" value="0"></label>
   <label>Data da próxima parcela<input id="ldt" type="date" value="${today()}"></label>
   <label>Valor da próxima parcela<input id="lam" inputmode="decimal" placeholder="0,00"></label>
   <div id="lsw" hidden>
    <label>Queda mensal da parcela (SAC)<input id="ldr" inputmode="decimal" placeholder="0,00"></label>
    <details><summary>Calcular a queda (estimativa)</summary>
     <label>Saldo devedor atual<input id="lsd" inputmode="decimal" placeholder="0,00"></label>
     <label>Taxa de juros ao mês (%)<input id="ltx" inputmode="decimal" placeholder="0,80"></label>
     <button class="sec" id="lcalc" type="button">Calcular queda</button>
     <p class="mu">Queda = saldo ÷ parcelas restantes × taxa. Seguros e taxas do banco fazem a conta não bater ao centavo.</p></details></div>
   <button class="pri" id="ls">Criar contrato e gerar parcelas</button>
   <p id="lnm" class="${msg?"pos":"neg"}">${esc(msg||"")}</p>
   <p class="mu">O app gera só as parcelas restantes, como estimativa. Depois, corrija cada parcela com o valor que a instituição cobrar de fato (Ver parcelas).</p></div>`;
  const say=(t,ok)=>{$("lnm").className=ok?"mu":"neg";$("lnm").textContent=t;};
  $("bk").onclick=()=>go("dash");
  $("lkd").onchange=()=>{$("lsw").hidden=$("lkd").value!=="sac";};
  $("lcalc").onclick=()=>{
    const sd=num($("lsd").value),tx=num($("ltx").value),n=(parseInt($("lto").value)||0)-(parseInt($("lpd").value)||0);
    if(!(sd>0&&tx>=0&&n>0))return say("Para calcular, informe saldo devedor, taxa ao mês, total de parcelas e quantas já foram pagas.");
    $("ldr").value=fa((sd/n*tx/100).toFixed(2));say("Queda calculada. Confira o campo acima.",true);};
  document.querySelectorAll("[data-lp]").forEach(b=>b.onclick=()=>{S.par=b.dataset.lp;S.parFrom="loans";go("par");});
  document.querySelectorAll("[data-la]").forEach(b=>b.onclick=()=>{S.antId=b.dataset.la;go("ant");});
  document.querySelectorAll("[data-ld]").forEach(b=>b.onclick=async()=>{
    const l=L.find(x=>x.contract_id===b.dataset.ld);
    if(!confirm(`Apagar o contrato "${l.name}" e TODAS as parcelas dele (pagas e previstas)? Isso muda os saldos das contas e não pode ser desfeito.`))return;
    const {error}=await sb.rpc("delete_loan_contract",{p_contract_id:l.contract_id});
    if(error)return say("Erro: "+error.message);
    viewLoans("Contrato apagado ✓");});
  $("ls").onclick=async()=>{
    const name=$("ln").value.trim(),kind=$("lkd").value,total=parseInt($("lto").value),paid=parseInt($("lpd").value||"0"),
      dt=$("ldt").value,amt=num($("lam").value),drop=kind==="sac"?(num($("ldr").value)||0):0;
    if(!name)return say("Informe o nome do contrato.");
    if(!(total>=1))return say("Informe o total de parcelas.");
    if(!(paid>=0&&paid<total))return say(`Parcelas já pagas deve ficar entre 0 e ${total-1}.`);
    if(!dt)return say("Informe a data da próxima parcela.");
    if(!(amt>0))return say("Informe o valor da próxima parcela.");
    if(drop<0)return say("A queda mensal não pode ser negativa.");
    if(kind==="sac"&&amt-(total-paid-1)*drop<=0)return say("Com essa queda, a última parcela ficaria zerada ou negativa. Confira a queda mensal.");
    $("ls").disabled=true;
    const {error}=await sb.rpc("create_loan_schedule",{p_name:name,p_kind:kind,p_account_id:$("lac").value,p_category_id:$("lct").value||null,
      p_total_installments:total,p_paid_before:paid,p_first_date:dt,p_first_amount:amt,p_monthly_drop:drop});
    if(error){$("ls").disabled=false;return say("Erro: "+error.message);}
    viewLoans(`Contrato criado ✓ ${total-paid} parcela(s) geradas. Confira em "Ver parcelas".`);};
}

async function viewAnt(){
  const c=S.loans.find(l=>l.id===S.antId);if(!c){S.antId=null;return go("loans");}
  const {data,error}=await sb.from("transactions").select("installment_number,date,amount")
    .eq("installment_group_id",c.installment_group_id).eq("status","planned").gt("date",today()).order("installment_number");
  if(S.tab!=="ant")return;
  const back=()=>go("loans");
  if(error){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button><p class="neg">${esc(error.message)}</p></div>`;$("bk").onclick=back;return;}
  const O=data||[];
  if(!O.length){$("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Antecipar parcelas</b><p class="mu">${esc(c.name)}: não há parcelas em aberto para antecipar.</p></div>`;$("bk").onclick=back;return;}
  const ca=S.accounts.find(a=>a.id===c.account_id),cur=ca?ca.currency.trim():"BRL";
  const accs=S.accounts.filter(a=>a.currency.trim()===cur);
  $("main").innerHTML=`<div class="card"><button class="lk" id="bk">← Voltar</button> <b>Antecipar parcelas</b>
   <div class="mu">${esc(c.name)} · ${O.length} parcela(s) em aberto (${O[0].installment_number} a ${O[O.length-1].installment_number} de ${c.total_installments})</div>
   <label>Quantas parcelas<input id="xn" type="number" min="1" max="${O.length}" inputmode="numeric" value="1"></label>
   <label>Quais<select id="xw"><option value="next">As próximas</option><option value="last">As últimas</option></select></label>
   <label>Valor total pago (o que a instituição cobrou)<input id="xv" inputmode="decimal" placeholder="0,00"></label>
   <label>Data do pagamento<input id="xd" type="date" value="${today()}" max="${today()}"></label>
   <label>Conta de onde saiu o dinheiro<select id="xa">${accs.map(a=>`<option value="${a.id}" ${a.id===c.account_id?"selected":""}>${esc(a.name)}</option>`).join("")}</select></label>
   <p id="xp" class="mu"></p>
   <button class="pri" id="xs">Registrar antecipação</button><p id="xm" class="neg"></p>
   <p class="mu">O valor é dividido igualmente entre as parcelas escolhidas, que ficam como pagas na data informada. Em seguida abro as parcelas para você corrigir centavos, se precisar. No SAC, depois de amortização extra, ajuste as parcelas restantes manualmente.</p></div>`;
  const sel=()=>{const n=parseInt($("xn").value);if(!(n>=1&&n<=O.length))return null;return $("xw").value==="next"?O.slice(0,n):O.slice(-n);};
  const pv=()=>{const S2=sel(),v=num($("xv").value);if(!S2){$("xp").textContent="";return;}
    const prev=S2.reduce((a,t)=>a-Number(t.amount),0);
    $("xp").textContent=`Previsto para essas parcelas: ${fmt(prev,cur)}`+(v>0?` · você paga ${fmt(v,cur)} (${v<=prev?"desconto de "+fmt(prev-v,cur):"acima do previsto em "+fmt(v-prev,cur)})`:"");};
  ["xn","xw","xv"].forEach(i=>$(i).oninput=pv);pv();
  $("bk").onclick=back;
  $("xs").onclick=async()=>{
    const say=t=>{$("xm").textContent=t;};
    const n=parseInt($("xn").value),v=num($("xv").value),d=$("xd").value;
    if(!(n>=1&&n<=O.length))return say(`Informe de 1 a ${O.length} parcelas.`);
    if(!(v>0)||Math.round(v*100)/100!==v)return say("Informe o valor total pago (até 2 casas decimais).");
    if(!d)return say("Informe a data do pagamento.");
    if(d>today())return say("A data do pagamento não pode ser futura.");
    $("xs").disabled=true;
    const acc=$("xa").value;
    const {error}=await sb.rpc("anticipate_installments",{p_contract_id:c.id,p_n:n,p_which:$("xw").value,p_total_paid:v,p_date:d,p_account_id:acc===c.account_id?null:acc});
    if(error){$("xs").disabled=false;return say("Erro: "+error.message);}
    S.par=c.installment_group_id;S.parFrom="loans";S.pmsg=`${n} parcela(s) antecipada(s) ✓ Confira os valores abaixo e corrija o que for preciso.`;go("par");};
}

