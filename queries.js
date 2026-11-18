function moniQuery(phrase,records,now=today()){
 const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 let t=norm(phrase).replace(/[¿?¡!.,]/g,' ').replace(/\s+/g,' ').trim().replace(/^moni\s+/,'');
 if(!/^(cuant\w*|cual|que|en que|dime|muestra\w*|como|cuando|y el|me puedes decir|he gastado|compara|comparativa|este mes|esta quincena)\b/.test(t))return null;
 const fail=()=>({text:'No entendí tu consulta. Prueba cuánto gasté en café este mes, o cuál fue mi gasto más grande.'});
 if(/saldo|dinero me queda|dinero tengo|cuanto me queda/.test(t))return {text:'No conozco tu saldo real. Solo puedo consultar tus movimientos registrados.'};
 let d=new Date(now+'T12:00:00'),start='',end=now,label='en tu historial';const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const half=(date)=>{let y=date.getFullYear(),m=date.getMonth(),h=date.getDate()>15?16:1;return new Date(y,m,h,12)};
 const previousHalf=(date)=>{let h=half(date);h.setDate(h.getDate()-1);return half(h)};
 const rangeTotal=(a,b)=>sum(records.filter(r=>r.type==='expense'&&r.date>=a&&r.date<=b));
 if(/(?:compar|mas|menos|diferencia|respecto)/.test(t)&&(/mes pasado|mes anterior|quincena pasada|quincena anterior|comparativa mensual|comparativa quincenal|que (?:el|la) (?:anterior|pasad[oa])/.test(t))&&/gast|compar|diferencia/.test(t)){
  let q=/quincen/.test(t),a=q?half(d):new Date(d.getFullYear(),d.getMonth(),1,12),p=q?previousHalf(d):new Date(d.getFullYear(),d.getMonth()-1,1,12),limit=new Date(a);limit.setDate(limit.getDate()-1);let pe=new Date(p);pe.setDate(pe.getDate()+d.getDate()-a.getDate());if(pe>limit)pe=limit;let x=rangeTotal(iso(a),now),y=rangeTotal(iso(p),iso(pe)),diff=x-y;
  return {text:'En '+(q?'esta quincena':'este mes')+' llevas '+money(x)+'. En los mismos días del periodo anterior gastaste '+money(y)+'. '+(diff===0?'El gasto es igual.':'Has gastado '+money(Math.abs(diff))+(diff>0?' más.':' menos.'))};
 }
 const periods=/\b(hoy|ayer|esta semana|la semana pasada|semana pasada|este mes|mes actual|el mes pasado|mes pasado|mes anterior|este ano|ano actual|todo el historial|esta quincena|quincena actual|la quincena pasada|quincena pasada|quincena anterior)\b/g;
 if(/quincena pasada|quincena anterior/.test(t)){start=iso(previousHalf(d));let e=half(d);e.setDate(e.getDate()-1);end=iso(e);label="la quincena pasada"}else if(/esta quincena|quincena actual/.test(t)){start=iso(half(d));label="esta quincena"}else if(/\bhoy\b/.test(t)){start=now;label='hoy'}else if(/\bayer\b/.test(t)){d.setDate(d.getDate()-1);start=end=iso(d);label='ayer'}else if(/mes pasado|mes anterior/.test(t)){end=iso(new Date(d.getFullYear(),d.getMonth(),0));start=end.slice(0,7)+'-01';label='el mes pasado'}else if(/semana pasada|esta semana/.test(t)){d.setDate(d.getDate()-(d.getDay()+6)%7);if(/pasada/.test(t)){d.setDate(d.getDate()-7);let e=new Date(d);e.setDate(e.getDate()+6);end=iso(e);label='la semana pasada'}else label='esta semana';start=iso(d)}else if(/este ano|ano actual/.test(t)){start=now.slice(0,4)+'-01-01';label='este año'}else if(/este mes|mes actual/.test(t)){start=now.slice(0,7)+'-01';label='este mes'}
 let s=t.replace(periods,'').replace(/\s+/g,' ').trim();
 let mode='total',subject='',income=false,ants=false;
 s=s.replace(/^(?:dime|me puedes decir) (?:por favor )?/, '').replace(/ por favor$/, '');
 s=s.replace(/^(cuanto) (?:llevo gastado|he gastado|me he gastado|se me ha ido)/,'$1 gaste');
 if(/^(?:en que (?:he )?gast(?:e|ado|o|amos) mas(?: dinero)?|cuales son mis principales gastos)$/.test(s))mode='top';
 else if(/^(?:cual (?:fue|es|ha sido) (?:mi|el|la) (?:gasto mas grande|compra mas cara|mayor gasto|gasto mas alto))$/.test(s))mode='max';
 else if(/^(?:cual fue mi ultimo gasto|cual es mi ultimo gasto)$/.test(s))mode='last';
 else {let m=s.match(/^(?:cuanto|dime cuanto) (?:dinero )?(?:(?:he |llevo |hemos )?gast(?:e|ado|o|amos)|(?:se me ha ido)|llevo)(?: (?:dinero|en total))?(?: en (.+))?$/);if(m){subject=m[1]||'';if(subject==='promedio'){mode='avg';subject=''}else if(subject.startsWith('promedio en ')){mode='avg';subject=subject.slice(12)}}else if((m=s.match(/^cuantas veces (?:compre|he comprado|pague|cargue) (.+)$/))){mode='count';subject=m[1]}else if((m=s.match(/^cuanto (?:gasto|gaste) en promedio(?: en (.+))?$/))){mode='avg';subject=m[1]||''}else if(/^cuanto (?:dinero )?(?:he recibido|recibi|ingrese)$/.test(s)||/^cuanto(?:s)? ingresos(?: tengo)?$/.test(s))income=true;else return fail();}
 if(subject){subject=subject.replace(/^(?:el|la|los|las|un|una) /,'');if(/^(?:gastos )?hormiga$/.test(subject)){ants=true;subject=''}}
 const aliases={cafes:'cafe',juguetes:'juguete',reparaciones:'reparacion',servicios:'servicio'};const key=aliases[subject]||subject;
 let list=records.filter(r=>r.type===(income?'income':'expense')&&r.date>=start&&r.date<=end);
 if(ants)list=list.filter(r=>isAnt(r,records));if(key)list=list.filter(r=>[r.concept,r.category].some(x=>norm(x).includes(key)));
 if(mode==='max'||mode==='last'){list=[...list].sort((a,b)=>mode==='max'?b.cents-a.cents:b.date.localeCompare(a.date)||records.indexOf(b)-records.indexOf(a)).slice(0,1)}
 let total=sum(list),name=income?'ingresos':ants?'gastos hormiga':subject?'gastos en '+subject:'gastos';
 if(!list.length)return {text:'No encontré movimientos de '+name+' '+label+'.',items:[]};
 let groups=new Map();for(let r of list)groups.set(r.category,(groups.get(r.category)||0)+r.cents);let ranked=[...groups].sort((a,b)=>b[1]-a[1]);
 let text=mode==='top'?'Tus principales gastos '+label+' son '+ranked.slice(0,3).map(([k,v])=>k+', '+money(v)).join('; ')+'.':(mode==='max'||mode==='last')?(()=>{let r=[...list].sort((a,b)=>b.cents-a.cents)[0];return (mode==='max'?'Tu gasto más grande ':'Tu último gasto ')+label+' fue '+r.concept+', '+money(r.cents)+', del '+r.date+'.'})():mode==='count'?'Encontré '+list.length+' movimientos de '+name+' '+label+'.':mode==='avg'?'Tu promedio por movimiento '+label+' es '+money(total/list.length)+'.':'Tus '+name+' '+label+' suman '+money(total)+', en '+list.length+' movimientos registrados.';
 return {text,items:list,groups:ranked,total};
}
