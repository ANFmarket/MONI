/* MONI 1.0 RC2 — executive panels; local-only budget, goals and recurring templates */
(()=>{
  const el=id=>document.getElementById(id), fmt=c=>money(Math.round(c)),safe=(id,s)=>{const x=el(id);if(x)x.textContent=s}, read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x??fallback}catch{return fallback}}, write=(key,data)=>localStorage.setItem(key,JSON.stringify(data));
  let budget=read('moni-budget-limit',0),goals=read('moni-savings-goals',[]),fixed=read('moni-fixed-templates',[]);
  // Preserve templates created in earlier MONI releases and assign a stable key.
  if(!Array.isArray(fixed))fixed=[];
  fixed=fixed.filter(f=>f&&typeof f.name==='string'&&Number.isSafeInteger(f.cents)&&f.cents>0).map(f=>({...f,id:f.id||crypto.randomUUID(),day:Number.isInteger(Number(f.day))&&Number(f.day)>=1&&Number(f.day)<=31?Number(f.day):1}));
  try{write('moni-fixed-templates',fixed)}catch{}
  const monthKey=()=>today().slice(0,7);
  const dueDate=(f,key=monthKey())=>{const last=new Date(Number(key.slice(0,4)),Number(key.slice(5,7)),0).getDate();return `${key}-${String(Math.min(f.day,last)).padStart(2,'0')}`};
  const wasPaid=(f,key=monthKey())=>f.paidMonth===key && typeof f.paidMovementId==='string' && rows.some(r=>r.id===f.paidMovementId&&r.type==='expense');
  const paidLabel=(f,key=monthKey())=>wasPaid(f,key)?'Pagado':'Pendiente';
  const monthlyFixed=(key=monthKey())=>[...fixed].sort((a,b)=>dueDate(a,key).localeCompare(dueDate(b,key)));
  function drawUpcoming(){
    const target=el('upcomingList');if(!target)return;target.replaceChildren();
    const bills=monthlyFixed(), pending=bills.filter(f=>!wasPaid(f));
    safe('upcomingSummary',bills.length?`${pending.length} pendiente${pending.length===1?'':'s'} · ${fmt(sum(pending))} por pagar este mes`:'Todavía no tienes gastos fijos; agrégalos desde Gastos fijos.');
    for(const f of bills){const line=document.createElement('div');line.className='upcoming-item';
      const details=document.createElement('div');details.className='upcoming-info';
      const name=document.createElement('strong');name.textContent=f.name;
      const date=document.createElement('small');date.textContent=`Vence: ${dueDate(f).split('-').reverse().join('/')} · ${f.category}`;
      details.append(name,date);const amount=document.createElement('strong');amount.textContent=fmt(f.cents);
      const status=document.createElement('span');const paid=wasPaid(f);status.className='payment-status '+(paid?'paid':'pending');status.textContent=paid?'✓ Pagado':'Pendiente';
      line.append(details,amount,status);target.append(line);
    }
  }
  function registerFixedPayment(f){
    if(wasPaid(f))return alert('Este gasto fijo ya se registró como pagado este mes.');
    if(!confirm(`¿Registrar ${f.name} por ${fmt(f.cents)} como pagado este mes?`))return;
    const item={id:crypto.randomUUID(),type:'expense',concept:f.name,category:f.category,cents:f.cents,date:today(),small:false};
    if(!commit([...rows,item]))return;
    f.paidMonth=monthKey();f.paidMovementId=item.id;
    try{write('moni-fixed-templates',fixed)}catch{alert('El gasto se registró, pero no se pudo guardar el estado de pago.');}
    drawFixed();drawUpcoming();draw();
  }
  const palettes=['#007f71','#10a99c','#52bda8','#78cbd7','#a3d5e6','#bcd7d2','#dcebe8'];
  const totalBy=(r,t,start='',end='9999-12-31')=>sum(r.filter(x=>x.type===t&&x.date>=start&&x.date<=end));
  function selectView(name){if(!el('view-'+name))return;document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+name);document.querySelectorAll('[data-view]').forEach(b=>{const is=b.dataset.view===name;b.classList.toggle('active',is);if(is)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});el('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'instant'});if(name==='movimientos'&&el('editor').hidden===false)el('concept').focus()}
  document.querySelectorAll('[data-view],[data-goto]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view||b.dataset.goto)));
  el('navToggle').onclick=()=>el('sidebar').classList.toggle('open');
  el('topMic').onclick=()=>{selectView('inicio');el('mic').click()};
  el('currentMonth').textContent=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'}).format(new Date());
  // Make 'new movement' accessible from both dashboard and movements.
  document.querySelectorAll('[data-goto="movimientos"]').forEach(b=>{if(b.textContent.includes('Nuevo movimiento'))b.addEventListener('click',()=>el('addExpense').click())});
  function draw(){
    const key=today().slice(0,7),start=key+'-01',end=today(),expenses=rows.filter(r=>r.type==='expense'&&r.date>=start&&r.date<=end),income=totalBy(rows,'income',start,end),outgo= sum(expenses),ants=sum(expenses.filter(r=>isAnt(r,rows))),balance=income-outgo;
    safe('kpiBalance',(balance<0?'−':'')+fmt(Math.abs(balance)));safe('kpiIncome',fmt(income));safe('kpiExpense',fmt(outgo));safe('kpiAnts',fmt(ants));
    const limit=Math.round(budget*100),pct=limit?100*outgo/limit:0;
    el('budgetProgress').style.width=Math.min(100,pct)+'%';el('budgetProgress').classList.toggle('exceeded',pct>100);
    safe('budgetSummary',limit?(outgo>limit?`${pct.toFixed(0)}% utilizado · Excedido por ${fmt(outgo-limit)} (${(pct-100).toFixed(0)}% sobre el límite)`: `${pct.toFixed(0)}% utilizado · ${fmt(limit-outgo)} disponible`):'Establece un límite mensual');
    safe('budgetDetail',limit?`Límite: ${fmt(limit)} · Gastado: ${fmt(outgo)} · ${outgo>limit?'Presupuesto excedido por '+fmt(outgo-limit)+' ('+(pct-100).toFixed(0)+'% adicional)':'Disponible: '+fmt(limit-outgo)}`:'Todavía no has definido un presupuesto.');
    const first=expenses.filter(r=>Number(r.date.slice(8))<=15),second=expenses.filter(r=>Number(r.date.slice(8))>=16);
    safe('fortnightStats',`Primera quincena: ${fmt(sum(first))} · Segunda quincena: ${fmt(sum(second))}`);
    const active=goals[0];const gp=active?Math.min(100,(active.saved/active.target)*100):0;el('savingsProgress').style.width=gp+'%';safe('savingsSummary',active?`${active.name}: ${fmt(active.saved)} de ${fmt(active.target)} (${gp.toFixed(0)}%)`:'Crea una meta de ahorro');
    const groupMap=new Map();for(const r of expenses)groupMap.set(r.category,(groupMap.get(r.category)||0)+r.cents);
    const group=[...groupMap].sort((a,b)=>b[1]-a[1]),root=el('homeDonut'),legend=el('homeLegend');legend.replaceChildren();
    if(!group.length){root.style.background='#e7f2ef';safe('homeDonutTotal','Sin gastos');legend.textContent='Registra un gasto para ver el desglose.'}
    else{let offset=0,parts=[];group.forEach(([cat,value],i)=>{const next=offset+100*value/outgo;parts.push(`${palettes[i%palettes.length]} ${offset.toFixed(2)}% ${next.toFixed(2)}%`);offset=next;const line=document.createElement('div');line.className='legend-line';const swatch=document.createElement('span');swatch.className='legend-dot';swatch.style.background=palettes[i%palettes.length];const name=document.createElement('span');name.textContent=cat;const amt=document.createElement('strong');amt.textContent=(100*value/outgo).toFixed(0)+'%';line.append(swatch,name,amt);legend.append(line)});root.style.background=`conic-gradient(${parts.join(',')})`;safe('homeDonutTotal',fmt(outgo))}
    const comp=el('homeComparison');comp.replaceChildren();for(const [label,value,cls] of [['Ingresos',income,'income'],['Gastos',outgo,'expense']]){let item=document.createElement('div');item.className='comparison-item';let t=document.createElement('div');t.className='between';let a=document.createElement('span');a.textContent=label;let b=document.createElement('strong');b.textContent=fmt(value);t.append(a,b);let track=document.createElement('div');track.className='meter';let fill=document.createElement('div');fill.className=cls;fill.style.width=(value/Math.max(income,outgo,1)*100)+'%';track.append(fill);item.append(t,track);comp.append(item)}safe('homeNet',`Resultado del mes: ${balance<0?'−':'+'}${fmt(Math.abs(balance))}`);
    const trend=el('homeTrend');trend.replaceChildren();const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);const m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return {label:new Intl.DateTimeFormat('es-MX',{month:'short'}).format(d),value:sum(rows.filter(r=>r.type==='expense'&&r.date.startsWith(m)))}}),max=Math.max(1,...months.map(x=>x.value));for(const m of months){const slot=document.createElement('div');slot.className='home-month';const col=document.createElement('div');col.className='home-month-bar';col.style.height=Math.max(4,m.value/max*100)+'%';col.title=`${m.label}: ${fmt(m.value)}`;const text=document.createElement('small');text.textContent=m.label;slot.append(col,text);trend.append(slot)}
    const top=el('homeTop');top.replaceChildren();for(let [cat,value] of group.slice(0,5)){const line=document.createElement('div');line.className='top-line';const t=document.createElement('div');t.className='between';const name=document.createElement('span');name.textContent=cat;const n=document.createElement('b');n.textContent=(100*value/outgo).toFixed(0)+'%';t.append(name,n);const bar=document.createElement('div');bar.className='meter';const fill=document.createElement('div');fill.style.width=(value/group[0][1]*100)+'%';bar.append(fill);line.append(t,bar);top.append(line)}if(!group.length)top.textContent='Aún no hay gastos.';
    const now=new Date(),daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),forecast=Math.round(outgo/Math.max(1,now.getDate())*daysInMonth);
    drawUpcoming();
    safe('homeForecast',fmt(forecast));safe('homeAdvice',limit?`Proyección de gasto al final del mes. ${forecast>limit?'Podrías superar tu límite por '+fmt(forecast-limit):'Tu presupuesto estimado tendría '+fmt(limit-forecast)+' de margen.'}`:'Proyección según tus gastos registrados; define un presupuesto para compararla.');
  }
  el('budgetLimit').value=budget||'';el('saveBudget').onclick=()=>{const n=Number(el('budgetLimit').value);if(!Number.isFinite(n)||n<0)return alert('Escribe un importe válido.');try{budget=n;write('moni-budget-limit',budget);draw()}catch{alert('No se pudo guardar el presupuesto')}};
  function drawFixed(){
    const target=el('fixedList');target.replaceChildren();
    monthlyFixed().forEach(f=>{
      const d=document.createElement('div');d.className='itemline';
      const t=document.createElement('span');t.textContent=`${f.name} · ${fmt(f.cents)} · ${f.category} · día ${f.day} · ${paidLabel(f)}`;
      const add=document.createElement('button');add.textContent=wasPaid(f)?'✓ Pagado este mes':'Registrar pago';add.disabled=wasPaid(f);
      add.onclick=()=>registerFixedPayment(f);
      const del=document.createElement('button');del.textContent='Quitar';del.className='light-button';
      del.onclick=()=>{if(!confirm('¿Quitar esta plantilla? Los gastos ya registrados no se borrarán.'))return;fixed=fixed.filter(x=>x.id!==f.id);try{write('moni-fixed-templates',fixed);drawFixed();drawUpcoming()}catch{alert('No se pudo quitar la plantilla')}};
      d.append(t,add,del);target.append(d);
    });
    if(!fixed.length)target.textContent='Todavía no hay gastos fijos guardados.';
    drawUpcoming();
  }
  el('fixedForm').onsubmit=e=>{
    e.preventDefault();const name=el('fixedName').value.trim(),category=el('fixedCategory').value.trim(),cents=Math.round(Number(el('fixedAmount').value)*100),day=Number(el('fixedDay').value);
    if(!name||!category||!Number.isSafeInteger(cents)||cents<=0||!Number.isInteger(day)||day<1||day>31)return alert('Revisa los datos.');
    const entry={id:crypto.randomUUID(),name,category,cents,day};fixed.push(entry);
    try{write('moni-fixed-templates',fixed);e.target.reset();el('fixedDay').value='1';drawFixed()}catch{fixed.pop();alert('No se pudo guardar')}
  };
  function drawGoals(){const target=el('goalList');target.replaceChildren();goals.forEach((g,i)=>{const d=document.createElement('div');d.className='itemline goalitem';const label=document.createElement('strong');label.textContent=`${g.name} · ${fmt(g.saved)} / ${fmt(g.target)}`;const bar=document.createElement('div');bar.className='meter';const fill=document.createElement('div');fill.style.width=Math.min(100,100*g.saved/g.target)+'%';bar.append(fill);const amount=document.createElement('input');amount.type='number';amount.min='0.01';amount.step='0.01';amount.placeholder='Importe a abonar';amount.setAttribute('aria-label','Importe para '+g.name);const add=document.createElement('button');add.textContent='Añadir ahorro';add.onclick=()=>{let cents=Math.round(Number(amount.value)*100);if(!Number.isSafeInteger(cents)||cents<=0)return alert('Introduce un importe válido');g.saved+=cents;write('moni-savings-goals',goals);drawGoals();draw()};const del=document.createElement('button');del.textContent='Eliminar meta';del.className='light-button';del.onclick=()=>{if(!confirm('¿Eliminar esta meta de ahorro?'))return;goals.splice(i,1);write('moni-savings-goals',goals);drawGoals();draw()};d.append(label,bar,amount,add,del);target.append(d)});if(!goals.length)target.textContent='Todavía no tienes metas de ahorro.'}
  el('goalForm').onsubmit=e=>{e.preventDefault();const name=el('goalName').value.trim(),target=Math.round(Number(el('goalTarget').value)*100);if(!name||!Number.isSafeInteger(target)||target<=0)return alert('Revisa la meta');goals.push({name,target,saved:0});try{write('moni-savings-goals',goals);e.target.reset();drawGoals();draw()}catch{goals.pop();alert('No se pudo guardar')}};
  // The existing app.js render runs after every change; keep home tiles synchronized.
  const renderExisting=render;render=function(){renderExisting();draw()};
  drawFixed();drawGoals();draw();selectView('inicio');
})();
