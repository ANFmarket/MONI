// MONI 0.9.5 - Excel ejecutivo sin dependencias externas. Gráficas como imagen con leyendas externas.
const MX='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RX='http://schemas.openxmlformats.org/officeDocument/2006/relationships',PX='http://schemas.openxmlformats.org/package/2006/relationships';
const xml=s=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
const esc=s=>String(s??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function zipStore(files){const enc=new TextEncoder(), chunks=[],central=[];let offset=0,cs=0;const crc=b=>{let c=~0;for(let x of b){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return ~c>>>0};const pack=(n,fn)=>{let b=new Uint8Array(n);fn(new DataView(b.buffer));return b};for(let [name,value] of Object.entries(files)){let n=enc.encode(name),b=typeof value==='string'?enc.encode(value):value,c=crc(b);let h=pack(30,d=>{d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint32(14,c,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true)});let z=pack(46,d=>{d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,c,true);d.setUint32(20,b.length,true);d.setUint32(24,b.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true)});chunks.push(h,n,b);central.push(z,n);offset+=h.length+n.length+b.length;cs+=z.length+n.length}let end=pack(22,d=>{d.setUint32(0,0x06054b50,true);d.setUint16(8,central.length/2,true);d.setUint16(10,central.length/2,true);d.setUint32(12,cs,true);d.setUint32(16,offset,true)});return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
const exRel=(id,type,target)=>`<Relationship Id="${id}" Type="${RX}/${type}" Target="${target}"/>`;
const exRels=s=>xml(`<Relationships xmlns="${PX}">${s}</Relationships>`);
const exMoney=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
const exBytes=url=>Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));
function exGraph(groups,income,expense){
 const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=490;const g=canvas.getContext('2d');if(!g)return null;
 g.fillStyle='#ffffff';g.fillRect(0,0,1240,490);
 const colors=['#087c68','#18a48d','#4fc5b4','#79d8cb','#2f8ba7','#a4d9d0','#7fb3a7'];
 g.fillStyle='#075d50';g.font='bold 24px Arial';g.fillText('DISTRIBUCIÓN DE GASTOS',32,38);g.fillText('INGRESOS Y GASTOS',685,38);
 // Gráfica de dona: nunca colocar texto sobre los segmentos.
 const cx=200,cy=230,r=124,total=groups.reduce((a,b)=>a+b[1],0);let angle=-Math.PI/2;
 if(total){groups.slice(0,6).concat(groups.length>6?[['Otras categorías',groups.slice(6).reduce((a,b)=>a+b[1],0)]]:[]).forEach((row,i)=>{const part=2*Math.PI*row[1]/total;g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,r,angle,angle+part);g.closePath();g.fillStyle=colors[i%colors.length];g.fill();angle+=part;});}
 else{g.fillStyle='#e2efea';g.beginPath();g.arc(cx,cy,r,0,2*Math.PI);g.fill()}
 g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,77,0,2*Math.PI);g.fill();g.fillStyle='#607a76';g.textAlign='center';g.font='17px Arial';g.fillText('Total de gastos',cx,cy-8);g.fillStyle='#087c68';g.font='bold 20px Arial';g.fillText(exMoney(total),cx,cy+25);g.textAlign='left';
 const shown=groups.slice(0,6).concat(groups.length>6?[['Otras categorías',groups.slice(6).reduce((a,b)=>a+b[1],0)]]:[]);
 shown.forEach(([name,value],i)=>{const y=103+i*48;g.fillStyle=colors[i%colors.length];g.fillRect(359,y-13,13,13);g.fillStyle='#24383c';g.font='16px Arial';g.fillText(String(name).slice(0,20),382,y);g.fillStyle='#657b78';g.font='14px Arial';g.fillText(`${total?(100*value/total).toFixed(1):'0.0'}%  ·  ${exMoney(value)}`,382,y+18)});
 // Barras horizontales con cantidades legibles, sin ejes superpuestos.
 const max=Math.max(income,expense,1);[['INGRESOS',income,'#14a58c'],['GASTOS',expense,'#337f9e']].forEach(([label,value,color],i)=>{let y=150+i*142;g.font='bold 19px Arial';g.fillStyle='#263e3d';g.fillText(label,694,y);g.font='bold 24px Arial';g.fillStyle=color;g.fillText(exMoney(value),694,y+34);g.fillStyle='#e9f2ef';g.fillRect(694,y+50,485,24);g.fillStyle=color;g.fillRect(694,y+50,485*value/max,24)});
 const net=income-expense;g.font='bold 19px Arial';g.fillStyle=net>=0?'#087c68':'#b45151';g.fillText(`Diferencia: ${net<0?'−':'+'}${exMoney(Math.abs(net))}`,694,455);
 return exBytes(canvas.toDataURL('image/png'));
}
function makeExcel(all,rep,period,signature){
 const full=all.filter(r=>r.date>=rep.start&&r.date<=rep.end).sort((a,b)=>b.date.localeCompare(a.date));
 const income=sum(full.filter(r=>r.type==='income')),expense=rep.total,ants=rep.items.filter(r=>isAnt(r,all));
 const categories=rep.groups;
 const names=['Resumen','Movimientos','Categorías','Gastos hormiga'];
 const sheets=[
   [['INDICADOR','RESULTADO'],['Ingresos',income/100],['Gastos',expense/100],['Balance neto',(income-expense)/100],['Gastos hormiga',rep.ants/100],['Movimientos',full.length],['Promedio por gasto',rep.items.length?expense/100/rep.items.length:0]],
   [['Fecha','Concepto','Categoría','Tipo','Importe (MXN)'],...full.map(r=>[r.date,r.concept,r.category,r.type==='income'?'Ingreso':'Gasto',r.cents/100])],
   [['Categoría','Gasto (MXN)','Participación'],...categories.map(([k,v])=>[k,v/100,expense?v/expense:0])],
   [['Fecha','Concepto','Categoría','Importe (MXN)'],...ants.map(r=>[r.date,r.concept,r.category,r.cents/100])]
 ];
 const picture=signature instanceof Uint8Array?signature:null;
 let chart=null;try{chart=exGraph(categories,income,expense)}catch(e){console.warn('No fue posible preparar la gráfica de Excel',e)}
 const files={};files['_rels/.rels']=exRels(exRel('rId1','officeDocument','xl/workbook.xml'));
 files['xl/workbook.xml']=xml(`<workbook xmlns="${MX}" xmlns:r="${RX}"><sheets>${names.map((name,i)=>`<sheet name="${name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
 files['xl/_rels/workbook.xml.rels']=exRels(names.map((_,i)=>exRel('rId'+(i+1),'worksheet',`worksheets/sheet${i+1}.xml`)).join('')+exRel('rId5','styles','styles.xml'));
 files['xl/styles.xml']=xml(`<styleSheet xmlns="${MX}"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Aptos"/><color rgb="FF263D3C"/></font><font><b/><sz val="11"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="19"/><name val="Aptos"/><color rgb="FF087C68"/></font><font><b/><sz val="12"/><name val="Aptos"/><color rgb="FF075D50"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF087C68"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F7F2"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf fontId="0" fillId="0" borderId="0" xfId="0" numFmtId="164" applyNumberFormat="1"/><xf fontId="0" fillId="3" borderId="0" xfId="0" numFmtId="164" applyFill="1" applyNumberFormat="1"/><xf fontId="0" fillId="0" borderId="0" xfId="0" numFmtId="10" applyNumberFormat="1"/><xf fontId="0" fillId="3" borderId="0" xfId="0" numFmtId="10" applyNumberFormat="1" applyFill="1"/><xf fontId="3" fillId="3" borderId="0" xfId="0" numFmtId="164" applyNumberFormat="1" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
 const col=n=>String.fromCharCode(65+n),c=(v,r,j,style)=>typeof v==='number'?`<c r="${col(j)}${r}" s="${style}"><v>${v}</v></c>`:`<c r="${col(j)}${r}" s="${style}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
 const D='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',A='http://schemas.openxmlformats.org/drawingml/2006/main';
 const pictureAnchor=(row,id,relid,colIdx=2,w=1714500,h=500000)=>`<xdr:oneCellAnchor><xdr:from><xdr:col>${colIdx}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${id===2?'Gráficas ejecutivas':'Firma ANF'}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
 const contentTypes=[];
 sheets.forEach((table,i)=>{
   const head=i===0,cols=i===0?8:table[0].length,merges=[],records=[];
   const row=(r,h,value)=>records.push(`<row r="${r}" ht="${h}" customHeight="1">${value}</row>`);
   const merge=(r,from,to,v,style)=>{merges.push(`${col(from)}${r}:${col(to)}${r}`);return c(v,r,from,style)};
   row(2,42,merge(2,1,head?7:cols,`MONI  /  ${names[i].toUpperCase()}`,1));
   row(3,24,merge(3,1,head?7:cols,`${period} · ${rep.start||'Inicio'} a ${rep.end}`,0));
   row(4,22,merge(4,1,head?7:cols,'Reporte ejecutivo · MONI versión 0.9.5',0));
   const headerRow=6;
   if(head){
     const labels=[['INGRESOS',income/100],['GASTOS',expense/100],['BALANCE NETO',(income-expense)/100],['GASTOS HORMIGA',rep.ants/100]];
     labels.forEach(([name,val],k)=>{const start=k%2?5:1,end=start+2,r=6+Math.floor(k/2)*3;row(r,24,merge(r,start,end,name,1));row(r+1,37,merge(r+1,start,end,val,8))});
     row(13,30,merge(13,1,7,'ANÁLISIS DE GASTOS · RESUMEN VISUAL',2));
     row(41,26,merge(41,1,7,'DETALLE FINANCIERO',2));
     sheets[0].slice(1).forEach(([label,value],idx)=>{const r=43+idx;row(r,25,c(label,r,1,idx%2?3:0)+c(value,r,4,idx%2?5:4))});
   }else{
     table.forEach((line,k)=>{const r=k+6;row(r,k===0?32:28,line.map((v,j)=>{const moneyCol=i===1?4:i===2?1:3;let style=k===0?1:(k%2===0?3:0);if(k>0&&typeof v==='number')style=i===2&&j===2?(k%2===0?7:6):j===moneyCol?(k%2===0?5:4):style;return c(v,r,j+1,style)}).join(''))});
   }
   const footerRow=head?52:table.length+11;
   const hasDraw=!!picture||(head&&!!chart);
   const widths=head?[3,19,17,17,3,18,17,17,3]:i===1?[3,17,42,27,17,22,3]:i===2?[3,37,22,22,3]:[3,17,42,28,24,3];
   files[`xl/worksheets/sheet${i+1}.xml`]=xml(`<worksheet xmlns="${MX}" xmlns:r="${RX}"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><cols>${widths.map((w,j)=>`<col min="${j+1}" max="${j+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${records.join('')}</sheetData>${!head?`<autoFilter ref="B6:${col(cols)}${Math.max(6,table.length+5)}"/>`:''}<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>${hasDraw?'<drawing r:id="rId1"/>':''}</worksheet>`);
   if(hasDraw){
     files[`xl/worksheets/_rels/sheet${i+1}.xml.rels`]=exRels(exRel('rId1','drawing',`../drawings/drawing${i+1}.xml`));
     const pictures=[];const links=[];
     if(head&&chart){pictures.push(pictureAnchor(14,2,'rId1',1,10800000,4290000));links.push(exRel('rId1','image','../media/analisis.png'))}
     if(picture){pictures.push(pictureAnchor(footerRow,3,head&&chart?'rId2':'rId1',head?3:2));links.push(exRel(head&&chart?'rId2':'rId1','image','../media/firma-anf.png'))}
     files[`xl/drawings/drawing${i+1}.xml`]=xml(`<xdr:wsDr xmlns:xdr="${D}" xmlns:a="${A}" xmlns:r="${RX}">${pictures.join('')}</xdr:wsDr>`);
     files[`xl/drawings/_rels/drawing${i+1}.xml.rels`]=exRels(links.join(''));
     contentTypes.push(`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
   }
 });
 if(picture)files['xl/media/firma-anf.png']=picture;
 if(chart)files['xl/media/analisis.png']=chart;
 files['[Content_Types].xml']=xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${['xl/workbook.xml','xl/styles.xml',...names.map((_,i)=>`xl/worksheets/sheet${i+1}.xml`)].map((file,i)=>`<Override PartName="/${file}" ContentType="application/vnd.openxmlformats-officedocument.${i===0?'spreadsheetml.sheet.main':i===1?'spreadsheetml.styles':'spreadsheetml.worksheet'}+xml"/>`).join('')}${contentTypes.join('')}</Types>`);
 return zipStore(files);
}
async function downloadExcel(){try{const response=await fetch('firma-anf.png?v=095');if(!response.ok)throw Error('Firma no disponible');const signature=new Uint8Array(await response.arrayBuffer()),p=document.getElementById('period'),rep=report(rows,p.value),blob=makeExcel(rows,rep,p.selectedOptions[0].textContent,signature),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MONI-0.9.5-reporte-'+today()+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}catch(e){console.error(e);alert('No se pudo exportar el Excel. Revisa la firma y vuelve a intentar.')}}
