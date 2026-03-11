function n(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pct(value) {
  const num = n(value);
  return Math.abs(num) > 1 ? num / 100 : num;
}

// CNC static constants per Excel (no yellow fill = not user-editable):
//   D14 = Machine Rate = 125, F16 = Overhead = 40%, F17 = Profit on OH = 20%
const CNC_MACHINE_RATE  = 125;
const CNC_OVERHEAD_PCT  = 0.40;
const CNC_PROFIT_PCT    = 0.20;

export function calculateSummaryItems(summary = {}) {
  const items = {
    plasticCrates:   round2(n(summary.plasticCrateUnitCost)   * n(summary.plasticCrateQty)),
    fabrication:     round2(n(summary.fabricationUnitCost)    * n(summary.fabricationQty)),
    cncLength:       round2(n(summary.cncLengthUnitCost)      * n(summary.cncLengthQty)),
    cncWidth:        round2(n(summary.cncWidthUnitCost)       * n(summary.cncWidthQty)),
    ppInsert:        round2(n(summary.ppInsertUnitCost)       * n(summary.ppInsertQty)),
    hdpePartition:   round2(n(summary.hdpePartitionUnitCost)  * n(summary.hdpePartitionQty)),
    foamPartition:   round2(n(summary.foamPartitionUnitCost)  * n(summary.foamPartitionQty)),
    flapCover:       round2(n(summary.flapCoverUnitCost)      * n(summary.flapCoverQty)),
    nylonBelt:       round2(n(summary.nylonBeltRate)          * n(summary.nylonBeltQty)),
    extraSideSupport:round2(n(summary.extraSideSupportRate)   * n(summary.extraSideSupportQty)),
    labelHolder:     round2(n(summary.labelHolderRate)        * n(summary.labelHolderQty)),
    freight:         round2(n(summary.freightRate)            * n(summary.freightQty)),
    sideFoam:        round2(n(summary.sideFoamRate)           * n(summary.sideFoamQty)),
    extraAccessories:round2(n(summary.extraAccessoriesRate)   * n(summary.extraAccessoriesQty)),
    other:           round2(n(summary.otherRate)              * n(summary.otherQty))
  };

  const baseTotal = Object.values(items).reduce((acc, val) => acc + val, 0);
  const overheadAmount = round2(baseTotal * pct(summary.profitOverheadPercent));
  const grandTotal = round2(baseTotal + overheadAmount);

  return { items, baseTotal: round2(baseTotal), overheadAmount, grandTotal };
}

export function calculateCnc(cnc = {}) {
  const weightPerSheet = round2(n(cnc.baseSheetLengthM) * n(cnc.baseSheetWidthM) * n(cnc.baseSheetThickness));
  const materialCost = round2(weightPerSheet * n(cnc.materialRate));
  const freight = round2(n(cnc.transportCostPerKg) * weightPerSheet);
  const materialsCostPerSheet = round2(materialCost + freight);
  const designCost = round2(n(cnc.designRate) * n(cnc.designHours));
  // Machine rate is STATIC = 125 per Excel D14 (not user-editable)
  const machineCost = round2(CNC_MACHINE_RATE * n(cnc.machineHours));
  const handlingCost = round2(n(cnc.handlingRate) * n(cnc.handlingHours));
  const subtotal = round2(materialsCostPerSheet + designCost + machineCost + handlingCost);
  // Overhead = 40%, Profit on overhead = 20% — STATIC per Excel F16, F17
  const overhead = round2(subtotal * CNC_OVERHEAD_PCT);
  const profit = round2(overhead * CNC_PROFIT_PCT);
  const totalPerSheet = round2(subtotal + overhead + profit);

  // Use raw (unrounded) division — same as Excel =D30/D32 which keeps full precision
  const lengthPiecesAlong  = n(cnc.lengthSheetLengthMm) / Math.max(1, n(cnc.lengthPattiLengthMm));
  const lengthPiecesAcross = n(cnc.lengthSheetWidthMm)  / Math.max(1, n(cnc.lengthPattiWidthMm));
  const widthPiecesAlong   = n(cnc.widthSheetLengthMm)  / Math.max(1, n(cnc.widthPattiLengthMm));
  const widthPiecesAcross  = n(cnc.widthSheetWidthMm)   / Math.max(1, n(cnc.widthPattiWidthMm));
  const lengthPieces = Math.max(0.0001, lengthPiecesAlong * lengthPiecesAcross);
  const widthPieces  = Math.max(0.0001, widthPiecesAlong  * widthPiecesAcross);

  return {
    weightPerSheet, materialCost, freight, materialsCostPerSheet,
    designCost, machineCost, handlingCost, subtotal, overhead, profit, totalPerSheet,
    lengthUnitCost: round2(totalPerSheet / lengthPieces),
    widthUnitCost:  round2(totalPerSheet / widthPieces),
    lengthPiecesAlong: round2(lengthPiecesAlong),
    lengthPiecesAcross: round2(lengthPiecesAcross),
    widthPiecesAlong: round2(widthPiecesAlong),
    widthPiecesAcross: round2(widthPiecesAcross),
    lengthPieces: round2(lengthPieces),
    widthPieces: round2(widthPieces)
  };
}

export function calculatePpInsert(pp = {}) {
  // Key names match exactly what buildApiPayload sends from the frontend:
  //   rateKg, line1BoardWidth, line1PcSheet, line1PcInsert, etc.
  const line1RatePerSheet = round2(n(pp.line1BoardWidth) * (n(pp.insertHeight) + 10) * n(pp.rateKg) * n(pp.gsm) / 1000000);
  const line2RatePerSheet = round2(n(pp.line2BoardWidth) * (n(pp.insertHeight) + 10) * n(pp.rateKg) * n(pp.gsm) / 1000000);
  const line1CostPerPc = round2((line1RatePerSheet / Math.max(1, n(pp.line1PcSheet))) * n(pp.line1PcInsert));
  const line2CostPerPc = round2((line2RatePerSheet / Math.max(1, n(pp.line2PcSheet))) * n(pp.line2PcInsert));
  const subtotal = round2(line1CostPerPc + line2CostPerPc);
  const fabricationAmount = round2(subtotal * pct(pp.fabricationPercent));
  const dieCostPerUnit = round2(n(pp.dieCostTotal) / Math.max(1, n(pp.dieCostDivisor)));
  const wastageAmount = round2(subtotal * pct(pp.wastagePercent));
  const overheadAmount = round2(subtotal * pct(pp.overheadPercent));
  const otherChargesAmount = round2((subtotal + fabricationAmount + dieCostPerUnit + wastageAmount + overheadAmount) * pct(pp.otherChargesPercent));
  const beforeProfit = round2(subtotal + fabricationAmount + dieCostPerUnit + wastageAmount + overheadAmount + otherChargesAmount + n(pp.transportCharge));
  const profitAmount = round2(beforeProfit * pct(pp.profitPercent));
  const finalCost = round2(beforeProfit + profitAmount);
  return { line1RatePerSheet, line2RatePerSheet, line1CostPerPc, line2CostPerPc, subtotal, fabricationAmount, dieCostPerUnit, wastageAmount, overheadAmount, otherChargesAmount, beforeProfit, profitAmount, finalCost };
}

function calculateAreaBased(module = {}) {
  const totalAreaMm = round2(
    n(module.lengthArea)    * n(module.lengthHeight)   * n(module.lengthStrips) +
    n(module.widthArea)     * n(module.widthHeight)    * n(module.widthStrips) +
    n(module.blockingArea)  * n(module.blockingHeight) * n(module.blockingStrips) +
    n(module.additionalArea)* n(module.additionalHeight)* n(module.additionalStrips)
  );
  // CRITICAL: use raw (unrounded) totalAreaMeter for rate calculation.
  // Rounding 0.1575 → 0.16 before multiplying gives 160.00 instead of 157.50.
  const totalAreaMeterRaw = totalAreaMm / 1000000;
  const totalAreaMeter = round2(totalAreaMeterRaw); // display only
  const totalRate = round2(n(module.thickness) * n(module.ratePerMeter) * totalAreaMeterRaw);
  return { totalAreaMm, totalAreaMeter, totalRate };
}

export function calculateHdpePartition(hdpe = {}) {
  return calculateAreaBased(hdpe);
}

export function calculateFoamPartition(foam = {}) {
  return calculateAreaBased(foam);
}

export function calculateFlapCover(flap = {}) {
  // CRITICAL: use raw (unrounded) area for all multiplications.
  // Rounding 0.25425 → 0.25 first causes fabric/foam/labour totals to be wrong.
  const totalAreaRaw = n(flap.lengthM) * n(flap.widthM) * n(flap.unitCount);
  const totalAreaMtrs = round2(totalAreaRaw); // display only
  // Accept both areaRatePerMeter (new canonical key) and flapMaterialRate (old snapshots)
  const materialRate = n(flap.areaRatePerMeter) || n(flap.flapMaterialRate);
  const baseMaterialCost = round2(totalAreaRaw * materialRate);
  const velcro25Cost   = round2((n(flap.lengthM) * 2) * n(flap.velcro25Rate));
  const velcro50Cost   = round2((n(flap.lengthM) * 2) * n(flap.velcro50Rate));
  const sidePatti25Cost= round2((n(flap.lengthM) * 2) * n(flap.sidePatti25Rate));
  const sidePatti50Cost= round2((n(flap.lengthM) * 2) * n(flap.sidePatti50Rate));
  const foamCost    = round2(totalAreaRaw * n(flap.foamRate));           // raw area
  const threadCost  = round2((n(flap.lengthM) * 2 * 4) * n(flap.threadRate));
  const labourCost  = round2((totalAreaRaw * 10) * n(flap.labourRate));  // raw area
  const freightCost = round2(n(flap.freightBase) * n(flap.freightRate));
  const subtotal = round2(baseMaterialCost + velcro25Cost + velcro50Cost + sidePatti25Cost + sidePatti50Cost + foamCost + threadCost + labourCost + freightCost);
  const profitAmount = round2(subtotal * pct(flap.profitPercent));
  const finalCost = round2(subtotal + profitAmount);
  return { totalAreaMtrs, baseMaterialCost, velcro25Cost, velcro50Cost, sidePatti25Cost, sidePatti50Cost, foamCost, threadCost, labourCost, freightCost, subtotal, profitAmount, finalCost };
}

export function calculateQuote(payload) {
  const cnc       = calculateCnc(payload.cnc);
  const ppInsert  = calculatePpInsert(payload.ppInsert);
  const hdpe      = calculateHdpePartition(payload.hdpe);
  const foam      = calculateFoamPartition(payload.foam);
  const flapCover = calculateFlapCover(payload.flapCover);

  const summaryInputs = {
    ...payload.summary,
    cncLengthUnitCost:      cnc.lengthUnitCost,
    cncWidthUnitCost:       cnc.widthUnitCost,
    ppInsertUnitCost:       ppInsert.finalCost,
    hdpePartitionUnitCost:  hdpe.totalRate,
    foamPartitionUnitCost:  foam.totalRate,
    flapCoverUnitCost:      flapCover.finalCost
  };

  const summary = calculateSummaryItems(summaryInputs);
  return { cnc, ppInsert, hdpe, foam, flapCover, summary };
}
