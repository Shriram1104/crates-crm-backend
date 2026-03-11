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

export function buildQuoteHtml({ quote, calculations, inputSnapshot }) {
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
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(buildQuoteHtml({ quote, calculations, inputSnapshot }), { waitUntil: 'networkidle0' });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    return { fileName, filePath };
  } finally {
    await browser.close();
  }
}
