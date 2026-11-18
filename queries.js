function moniQuery(phrase, records, now=today()) {
 const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const t=norm(phrase).replace(/[¿?¡!.,]/g,' ').replace(/\s+/g,' ').trim().replace(/^moni\s+/, '');
 if(!/^(cuant[oa]s?|cual|que|en que|dime|muestra|como|y el)\b/.test(t))return null;
 const cash=c=>(c/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 const result=(text)=>({text});
 if(/saldo|dinero me queda|dinero tengo|cuanto me queda/.test(t))return result('No conozco tu saldo disponible real. Puedes preguntarme cuánto has gastado o cuánto has recibido.');
 let date=new Date(now+'T12:00:00'), start='',end=now,label='en todo tu historial';
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 if(/\bhoy\b/.test(t)){start=now;label='hoy'}else if(/\bayer\b/.test(t)){date.setDate(date.getDate()-1);start=end=iso(date);label='ayer'}else if(/mes pasado|mes anterior/.test(t)){end=iso(new Date(date.getFullYear(),date.getMonth(),0));start=end.slice(0,7)+'-01';label='el mes pasado'}else if(/semana pasada|esta semana/.test(t)){date.setDate(date.getDate()-((date.getDay()+6)%7));if(/pasada/.test(t)){date.setDate(date.getDate()-7);let e=new Date(date);e.setDate(e.getDate()+6);end=iso(e);label='la semana pasada'}else label='esta semana';start=iso(date)}else if(/este ano|ano actual/.test(t)){start=now.slice(0,4)+'-01-01';label='este año'}else if(/este mes|mes actual|gastado mas|gasto mas/.test(t)){start=now.slice(0,7)+'-01';label='este mes'}else if(/ultimo[s]? \d+|ultimo[s]? mes|ano pasado|desde|entre|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto/.test(t))return result('Todavía no puedo interpretar ese periodo. Prueba hoy, este mes, el mes pasado o este año.');
 let income=/recibi|recibido|ingresos?|cobre|ganado/.test(t), ants=/hormiga/.test(t), top=/en que.*mas|mayor gasto|principales gastos|categorias/.test(t);
 if(!income&&!ants&&!top&&!/gast|pague|pagado|compr/.test(t))return result('Prueba preguntarme cuánto gastaste hoy o cuánto gastaste este mes.');
 let list=records.filter(r=>r.type===(income?'income':'expense')&&r.date>=start&&r.date<=end);
 if(ants)list=list.filter(r=>r.small);
 let subject=t.match(/(?:gast(?:e|ado|as|o)|pague|pagado|compre|gastos?)\s+en\s+(.+)/)?.[1];
 if(subject&&!top&&!ants){subject=subject.replace(/\b(hoy|ayer|este mes|mes pasado|mes anterior|esta semana|semana pasada|este ano|en total|todo el historial)\b/g,'').replace(/\b(el|la|los|las|de|en)\b/g,' ').trim().replace(/\s+/g,' ');if(subject){const aliases={'juguetes':'juguete','reparaciones':'reparacion','servicios':'servicio','cafes':'cafe'};let q=aliases[subject]||subject;list=list.filter(r=>[r.category,r.concept].some(s=>norm(s).includes(q)));}}
 if(top){let groups={};for(let r of list)groups[r.category]=(groups[r.category]||0)+r.cents;let ranked=Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,3);return {text:ranked.length?'Tus principales gastos '+label+' son: '+ranked.map(([k,v])=>k+', '+cash(v)).join('; ')+'.':'No hay gastos registrados '+label+'.',groups:ranked};}
 let total=list.reduce((s,r)=>s+r.cents,0);return result((income?'Tus ingresos':ants?'Tus gastos hormiga marcados':subject?'Tus gastos en '+subject:'Tus gastos')+' '+label+' suman '+cash(total)+', en '+list.length+' movimientos registrados.');
}
