import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { encode } from 'html-entities';
import { TRIPAK_LOGO_B64 } from '../assets/logoBase64.js';

function cur(v) {
  return Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function qty(v) {
  return Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function e(v) { return encode(String(v ?? '')); }

function buildRows(inputSnapshot, calculations) {
  const s = inputSnapshot.summary || {};
  const items = calculations.summary.items || {};
  return [
    { sr:1,  desc:'Plastic Crates cost',                        size: s.plasticCrateSizeMm || '',            rate: s.plasticCrateUnitCost,          units: s.plasticCrateQty,         total: items.plasticCrates },
    { sr:2,  desc:'Crates fabricateion and joint cost',         size: s.fabricationSizeInfo || '',           rate: s.fabricationUnitCost,           units: s.fabricationQty,          total: items.fabrication },
    { sr:3,  desc:'CNC Partition cost (per pec) length side',   size: 'As per Standred',                    rate: calculations.cnc.lengthUnitCost, units: s.cncLengthQty,            total: items.cncLength },
    { sr:4,  desc:'CNC Partition cost (per pec) width side',    size: 'As per Standred',                    rate: calculations.cnc.widthUnitCost,  units: s.cncWidthQty,             total: items.cncWidth },
    { sr:5,  desc:'PP Partition / Insert cost',                 size: '0',                                  rate: calculations.ppInsert.finalCost, units: s.ppInsertQty,             total: items.ppInsert },
    { sr:6,  desc:'Equal Pkts Partition cost-HDPE',             size: 'As per Standred',                    rate: calculations.hdpe.totalRate,     units: s.hdpePartitionQty,        total: items.hdpePartition },
    { sr:7,  desc:'Equal Pkts Partition Foam - 2mm Thickness',  size: 'As per Standred',                    rate: calculations.foam.totalRate,     units: s.foamPartitionQty,        total: items.foamPartition },
    { sr:8,  desc:'Flap cover Size -',                          size: inputSnapshot?.flapCover?.flapCoverSizes || s.flapCoverSizeInfo || '', rate: calculations.flapCover.finalCost, units: s.flapCoverQty, total: items.flapCover },
    { sr:9,  desc:'Naylon Belt and revit',                      size: 'Length of belt',                     rate: s.nylonBeltRate,                 units: s.nylonBeltQty,            total: items.nylonBelt },
    { sr:10, desc:'HDPE Extra Side Support',                    size: 'As per Standred',                    rate: s.extraSideSupportRate,          units: s.extraSideSupportQty,     total: items.extraSideSupport },
    { sr:11, desc:'Lebal Holder / Card Holder',                 size: s.labelHolderSizeInfo || '',          rate: s.labelHolderRate,               units: s.labelHolderQty,          total: items.labelHolder },
    { sr:12, desc:'Freight cost',                               size: 'As per Standred',                    rate: s.freightRate,                   units: s.freightQty,              total: items.freight },
    { sr:13, desc:'Side foam',                                  size: s.sideFoamSizeInfo || '',             rate: s.sideFoamRate,                  units: s.sideFoamQty,             total: items.sideFoam },
    { sr:14, desc:'Extra accessories',                          size: '',                                   rate: s.extraAccessoriesRate,          units: s.extraAccessoriesQty,     total: items.extraAccessories },
    { sr:15, desc:'Other if Any',                               size: '',                                   rate: s.otherRate,                     units: s.otherQty,                total: items.other },
  ];
}


function buildDunnageHtml(d) {
  if (!d || !d.enabled) return '';
  const nv = v => Number(v || 0);
  const r2 = v => Math.round((nv(v) + Number.EPSILON) * 100) / 100;
  const pc = v => { const x = nv(v); return Math.abs(x) > 1 ? x / 100 : x; };
  const fabricAmt    = r2(nv(d.fabricTapetaQty) * nv(d.fabricTapetaRate));
  const epeAmt       = r2(nv(d.epeFoamQty)      * nv(d.epeFoamRate));
  const velcroAmt    = r2(nv(d.velcroQty)        * nv(d.velcroRate));
  const pvcFlapAmt   = r2(nv(d.pvcFlapQty)       * nv(d.pvcFlapRate));
  const threadAmt    = r2(nv(d.threadQty)         * nv(d.threadRate));
  const labourAmt    = r2(nv(d.labourQty)         * nv(d.labourRate));
  const transportAmt = r2(nv(d.transportQty) * nv(d.transportRate));
  const totalA       = r2(fabricAmt + epeAmt + velcroAmt + pvcFlapAmt + threadAmt + labourAmt + transportAmt);
  const profitAmt    = r2(totalA * pc(d.profitPercent));
  const totalB       = r2(totalA + profitAmt);
  const tripakAmt    = r2(totalB * pc(d.tripakProfitPercent));
  const totalC       = r2(totalB + tripakAmt);
  const cratesCost   = r2(nv(d.cratesCostQty) * nv(d.cratesCostRate));
  const grandTotal   = r2(totalC + cratesCost);

  const itemRows = [
    ['Fabric - Tapeta', 'MTR', d.fabricTapetaQty, d.fabricTapetaRate, fabricAmt],
    ['EPE Foam - 2mm',  'MTR', d.epeFoamQty,      d.epeFoamRate,      epeAmt],
    ['Velcro',          'MTR', d.velcroQty,        d.velcroRate,       velcroAmt],
    ['PVC Flap Cover',  'MTR', d.pvcFlapQty,       d.pvcFlapRate,      pvcFlapAmt],
    ['Thread',          'MTR', d.threadQty,         d.threadRate,       threadAmt],
    ['Labour',          'Job', d.labourQty,         d.labourRate,       labourAmt],
    ['Transport',       'Job', d.transportQty,      d.transportRate,    transportAmt],
  ].map((r, i) => [
    '<tr style="background:' + (i % 2 === 0 ? '#f8f9fa' : '#fff') + '">',
    '<td style="padding:4px 8px;">' + r[0] + '</td>',
    '<td style="padding:4px 8px;text-align:center;color:#666;">' + r[1] + '</td>',
    '<td style="padding:4px 8px;text-align:right;">' + r[2] + '</td>',
    '<td style="padding:4px 8px;text-align:right;">' + r[3] + '</td>',
    '<td style="padding:4px 8px;text-align:right;font-weight:600;">' + cur(r[4]) + '</td>',
    '</tr>',
  ].join('')).join('');

  const partRow = d.partName
    ? '<div style="padding:5px 10px;background:#f0f4ff;font-size:11px;border:1px solid #c7d2fe;border-top:none;"><strong>Part:</strong> ' + e(d.partName) + '</div>'
    : '';

  return [
    '<div style="margin-top:24px;page-break-inside:avoid;">',
    '<div style="background:#1e3a5f;color:#fff;padding:8px 12px;font-weight:700;font-size:13px;border-radius:4px 4px 0 0;">',
    '&#129525; FABRIC DUNNAGE COST &mdash; Add-on (Separate from Main Crate Total)',
    '</div>',
    partRow,
    '<table style="width:100%;border-collapse:collapse;font-size:11px;">',
    '<thead><tr style="background:#2d5a9e;color:#fff;">',
    '<th style="padding:5px 8px;text-align:left;">Item</th>',
    '<th style="padding:5px 8px;text-align:center;">Unit</th>',
    '<th style="padding:5px 8px;text-align:right;">Qty</th>',
    '<th style="padding:5px 8px;text-align:right;">Rate (&#8377;)</th>',
    '<th style="padding:5px 8px;text-align:right;">Amount (&#8377;)</th>',
    '</tr></thead>',
    '<tbody>' + itemRows + '</tbody>',
    '<tfoot>',
    '<tr style="background:#dbeafe;font-weight:600;"><td colspan="4" style="padding:5px 8px;text-align:right;">Total (A)</td><td style="padding:5px 8px;text-align:right;">' + cur(totalA) + '</td></tr>',
    '<tr style="background:#fff;"><td colspan="4" style="padding:5px 8px;text-align:right;">+ Profit (' + d.profitPercent + '%)</td><td style="padding:5px 8px;text-align:right;">' + cur(profitAmt) + '</td></tr>',
    '<tr style="background:#f0f4ff;font-weight:600;"><td colspan="4" style="padding:5px 8px;text-align:right;">Total (B)</td><td style="padding:5px 8px;text-align:right;">' + cur(totalB) + '</td></tr>',
    '<tr style="background:#fff;"><td colspan="4" style="padding:5px 8px;text-align:right;">+ Tripak Profit (' + d.tripakProfitPercent + '%)</td><td style="padding:5px 8px;text-align:right;">' + cur(tripakAmt) + '</td></tr>',
    '<tr style="background:#e0e7ff;font-weight:600;"><td colspan="4" style="padding:5px 8px;text-align:right;">Total (C)</td><td style="padding:5px 8px;text-align:right;">' + cur(totalC) + '</td></tr>',
    '<tr style="background:#fff;"><td colspan="4" style="padding:5px 8px;text-align:right;">+ Crates Cost (' + nv(d.cratesCostQty) + ' &times; &#8377;' + nv(d.cratesCostRate) + ')</td><td style="padding:5px 8px;text-align:right;">' + cur(cratesCost) + '</td></tr>',
    '<tr style="background:#1e3a5f;color:#fff;"><td colspan="4" style="padding:7px 8px;text-align:right;font-weight:700;letter-spacing:0.5px;">FABRIC DUNNAGE GRAND TOTAL</td><td style="padding:7px 8px;text-align:right;font-weight:700;color:#fbbf24;font-size:13px;">' + cur(grandTotal) + '</td></tr>',
    '</tfoot></table></div>',
  ].join('\n');
}

export function buildQuoteHtml({ quote, calculations, inputSnapshot }) {
  const dunnageHtml = buildDunnageHtml(inputSnapshot?.fabricDunnage);
  const rows = buildRows(inputSnapshot || {}, calculations);
  const dateStr = quote.quote_date
    ? new Date(quote.quote_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const rowsHtml = rows.map(row => {
    const total = Number(row.total || 0);
    const isZero = total === 0;
    return `<tr>
      <td class="c-sr">${row.sr}</td>
      <td class="c-desc">${e(row.desc)}</td>
      <td class="c-size" style="background:#fff59d;">${e(row.size)}</td>
      <td class="c-num" style="background:#fff59d;">${isZero ? '' : cur(row.rate)}</td>
      <td class="c-num">${isZero ? '' : qty(row.units)}</td>
      <td class="c-num c-total">${isZero ? '' : cur(row.total)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 18px 22px; background: #fff; }

  /* ── HEADER ── */
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 3px solid #1a237e; padding-bottom: 8px; }
  .company-name { font-size: 26px; font-weight: 900; color: #1a237e; letter-spacing: 1px; line-height: 1; }
  .company-logo { width: 90px; height: 90px; object-fit: contain; }

  /* ── INFO STRIP ── */
  .info-strip { display: grid; grid-template-columns: 1fr auto; background: #e8eaf6; padding: 6px 10px; margin-bottom: 4px; border: 1px solid #9fa8da; border-radius: 2px; }
  .info-strip .doc-title { font-size: 13px; font-weight: 700; color: #1a237e; align-self: center; }
  .info-strip .date-block { font-size: 12px; color: #333; text-align: right; }
  .info-strip .date-label { font-weight: 700; color: #1a237e; }

  /* ── CUSTOMER ROW ── */
  .customer-row { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 0; border: 1px solid #9fa8da; border-top: none; margin-bottom: 8px; }
  .customer-row .cl { background: #e8eaf6; padding: 5px 10px; font-weight: 700; color: #1a237e; font-size: 11px; border-right: 1px solid #9fa8da; white-space: nowrap; }
  .customer-row .cv { padding: 5px 10px; background: #fff; border-right: 1px solid #9fa8da; font-size: 11px; }
  .customer-row .cv:last-child { border-right: none; }

  /* ── TABLE ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1a237e; color: #fff; padding: 6px 8px; text-align: left; font-weight: 700; border: 1px solid #3949ab; }
  th.c-num { text-align: right; }
  td { padding: 5px 8px; border: 1px solid #cfd8dc; vertical-align: middle; }
  tr:nth-child(even) td { background: #f5f5f5; }
  tr:nth-child(odd) td { background: #fff; }
  .c-sr { width: 36px; text-align: center; }
  .c-desc { width: 38%; }
  .c-size { width: 16%; }
  .c-num { text-align: right; width: 12%; }
  .c-total { font-weight: 600; background: #fff9c4 !important; }

  /* ── TOTALS ── */
  .row-subtotal td { background: #e3f2fd !important; font-weight: 700; }
  .row-overhead td { background: #fff3e0 !important; font-weight: 700; }
  .row-grand td { background: #1a237e !important; color: #fff !important; font-weight: 900; font-size: 12px; }
  .row-grand .c-total { background: #ffd600 !important; color: #1a237e !important; font-size: 13px; }

  /* ── FOOTER ── */
  .footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
  .sign-block { text-align: center; }
  .sign-line { border-top: 1px solid #333; width: 160px; margin: 30px auto 4px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="page-header">
  <div>
    <div class="company-name">TRIPAK MHS SOLUTIONS PVT. LTD.</div>
    <div style="font-size:11px;color:#555;margin-top:3px;">Material Handling Solutions</div>
  </div>
  <img class="company-logo" src="${TRIPAK_LOGO_B64}" alt="Tripak Logo" />
</div>

<!-- INFO STRIP -->
<div class="info-strip">
  <div class="doc-title">Details Cost Sheet for Crates Fabrication</div>
  <div class="date-block"><span class="date-label">Date</span>&nbsp;&nbsp;${e(dateStr)}</div>
</div>

<!-- CUSTOMER ROW -->
<div class="customer-row">
  <div class="cl">Customer Name</div>
  <div class="cv">${e(quote.customer_name)}</div>
  <div class="cl">Sales Person</div>
  <div class="cv">${e(quote.sales_person || '')}</div>
</div>
<div class="customer-row" style="margin-top:-1px;margin-bottom:10px;">
  <div class="cl">Quote No</div>
  <div class="cv">${e(quote.quote_number)}</div>
  <div class="cl">Crate Size</div>
  <div class="cv">${e(quote.crate_size || '')}</div>
</div>

<!-- MAIN TABLE -->
<table>
  <thead>
    <tr>
      <th class="c-sr">Sr.No</th>
      <th class="c-desc">Description of items</th>
      <th class="c-size">Sizes (in MM)</th>
      <th class="c-num">Cost Per unit</th>
      <th class="c-num">Units</th>
      <th class="c-num">Total</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
    <tr class="row-subtotal">
      <td></td><td colspan="4" style="text-align:right;padding-right:12px;">Sub Total</td>
      <td class="c-num c-total">${cur(calculations.summary.baseTotal)}</td>
    </tr>
    <tr class="row-overhead">
      <td></td><td colspan="4" style="text-align:right;padding-right:12px;">Profit and Factory Overhead (${Number(inputSnapshot?.summary?.profitOverheadPercent || 0)}%)</td>
      <td class="c-num c-total">${cur(calculations.summary.overheadAmount)}</td>
    </tr>
    <tr class="row-grand">
      <td></td><td colspan="4" style="text-align:right;padding-right:12px;letter-spacing:0.5px;">TOTAL FINAL COST</td>
      <td class="c-num c-total">${cur(calculations.summary.grandTotal)}</td>
    </tr>
  </tbody>
</table>

${quote.remarks ? `<div style="margin-top:10px;padding:6px 10px;background:#f9fbe7;border:1px solid #c5e1a5;border-radius:3px;font-size:11px;"><strong>Remarks:</strong> ${e(quote.remarks)}</div>` : ''}

${dunnageHtml}

<!-- FOOTER -->
<div class="footer">
  <div>Generated on ${new Date().toLocaleString('en-IN')}</div>
  <div class="sign-block">
    <div class="sign-line"></div>
    <div>Authorised Signatory</div>
    <div style="font-weight:700;color:#1a237e;">TRIPAK MHS SOLUTIONS PVT. LTD.</div>
  </div>
</div>

</body>
</html>`;
}

export async function generateQuotePdf({ quote, calculations, inputSnapshot }) {
  const dir = path.resolve(process.cwd(), process.env.GENERATED_DIR || './generated');
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${quote.quote_number}.pdf`;
  const filePath = path.join(dir, fileName);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildQuoteHtml({ quote, calculations, inputSnapshot }), { waitUntil: 'networkidle0' });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    return { fileName, filePath };
  } finally {
    await browser.close();
  }
}
