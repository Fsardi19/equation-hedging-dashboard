const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, ExternalHyperlink,
  TableOfContents,
} = require('docx');

// ---------- Paleta de marca ----------
const TEAL = '1A383F', TEAL2 = '24505A', TAN = 'C9B9A1', SAND = 'EFEBE1',
      INK = '252524', GRAY = '6A6A6A', GREEN = '2F6B4F', BRICK = 'B4522E', LINE = 'D8CFBC';
const SERIF = 'Georgia', SANS = 'Calibri';

// ---------- Helpers ----------
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 }, ...opts,
  children: Array.isArray(text) ? text : [new TextRun({ text, font: SANS, size: 22, color: INK })],
});
const runs = (arr) => new Paragraph({ spacing: { after: 120, line: 276 }, children: arr });
const R = (text, o = {}) => new TextRun({ text, font: SANS, size: 22, color: INK, ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const bullet = (text) => new Paragraph({
  numbering: { reference: 'b', level: 0 }, spacing: { after: 70, line: 268 },
  children: Array.isArray(text) ? text : [new TextRun({ text, font: SANS, size: 22, color: INK })],
});
const spacer = (h = 80) => new Paragraph({ spacing: { after: h }, children: [] });

// Callout / conclusion box (single-cell shaded table)
function callout(label, bodyRuns, accent = TEAL, fill = SAND) {
  return new Table({
    columnWidths: [9360], width: { size: 9360, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: fill }, bottom: { style: BorderStyle.SINGLE, size: 2, color: fill },
      right: { style: BorderStyle.SINGLE, size: 2, color: fill }, left: { style: BorderStyle.SINGLE, size: 24, color: accent },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill, type: ShadingType.CLEAR }, margins: { top: 140, bottom: 140, left: 220, right: 200 },
      width: { size: 9360, type: WidthType.DXA },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: label, font: SANS, size: 18, bold: true, color: accent, allCaps: true })] }),
        new Paragraph({ spacing: { after: 0, line: 272 }, children: bodyRuns }),
      ],
    })] })],
  });
}

// Generic table with teal header
function tbl(widths, headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: LINE };
  const cellB = { top: border, bottom: border, left: border, right: border };
  const headRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: cellB, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: TEAL, type: ShadingType.CLEAR }, verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: SANS, size: 19 })] })],
    })),
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => new TableCell({
      borders: cellB, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: ri % 2 ? 'FBFAF6' : 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 70, bottom: 70, left: 120, right: 120 }, verticalAlign: VerticalAlign.CENTER,
      children: (Array.isArray(c) ? c : [c]).map(txt =>
        typeof txt === 'string'
          ? new Paragraph({ spacing: { after: 0, line: 260 }, children: [new TextRun({ text: txt, font: SANS, size: 19, color: INK })] })
          : txt),
    })),
  }));
  return new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows: [headRow, ...bodyRows] });
}

const link = (text, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: 'Hyperlink', font: SANS, size: 19 })] });

// ---------- Cover ----------
const cover = [
  new Paragraph({ spacing: { before: 1600, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'EQUATION COFFEE', font: SERIF, size: 34, bold: true, color: TEAL, characterSpacing: 60 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'COLOMBIA', font: SANS, size: 18, color: TAN, characterSpacing: 120 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 60 },
    children: [new TextRun({ text: 'Política de Gestión de Riesgos de Mercado', font: SERIF, size: 48, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: 'y Coberturas', font: SERIF, size: 48, bold: true, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 },
    children: [new TextRun({ text: 'Riesgo de Precio (Contrato «C»)  ·  Diferencial de Origen  ·  Riesgo Cambiario (FX)', font: SERIF, italics: true, size: 24, color: GRAY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 40 },
    children: [new TextRun({ text: 'Versión 1.0 — Borrador para socialización', font: SANS, size: 22, bold: true, color: TEAL2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: '27 de agosto de 2026', font: SANS, size: 20, color: GRAY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900 },
    children: [new TextRun({ text: 'DOCUMENTO CONFIDENCIAL — USO INTERNO', font: SANS, size: 16, color: GRAY, characterSpacing: 40 })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------- Contenido ----------
const body = [
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Contenido', font: SERIF, size: 30, bold: true, color: TEAL })] }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),

  H1('1. Objetivo y alcance'),
  P('Esta política define cómo Equation Coffee identifica, mide y cubre los tres riesgos de mercado inherentes a su operación de comercialización física de café: (i) el precio del café (Contrato «C» de ICE), (ii) el diferencial de origen y (iii) el riesgo cambiario (COP/USD). Establece, para cada riesgo, su naturaleza, el momento en que nace, si es cubrible o no, los instrumentos aplicables y las prácticas de referencia del mercado internacional.'),
  P('Aplica a todas las operaciones de compra de café en Colombia y de venta a clientes en el exterior (FOB y SPOT), a las ventas nacionales, y a las operaciones con financiación (factoring). Su propósito es proteger el margen comercial y el flujo de caja de la compañía, no especular sobre la dirección de los mercados.'),

  H1('2. Resumen ejecutivo'),
  P('Los tres riesgos son de naturaleza distinta y se gestionan de forma distinta. La siguiente matriz resume las conclusiones de la política:'),
  tbl([1900, 1500, 2600, 3360],
    ['Riesgo', '¿Cubrible?', 'Instrumento', 'Gestión'],
    [
      ['Precio — Contrato «C»', 'Sí', 'Futuros KC; opciones (put/collar)', 'Cobertura ~1:1 sobre la posición física, neteando compra/venta. Riesgo clave: liquidez por llamados a margen.'],
      ['Diferencial de origen', 'No', 'No existe instrumento líquido', 'Gestión 100% operativa: calce de ambas puntas (PTBF), límites de exposición abierta y de plazo, diversificación.'],
      ['Cambiario — TRM', 'Sí', 'Forward / NDF USD-COP; opciones', 'Nace al fijar la compra en COP. Cubrir el margen (no el nocional), con vencimiento al recaudo. Política dinámica por banda de TRM.'],
    ]),
  spacer(),
  callout('Conclusión central', [
    R('Dos de los tres riesgos se cubren con instrumentos financieros (precio y FX); el ', {}),
    R('diferencial no es cubrible', { bold: true }),
    R(' y se neutraliza operativamente. El mayor riesgo del programa de coberturas no es de precio, sino de ', {}),
    R('liquidez (llamados a margen)', { bold: true }),
    R('. La cobertura cambiaria protege el ', {}),
    R('margen y los costos fijos en COP', { bold: true }),
    R(', no el valor total del contenedor.', {}),
  ]),

  H1('3. Principios rectores'),
  bullet([R('Separar los tres riesgos: ', { bold: true }), R('precio, diferencial y cambiario se identifican, miden y gestionan por separado; nunca se confunden ni se sobre-cubren.')]),
  bullet([R('Cubrir, no especular: ', { bold: true }), R('el objetivo es blindar el margen y el flujo de caja. Toda posición de derivados debe corresponder a una exposición física o comprometida real.')]),
  bullet([R('Cubrir el margen, no el nocional: ', { bold: true }), R('se cubre el monto expuesto (margen y costos fijos en COP), no el 100% del valor de la operación.')]),
  bullet([R('Sincronizar con el flujo real: ', { bold: true }), R('las coberturas se abren cuando nace la exposición y vencen cuando se liquida (recaudo / entrega física).')]),
  bullet([R('Gobierno y disciplina: ', { bold: true }), R('política escrita, límites por escrito, control de cupos de crédito y comité de riesgo. La disciplina es lo que separa una estrategia responsable de una especulación disfrazada de cobertura.')]),

  // ---------- RIESGO 1 ----------
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('4. Riesgo de Precio del Café (Contrato «C»)')] }),
  H2('4.1 Definición y cuándo nace'),
  P('El precio del café se cotiza en el Contrato «C» de ICE (café suave arábico, US¢/lb). Es la variable más volátil del negocio. El riesgo nace en el instante en que se fija el precio de una punta (compra o venta) sin la otra: al comprar físico se queda largo (pierde si el «C» baja); al vender físico se queda corto (pierde si el «C» sube).'),
  H2('4.2 Conclusión'),
  callout('Cubrible — SÍ', [R('El riesgo de precio '), R('se cubre con futuros KC', { bold: true }), R(' en una relación aproximada 1:1 sobre la posición física, neteando la pata de compra contra la de venta. Es la práctica estándar de toda casa comercializadora de café.')], GREEN, 'EEF5F0'),
  H2('4.3 Coberturas aplicables'),
  bullet([R('Futuros KC (short/long hedge): ', { bold: true }), R('con café comprado se venden futuros; en un back-to-back donde se vende primero y aún no se compra, se compran futuros hasta abastecerse. 1 lote KC = 37.500 lb.')]),
  bullet([R('Opciones (puts y collars): ', { bold: true }), R('un put da piso de precio sin llamados a margen (a cambio de una prima); un collar (put comprado + call vendido) abarata la protección. Útil cuando se quiere limitar la exposición de caja.')]),
  H2('4.4 Reglas operativas'),
  bullet([R('Ratio ~1:1 por lote físico ', { bold: true }), R('contra el mes «C» más cercano posterior al embarque; cobertura trazable por Cliente / Pedido / Lote OIC.')]),
  bullet([R('Roll antes del First Notice Day (FND): ', { bold: true }), R('nunca sostener futuros en el mes de entrega; rolar al mes siguiente varios días hábiles antes del FND.')]),
  bullet([R('Provisión de caja para variation margin: ', { bold: true }), R('un movimiento adverso exige margen diario que puede alcanzar cientos de miles de USD en 24 horas. Mantener una línea de financiación de margen con el bróker (Hedge Point / StoneX) y presupuestar el peor caso en el flujo de caja.')]),
  bullet([R('Mark-to-market diario ', { bold: true }), R('de la posición neta (físico + futuros + opciones) y límites de posición abierta descubierta.')]),
  H2('4.5 Prácticas de referencia del mercado'),
  P([R('El '), R('short hedge sobre físico', { italics: true }), R(' y la separación entre flat price (cubrible) y diferencial (no cubrible) son el estándar documentado por la Guía del Exportador de Café del ITC y por ICE. Las grandes casas (ECOM, Louis Dreyfus, Volcafe, Sucafina, Neumann) operan bajo mark-to-market diario y límites de posición. El hallazgo más relevante de la práctica internacional: el mayor riesgo del hedge físico es de liquidez (margin calls), no de precio — por eso se recomienda una línea de margen o el uso de opciones/OTC sin margining (Rabobank, StoneX).')]),

  // ---------- RIESGO 2 ----------
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('5. Riesgo de Diferencial de Origen (Basis)')] }),
  H2('5.1 Definición'),
  P('El diferencial es la prima (US¢/lb) que paga el mercado internacional por el café colombiano frente al estándar del Contrato «C». Depende de la calidad, la disponibilidad física del origen y los términos de entrega. Es mucho menos volátil que el «C», pero puede tener movimientos fuertes (el diferencial del lavado colombiano superó 70 US¢/lb en jul-2026).'),
  H2('5.2 Conclusión'),
  callout('Cubrible — NO', [R('Según la fuente más autoritativa del sector (ITC), '), R('no existe un instrumento o mercado líquido para cubrir el diferencial', { bold: true }), R('. Al cubrir con futuros solo se cubre el precio «C», no el diferencial. Por lo tanto, se gestiona de forma 100% operativa, no financiera.')], BRICK, 'FBF1EC'),
  H2('5.3 Soluciones (gestión operativa)'),
  bullet([R('Calce de ambas puntas (matching / PTBF): ', { bold: true }), R('fijar el diferencial de compra y el de venta, dejando abierto solo el precio «C» (que sí se cubre). Es el corazón del modelo de neteo.')]),
  bullet([R('Límite de diferencial abierto neto: ', { bold: true }), R('un tope de volumen (sacos/lotes) comprado sin diferencial de venta fijado, y un límite de plazo de exposición (p. ej. 60–90 días), consistente con la práctica actual de vender a 2–3 meses.')]),
  bullet([R('Cláusulas PTBF por escrito: ', { bold: true }), R('cada contrato debe especificar mes y mercado de fijación, quién tiene el derecho de fijar y la ventana de fijación — para no regalar opcionalidad al comprador.')]),
  bullet([R('Diversificación de orígenes y calidades ', { bold: true }), R('para que un shock idiosincrásico de diferencial no golpee toda la cartera.')]),
  H2('5.4 Prácticas de referencia del mercado'),
  P('La Guía del Exportador de Café del ITC confirma explícitamente que el diferencial no es cubrible con ningún instrumento establecido; las casas comercializadoras lo neutralizan calzando ambas puntas (PTBF), acotando plazos y diversificando. El enfoque actual de Equation (ventas a 2–3 meses) es correcto pero incompleto: falta formalizar los límites de diferencial abierto neto y las cláusulas de fijación PTBF.'),

  // ---------- RIESGO 3 ----------
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('6. Riesgo Cambiario (FX / TRM)')] }),
  H2('6.1 Doctrina: cuándo nace el riesgo'),
  P('La materia prima regional está dolarizada (el precio interno = «C» + diferencial + TRM; cerca del 90–95% de su valor proviene de variables en USD). En consecuencia, mientras el café no se ha comprado existe una cobertura natural: si el dólar sube, tanto el ingreso en COP como el costo de compra suben en proporción similar. El riesgo cambiario real nace cuando se rompe esa simetría, es decir, cuando se fija la compra en COP: en ese instante la compañía queda larga en USD (recaudo futuro del cliente) y corta en COP (pago fijo en Colombia).'),
  P('La operación transcurre por tres hitos:'),
  tbl([2200, 3400, 3760],
    ['Hito', 'Riesgo activo', 'Acción de cobertura'],
    [
      ['1. Fijación de la venta (café por comprar)', 'Precio / Commodity (Bolsa NY)', 'Cubrir con futuros KC si el precio es fijo. Sin riesgo cambiario (cobertura natural).'],
      ['2. Fijación de la compra (precio fijo en COP)', 'Cambiario (TRM) — se abre aquí', 'Pactar Forward de venta USD/COP por el nocional a cubrir, con vencimiento al recaudo.'],
      ['3. Monetización (el cliente paga USD)', 'Ninguno (cerrado)', 'Liquidar las divisas contra el Forward. Margen comercial blindado.'],
    ]),
  spacer(),
  H2('6.2 Conclusión'),
  callout('Cubrible — SÍ', [R('El riesgo cambiario '), R('se cubre con un Forward (o NDF) de venta de USD/COP', { bold: true }), R(', pactado el día en que se fija la compra en COP y con vencimiento sincronizado a la fecha estimada de recaudo. Se cubre el USD-equivalente de los costos en COP más el margen local — '), R('no el 100% del contenedor', { bold: true }), R('.')], GREEN, 'EEF5F0'),
  H2('6.3 Cuánto cubrir y qué excluir'),
  bullet([R('Nocional a cubrir = ', { bold: true }), R('USD-equivalente de (costos en COP + margen local). El café pagado con los mismos USD que se reciben (fletes marítimos, comisiones en USD) ya está calzado y no se cubre.')]),
  bullet([R('Excluir la porción que no convierte a COP: ', { bold: true }), R('anticipo de Incofin en USD y cobros que quedan en la cuenta de Miami (Equation Coffee LLC).')]),
  H2('6.4 Política por tipo de transacción'),
  tbl([2600, 3200, 3560],
    ['Tipo de operación', 'Exposición cambiaria', 'Cobertura'],
    [
      ['A. Exportación FOB — back-to-back en caliente', 'Se abre al fijar la compra en COP el mismo día', 'Forward venta USD/COP el día del cierre, por el margen + costos COP, tenor al pago del cliente.'],
      ['B. Exportación FOB — vende primero, compra después', 'Sin FX hasta comprar (cobertura natural); se abre al fijar la compra', 'En la venta: futuro KC del precio si es fijo. En la compra: Forward venta USD/COP, tenor al recaudo. No dejar pasar la compra sin pactar el Forward.'],
      ['C. SPOT a Miami / Equation Coffee LLC', 'Solo sobre la porción que se repatría a COP', 'Forward venta USD/COP solo por lo que sube a Colombia (café + costos + margen). El resto queda en USD, calzado.'],
      ['D. Nacional en COP (p. ej. Libertario)', 'Ninguna (compra y venta en COP)', 'Sin cobertura FX. Excepción: si hay un tramo referenciado en USD, se trata como A/B por ese tramo.'],
      ['E. Con financiación Incofin (factoring)', 'Solo el remanente (~25–30%); el 70% anticipado en USD no convierte si se monetiza el día de la compra', 'El Forward cubre solo el remanente que se monetiza después. El factoring adelanta caja, no es cobertura FX.'],
    ]),
  spacer(),
  H2('6.5 Overlay dinámico por banda de TRM'),
  P('La cobertura no es fija: el ratio depende de dónde esté la TRM frente al presupuesto y al break-even (tasa mínima que cubre costos). Umbrales ilustrativos, a calibrar con los datos de costos fijos:'),
  tbl([2600, 3200, 3560],
    ['Banda de TRM', 'Situación', 'Política de cobertura'],
    [
      ['Alta (> ~3.500)', 'Tasa favorable; cubre costos con holgura', 'Cobertura mínima de la operación. Oportunísticamente asegurar recaudos futuros si hay caja y cupo disponible.'],
      ['Media (cerca del presupuesto)', 'Normal', 'Cubrir margen + costos fijos en COP (garantizar el margen presupuestado). Ratio ~60–75%.'],
      ['Baja (< break-even, hoy ~3.000)', 'Margen comprimido', 'Cubrir más que el margen (proteger caja/costos fijos); cerrar los recaudos abiertos. No especular a mala tasa; ajustar precio o costos en paralelo.'],
    ]),
  spacer(),
  H2('6.6 Dos capas de cobertura'),
  bullet([R('Transaccional (por operación): ', { bold: true }), R('la doctrina de los tres hitos — cubrir el recaudo de cada operación una vez fijado el costo en COP.')]),
  bullet([R('Estructural (tesorería): ', { bold: true }), R('los costos fijos mensuales en COP (nómina, oficina) están expuestos de forma permanente. Se cubren con un programa de forwards en capas (layering / rolling), p. ej. 25% a 12 meses y capas adicionales a 9, 6 y 3 meses, para suavizar el mark-to-market y anclar el presupuesto.')]),
  H2('6.7 Advertencia: los límites de la «cobertura natural»'),
  callout('Matiz importante', [R('La cobertura natural de la materia prima es real, pero '), R('solo protege la materia prima y solo mientras ambos precios floten en paridad', { bold: true }), R('. No cubre el margen ni los costos fijos en COP, y la correlación entre commodity y tipo de cambio no es perfecta. No debe sobre-confiarse en ella (advertencia documentada por Cargill).')], BRICK, 'FBF1EC'),
  H2('6.8 Prácticas de referencia del mercado'),
  P('Las mesas de tesorería recomiendan un núcleo de forwards/NDF para la exposición cierta y opciones/collars para el flujo previsto, con un ratio dinámico (híbrido) y un objetivo declarado de proteger el margen operativo, no adivinar la tasa. Para la capa estructural se usan programas de layering/rolling. El factoring cubre riesgo de crédito y liquidez, no cambiario. (Convera, ACT, Kyriba, Cargill, BIS, Bancolombia, EAFIT.)'),

  // ---------- GOBIERNO ----------
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('7. Gobierno y control')] }),
  bullet([R('Política escrita y aprobada ', { bold: true }), R('(este documento), revisada periódicamente.')]),
  bullet([R('Comité de riesgo mensual ', { bold: true }), R('que revisa exposiciones, cumplimiento de límites y ajusta la banda de política según la TRM y el mercado.')]),
  bullet([R('Control de cupos de crédito de cobertura: ', { bold: true }), R('no pactar coberturas sin línea disponible con bancos / Hedge Point; monitorear el consumo y avisar antes de exceder.')]),
  bullet([R('Límites por escrito: ', { bold: true }), R('ratio de cobertura por banda de TRM, diferencial abierto neto (volumen y plazo), y posición de futuros nunca mayor que la posición física.')]),
  bullet([R('Mandato acotado de tesorería ', { bold: true }), R('y segregación entre quien ejecuta y quien contabiliza (la estrategia transaccional es distinta del registro contable).')]),

  H1('8. Calibración pendiente'),
  P('Para fijar los umbrales exactos de las bandas y el break-even, se requiere confirmar:'),
  bullet('Costos fijos mensuales en COP (nómina + oficina).'),
  bullet('Margen / EBITDA objetivo (en USD y en COP).'),
  bullet('Presupuesto oficial de TRM y cupos de cobertura por entidad.'),

  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun('9. Referencias de mercado')] }),
  P('Fuentes autorizadas consultadas para las prácticas de referencia:'),
  bullet([link('ITC — The Coffee Exporter’s Guide (Futures, Hedging, Differentials, PTBF)', 'https://www.intracen.org/coffee-guide-resource-hub/futures-markets-and-hedging')]),
  bullet([link('ICE — Coffee «C» Futures & Options (brochure)', 'https://www.ice.com/publicdocs/ICE_Coffee_Brochure.pdf')]),
  bullet([link('IISD — Market-based price risk management', 'https://www.iisd.org/system/files/publications/trade_price_risk.pdf')]),
  bullet([link('FAO — Market-based instruments for agricultural price risk', 'https://www.fao.org/4/ap308e/ap308e.pdf')]),
  bullet([link('StoneX — Physical commodity hedging / risk management', 'https://www.stonex.com/en/physical-commodities/risk-management-physical-contracts/')]),
  bullet([link('Rabobank — Commodity price hedging (OTC, sin margin calls)', 'https://www.rabobankna.com/commodity-price-hedging/')]),
  bullet([link('Cargill — Busting the myth of the «natural hedge» in FX', 'https://www.cargill.com/commodity-price-risk/busting-the-myth-of-the-natural-hedge-in-foreign-exchange-risk')]),
  bullet([link('Convera — Non-deliverable forwards & budget-rate hedging', 'https://convera.com/blog/cross-border-payments/non-deliverable-forwards-fx-risk-budget-rate-hedging/')]),
  bullet([link('Association of Corporate Treasurers — FX hedging: choosing the right path', 'https://www.treasurers.org/hub/treasurer-magazine/fx-hedging-how-choose-right-path')]),
  bullet([link('BIS — The use of FX derivatives by exporters', 'https://www.bis.org/ifc/publ/ifcb43_u.pdf')]),
  bullet([link('Bancolombia — Alternativas para cubrirse del riesgo cambiario', 'https://blog.bancolombia.com/negocios/alternativas-riesgo-cambiario/')]),
  bullet([link('EAFIT — Cobertura con derivados forward para el riesgo cambiario del exportador colombiano', 'https://repository.eafit.edu.co/server/api/core/bitstreams/0c5f28df-5b26-44e6-a09b-b3fd88264b21/content')]),

  spacer(200),
  new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: TAN } }, spacing: { before: 200, after: 60 }, children: [] }),
  P([R('Preparado para socialización con el equipo de Equation Coffee (Comité de Riesgo). Este documento es un borrador de política; los umbrales numéricos son ilustrativos hasta calibrar el break-even. Una vez aprobado, se implementa en el dashboard de coberturas.', { italics: true, color: GRAY, size: 19 })]),
];

// ---------- Documento ----------
const doc = new Document({
  creator: 'Equation Coffee', title: 'Política de Gestión de Riesgos de Mercado y Coberturas',
  styles: {
    default: { document: { run: { font: SANS, size: 22, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: SERIF, size: 30, bold: true, color: TEAL },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0, keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TAN, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: SERIF, size: 24, bold: true, color: TEAL2 },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { run: { color: TEAL }, paragraph: { indent: { left: 460, hanging: 260 } } } }] },
  ] },
  sections: [
    { properties: { page: { margin: { top: 1440, right: 1152, bottom: 1440, left: 1152 } } }, children: cover },
    {
      properties: { page: { margin: { top: 1440, right: 1152, bottom: 1440, left: 1152 }, pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 },
        children: [new TextRun({ text: 'EQUATION COFFEE  ·  Política de Coberturas', font: SANS, size: 16, color: TAN })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 },
        children: [
          new TextRun({ text: 'Confidencial — Uso interno      ', font: SANS, size: 16, color: GRAY }),
          new TextRun({ text: 'Página ', font: SANS, size: 16, color: GRAY }),
          new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 16, color: GRAY }),
          new TextRun({ text: ' de ', font: SANS, size: 16, color: GRAY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SANS, size: 16, color: GRAY }),
        ] })] }) },
      children: body,
    },
  ],
});

const out = '/Users/felipesardi/Downloads/Politica de Coberturas - Equation Coffee.docx';
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log('OK ->', out, '(' + (buf.length / 1024).toFixed(1) + ' KB)'); });
