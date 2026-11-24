// Standalone OOXML writer: no network dependency.
const MX='http://schemas.openxmlformats.org/spreadsheetml/2006/main', RX='http://schemas.openxmlformats.org/officeDocument/2006/relationships', PX='http://schemas.openxmlformats.org/package/2006/relationships';
const xml=s=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
const esc=s=>String(s??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function zipStore(files){const enc=new TextEncoder(), chunks=[],central=[];let offset=0,cs=0;const crc=b=>{let c=~0;for(let x of b){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return ~c>>>0};const pack=(n,fn)=>{let b=new Uint8Array(n);fn(new DataView(b.buffer));return b};for(let [name,value] of Object.entries(files)){let n=enc.encode(name),b=typeof value==='string'?enc.encode(value):value,c=crc(b);let h=pack(30,d=>{d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint32(14,c,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true)});let z=pack(46,d=>{d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,c,true);d.setUint32(20,b.length,true);d.setUint32(24,b.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true)});chunks.push(h,n,b);central.push(z,n);offset+=h.length+n.length+b.length;cs+=z.length+n.length}let end=pack(22,d=>{d.setUint32(0,0x06054b50,true);d.setUint16(8,central.length/2,true);d.setUint16(10,central.length/2,true);d.setUint32(12,cs,true);d.setUint32(16,offset,true)});return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}

function makeExcel(all,rep,period,signature){
  let items=rep.items,
      ants=items.filter(r=>isAnt(r,all)),
      rowsInPeriod=all.filter(r=>r.date>=rep.start&&r.date<=rep.end).sort((a,b)=>b.date.localeCompare(a.date));
  let names=['Resumen','Movimientos','Categorías','Gastos hormiga'];
  let data=[
    [['Indicador','Importe / cantidad'],['Gastos',rep.total/100],['Ingresos',sum(rowsInPeriod.filter(r=>r.type==='income'))/100],['Movimientos',rowsInPeriod.length],['Promedio por gasto',items.length?rep.total/100/items.length:0],['Gastos hormiga',rep.ants/100]],
    [['Fecha','Concepto','Categoría','Tipo','Importe (MXN)'],...rowsInPeriod.map(r=>[r.date,r.concept,r.category,r.type==='income'?'Ingreso':'Gasto',r.cents/100])],
    [['Categoría','Gasto (MXN)','Porcentaje'],...rep.groups.map(([k,v])=>[k,v/100,rep.total?v/rep.total:0])],
    [['Fecha','Concepto','Categoría','Importe (MXN)'],...ants.map(r=>[r.date,r.concept,r.category,r.cents/100])]
  ];

  let f={};
  let rel=(id,type,target)=>`<Relationship Id="${id}" Type="${RX}/${type}" Target="${target}"/>`;
  let rels=s=>xml(`<Relationships xmlns="${PX}">${s}</Relationships>`);

  f['_rels/.rels']=rels(rel('rId1','officeDocument','xl/workbook.xml'));
  f['xl/workbook.xml']=xml(`<workbook xmlns="${MX}" xmlns:r="${RX}"><sheets>${names.map((n,i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
  f['xl/_rels/workbook.xml.rels']=rels(names.map((n,i)=>rel('rId'+(i+1),'worksheet',`worksheets/sheet${i+1}.xml`)).join('')+rel('rId5','styles','styles.xml'));

  let xf=(font,fill,num=0)=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center" horizontal="${[1,3,4].includes(font)?'center':'general'}" wrapText="1"/></xf>`;
  f['xl/styles.xml']=xml(`<styleSheet xmlns="${MX}"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="5"><font><sz val="11"/><name val="Calibri"/><color rgb="FF24383C"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="20"/><color rgb="FF087C68"/><name val="Calibri"/></font><font><b/><sz val="23"/><color rgb="FF075F55"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF647B76"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF087C68"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0F8F4"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13">${xf(0,0)+xf(1,2)+xf(2,0)+xf(0,3)+xf(0,0,164)+xf(0,3,164)+xf(0,0,10)+xf(0,3,10)+xf(3,3,164)+xf(3,3)+xf(4,0)+xf(1,2,164)+xf(1,2,10)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);

  let col=j=>String.fromCharCode(65+j);
  let cell=(v,r,j,s)=>typeof v==='number'
    ? `<c r="${col(j)}${r}" s="${s}"><v>${v}</v></c>`
    : `<c r="${col(j)}${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;

  let chart=rep.groups.length>0;
  let chartEnd=16+Math.max(14,rep.groups.length*2);
  let signatureRows={};

  data.forEach((table,i)=>{
    let widths=[[3,16,16,16,3,16,16,16,3],[3,16,42,24,15,22,3],[3,36,28,24,3],[3,16,42,24,22,3]][i],
        last=col(widths.length-2),
        merges=[],content='';

    let row=(r,h,c)=>{content+=`<row r="${r}" ht="${h}" customHeight="1">${c}</row>`};
    let merged=(r,a,b,v,style)=>{merges.push(`${col(a)}${r}:${col(b)}${r}`);return Array.from({length:b-a+1},(_,k)=>cell(k?'':v,r,a+k,style)).join('')};
    let span=widths.length-2;

    row(2,38,merged(2,1,span,'MONI  |  '+names[i].toUpperCase(),1));
    row(3,25,merged(3,1,span,period+' · '+(rep.start||'Inicio')+' a '+rep.end,10));
    row(4,22,merged(4,1,span,'Generado: '+new Date().toLocaleString('es-MX'),10));

    let footerRow;
    if(i===0){
      let labels=['GASTOS TOTALES','INGRESOS','MOVIMIENTOS','PROMEDIO POR GASTO','GASTOS HORMIGA'];
      let vals=table.slice(1).map(x=>x[1]);
      for(let k=0;k<3;k++){
        let r=6+k*3;let left=k*2,right=left+1;
        row(r,23,merged(r,1,3,labels[left],1)+(right<5?merged(r,5,7,labels[right],1):''));
        row(r+1,39,merged(r+1,1,3,vals[left],left===2?9:8)+(right<5?merged(r+1,5,7,vals[right],right===2?9:8):''));
      }
      if(chart) row(15,28,merged(15,1,span,'ANÁLISIS DE GASTOS · DISTRIBUCIÓN Y COMPARATIVA',2));
      else row(15,28,merged(15,1,span,'Sin gastos en este periodo',10));
      footerRow=chart?chartEnd+3:17;
    } else {
      table.forEach((line,k)=>{
        let r=k+6;
        row(r,k===0?29:36,line.map((v,j)=>{
          let alt=k%2===0;
          let st=k===0?1:typeof v!=='number'?(alt?3:0):i===2&&j===2?(alt?7:6):(alt?5:4);
          return cell(v,r,j+1,st)
        }).join(''))
      });
      let lastRow=table.length+5,r=lastRow+1,j=i===1?5:i===2?2:4,total=table.slice(1).reduce((a,b)=>a+Number(b[j-1]),0);
      row(r,30,
        cell(i===1?'Total sin signo':'TOTAL',r,1,1)+
        `<c r="${col(j)}${r}" s="11">${table.length>1?`<f>SUM(${col(j)}7:${col(j)}${lastRow})</f>`:''}<v>${total}</v></c>`+
        (i===2?`<c r="D${r}" s="12"><v>${rep.total?1:0}</v></c>`:'')
      );
      footerRow=r+3;
    }

    signatureRows[i+1]=footerRow;

    const needsDrawing = Boolean(signature) || (chart && i===0);
    const drawingTag = needsDrawing ? `<drawing r:id="rId1"/>` : '';
    f[`xl/worksheets/sheet${i+1}.xml`]=xml(`<worksheet xmlns="${MX}" xmlns:r="${RX}"><sheetPr><tabColor rgb="FF087C68"/><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0">${i?'<pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/>':''}</sheetView></sheetViews><cols>${widths.map((w,j)=>`<col min="${j+1}" max="${j+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${content}</sheetData>${i?`<autoFilter ref="B6:${last}${table.length+5}"/>`:''}<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="${i?0:1}"/>${drawingTag}</worksheet>`);

    if(needsDrawing){
      f[`xl/worksheets/_rels/sheet${i+1}.xml.rels`] = rels(rel('rId1','drawing',`../drawings/drawing${i+1}.xml`));
    }
  });

  if(signature){
    const D='http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
    const A='http://schemas.openxmlformats.org/drawingml/2006/main';
    const C='http://schemas.openxmlformats.org/drawingml/2006/chart';
    const extent='cx="1476375" cy="417604"';
    const picAnchor=(rowNum,embedId,picId=3)=>`<xdr:oneCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${rowNum}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext ${extent}/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${picId}" name="Firma ANF"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${embedId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext ${extent}/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;

    const chartAnchor = chart ? `<xdr:twoCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>15</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chartEnd}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Gastos por categoría"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${C}"><c:chart xmlns:c="${C}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor><xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>15</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chartEnd}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="4" name="Ingresos contra gastos"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${C}"><c:chart xmlns:c="${C}" r:id="rId3"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>` : '';

    // Sheet 1: chart + signature, or only signature.
    f['xl/drawings/drawing1.xml']=xml(`<xdr:wsDr xmlns:xdr="${D}" xmlns:a="${A}" xmlns:r="${RX}">${chartAnchor}${picAnchor(signatureRows[1], chart?'rId2':'rId1', 3)}</xdr:wsDr>`);
    f['xl/drawings/_rels/drawing1.xml.rels']=rels((chart?rel('rId1','chart','../charts/chart1.xml')+rel('rId3','chart','../charts/chart2.xml'):'')+rel(chart?'rId2':'rId1','image','../media/firma-anf.png'));

    // Sheets 2-4: only signature image.
    for(let sheet=2; sheet<=4; sheet++){
      f[`xl/drawings/drawing${sheet}.xml`]=xml(`<xdr:wsDr xmlns:xdr="${D}" xmlns:a="${A}" xmlns:r="${RX}">${picAnchor(signatureRows[sheet],'rId1',2)}</xdr:wsDr>`);
      f[`xl/drawings/_rels/drawing${sheet}.xml.rels`]=rels(rel('rId1','image','../media/firma-anf.png'));
    }

    f['xl/media/firma-anf.png']=signature;

    if(chart){
      const end=rep.groups.length+6;
      const pctColors=['087C68','139F91','40D8C5','61B7A7','92D7CA','397F9A','A6C9D8','C7EDE5','70AFA1','AEC5C0'];
      const categoryPts=rep.groups.map(([name],i)=>`<c:pt idx="${i}"><c:v>${esc(name)}</c:v></c:pt>`).join('');
      const amountPts=rep.groups.map(([,amount],i)=>`<c:pt idx="${i}"><c:v>${amount/100}</c:v></c:pt>`).join('');
      const pieces=rep.groups.map((_,i)=>`<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${pctColors[i%pctColors.length]}"/></a:solidFill></c:spPr></c:dPt>`).join('');
      f['xl/charts/chart1.xml']=xml(`<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-MX" sz="1300" b="1"/><a:t>Gastos por categoría</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:layout/><c:doughnutChart><c:holeSize val="57"/><c:firstSliceAng val="270"/><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>${pieces}<c:cat><c:strRef><c:f>'Categorías'!$B$7:$B$${end}</c:f><c:strCache><c:ptCount val="${rep.groups.length}"/>${categoryPts}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>'Categorías'!$C$7:$C$${end}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${rep.groups.length}"/>${amountPts}</c:numCache></c:numRef></c:val><c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showPercent val="1"/></c:dLbls></c:ser></c:doughnutChart></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`);
      const income=sum(rowsInPeriod.filter(r=>r.type==='income'))/100,expense=rep.total/100;
      f['xl/charts/chart2.xml']=xml(`<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-MX" sz="1300" b="1"/><a:t>Ingresos vs. gastos</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="139F91"/></a:solidFill></c:spPr></c:dPt><c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="397F9A"/></a:solidFill></c:spPr></c:dPt><c:cat><c:strLit><c:ptCount val="2"/><c:pt idx="0"><c:v>Ingresos</c:v></c:pt><c:pt idx="1"><c:v>Gastos</c:v></c:pt></c:strLit></c:cat><c:val><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>${income}</c:v></c:pt><c:pt idx="1"><c:v>${expense}</c:v></c:pt></c:numLit></c:val></c:ser><c:gapWidth val="90"/><c:axId val="10"/><c:axId val="20"/></c:barChart><c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="20"/></c:catAx><c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="10"/><c:crosses val="autoZero"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`);
    }
  }

  let overrides={
    'xl/workbook.xml':'spreadsheetml.sheet.main',
    'xl/styles.xml':'spreadsheetml.styles',
    ...Object.fromEntries(names.map((n,i)=>[`xl/worksheets/sheet${i+1}.xml`,'spreadsheetml.worksheet']))
  };

  const drawingOverrides = signature
    ? [1,2,3,4].map(n=>`<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('')
    : '';
  const chartOverride = chart ? '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>' : '';
  const pngDefault = signature ? '<Default Extension="png" ContentType="image/png"/>' : '';

  f['[Content_Types].xml']=xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${pngDefault}${Object.entries(overrides).map(([p,t])=>`<Override PartName="/${p}" ContentType="application/vnd.openxmlformats-officedocument.${t}+xml"/>`).join('')}${drawingOverrides}${chartOverride}</Types>`);
  return zipStore(f)
}

async function downloadExcel(){
  let signature;
  try {
    const response = await fetch('firma-anf.png');
    if (!response.ok) throw new Error('Firma no disponible');
    signature = new Uint8Array(await response.arrayBuffer());
  } catch {
    alert('No se pudo cargar la firma ANF. Intenta exportar de nuevo.');
    return;
  }
  let p=document.getElementById('period'),rep=report(rows,p.value),url=URL.createObjectURL(makeExcel(rows,rep,p.selectedOptions[0].textContent,signature));
  let a=document.createElement('a');
  a.href=url;
  a.download='MONI-reporte-0.9.4-'+today()+'.xlsx';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
