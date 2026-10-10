/**
 * Packaging & Label OCR Parser Engine
 * 
 * Specialized regex and heuristic parser for Indian FMCG and Pharmaceutical packaging
 * dot-matrix / inkjet printed batch blocks (MRP, USP, Net Wt, MFD, EXP, Batch No, Brand).
 */

export interface ParsedBatchLabel {
  rawText: string;
  mrp: number | null;
  mrpFormatted: string | null;
  unitRate: string | null;
  netWeight: string | null;
  mfgDate: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  brand: string | null;
  productType: string | null;
  confidence: number;
}

// Common Indian FMCG & Pharma brands found on retail packaging
const KNOWN_BRANDS = [
  "BRITANNIA",
  "PARLE",
  "ITC",
  "SUNFEAST",
  "AMUL",
  "NESTLE",
  "CADBURY",
  "MONDELEZ",
  "HALDIRAM",
  "BALAJI",
  "DABUR",
  "MARICO",
  "TATA",
  "FORTUNE",
  "EMAMI",
  "PATANJALI",
  "HIMALAYA",
  "CIPLA",
  "SUN PHARMA",
  "MANKIND",
  "LUPIN",
  "DR. REDDY",
  "TORRENT",
  "ALKEM",
  "ABBOTT",
  "GLAXO",
  "PFIZER",
];

/**
 * Standardize varied date formats (DD/MM/YY, DD/MM/YYYY, MM/YY, DD-MMM-YYYY)
 * to ISO YYYY-MM-DD or standard readable string.
 */
function normalizeDate(rawDateStr: string): string | null {
  const cleaned = rawDateStr.trim().replace(/[.]/g, "/").replace(/[-]/g, "/");
  const parts = cleaned.split("/");

  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // If month > 12 and day <= 12, swap (US vs UK format)
    if (day > 12 && month <= 12) {
      // standard DD/MM/YY
    } else if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    // Convert 2-digit year (e.g. 24 -> 2024, 99 -> 1999)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  } else if (parts.length === 2) {
    // MM/YY format (e.g. 03/24)
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (year < 100) year = 2000 + year;
    if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
      const mm = String(month).padStart(2, "0");
      return `${year}-${mm}-01`;
    }
  }

  // Handle month names: "11 MAR 24", "MAR 2024", etc.
  const monthNames: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  for (const [name, num] of Object.entries(monthNames)) {
    if (rawDateStr.toUpperCase().includes(name)) {
      const yearMatch = rawDateStr.match(/\b(20\d{2}|\d{2})\b/);
      if (yearMatch) {
        let yr = parseInt(yearMatch[1], 10);
        if (yr < 100) yr = 2000 + yr;
        const dayMatch = rawDateStr.match(/\b(\d{1,2})\b/);
        const d = dayMatch ? String(parseInt(dayMatch[1], 10)).padStart(2, "0") : "01";
        return `${yr}-${num}-${d}`;
      }
    }
  }

  return rawDateStr;
}

/**
 * Parse OCR raw string into structured packaging batch metrics.
 */
export function parsePackagingLabel(text: string): ParsedBatchLabel {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ");

  let mrp: number | null = null;
  let mrpFormatted: string | null = null;
  let unitRate: string | null = null;
  let netWeight: string | null = null;
  let mfgDate: string | null = null;
  let expiryDate: string | null = null;
  let batchNumber: string | null = null;
  let brand: string | null = null;
  let productType: string | null = null;

  // 1. MRP (Maximum Retail Price)
  // Matches "MRP. ₹ 10.00", "MRP: Rs. 10.00", "MRP 10.00 (INCL. OF ALL TAXES)", "₹ 10.00"
  const mrpRegexes = [
    /(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE|PRICE|RS\.?|₹)\s*[:.-]?\s*(?:₹|RS\.?)?\s*(\d{1,5}(?:\.\d{1,2})?)/i,
    /(?:₹|RS\.?)\s*(\d{1,5}(?:\.\d{1,2})?)/i,
    /\b(\d{1,4}\.\d{2})\b/,
  ];

  for (const regex of mrpRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val < 50000) {
        mrp = val;
        mrpFormatted = `₹${val.toFixed(2)}`;
        break;
      }
    }
  }

  // 2. Unit Rate / USP (e.g. "Rs. 0.26 per g", "Rs 0.26 / g", "USP: Rs 0.50/ml")
  const unitRateMatch = normalized.match(
    /(?:UNIT\s*(?:SALE)?\s*(?:PRICE|RATE)|USP|RS\.?)\s*[:.-]?\s*(?:₹|RS\.?)?\s*(\d+(?:\.\d{1,4})?)\s*(?:PER|\/)\s*([a-zA-Z]+)/i
  );
  if (unitRateMatch) {
    unitRate = `₹${unitRateMatch[1]} / ${unitRateMatch[2]}`;
  }

  // 3. Net Weight / Quantity (e.g. "Net Weight: 39 g", "NET WT. 39g", "39 g", "500 ml", "1 kg")
  const netWtMatch = normalized.match(
    /(?:NET\s*(?:WT\.?|WEIGHT|QTY|QUANTITY)?)\s*[:.-]?\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gm|grams|ml|ltr)/i
  );
  if (netWtMatch) {
    netWeight = `${netWtMatch[1]} ${netWtMatch[2].toLowerCase()}`;
  } else {
    // Secondary standalone weight check
    const simpleWeight = normalized.match(/\b(\d{1,4})\s*(g|kg|ml|gm)\b/i);
    if (simpleWeight) {
      netWeight = `${simpleWeight[1]} ${simpleWeight[2].toLowerCase()}`;
    }
  }

  // 4. Expiry Date / Best Before / Use By
  // Matches "USE BY 11/03/24", "EXP: 11/03/2024", "EXP: 08/2026", "BEST BEFORE 6 MONTHS", "EXP. DATE: 11-03-24"
  const expMatch = normalized.match(
    /(?:USE\s*BY|EXP(?:IRY)?\.?\s*(?:DATE)?|BEST\s*BEFORE|VALID\s*TILL)\s*[:.-]?\s*(\d{1,2}[./-](?:\d{1,2}[./-])?\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}|[A-Za-z]{3}\s*[-/]?\s*20\d{2})/i
  );
  if (expMatch && expMatch[1]) {
    expiryDate = normalizeDate(expMatch[1]);
  }

  // 5. Manufacturing / Packed Date
  // Matches "MFD: 12/10/23", "PKD: 12/10/23", "MFD: 09/2024", "MFG DATE: 12.10.2023"
  const mfdMatch = normalized.match(
    /(?:MFD\.?|MFG\.?\s*(?:DATE)?|PKD\.?|PACKED\s*(?:ON)?)\s*[:.-]?\s*(\d{1,2}[./-](?:\d{1,2}[./-])?\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}|[A-Za-z]{3}\s*[-/]?\s*20\d{2})/i
  );
  if (mfdMatch && mfdMatch[1]) {
    mfgDate = normalizeDate(mfdMatch[1]);
  }

  // 6. Batch / Lot Number
  // Matches "BATCH NO. A102395", "B.NO. A102395", "LOT NO: L4092", "B/NO A102395"
  const batchMatch = normalized.match(
    /(?:B(?:ATCH)?\.?\s*(?:NO\.?|NUMBER)?|LOT\.?\s*(?:NO\.?|NUM)?|B\.?\s*NO\.?)\s*[:.-]?\s*([A-Z0-9-]{3,16})/i
  );
  if (batchMatch && batchMatch[1]) {
    // Avoid capturing words like "DATE" or "TAXES"
    const candidate = batchMatch[1].trim();
    if (!["DATE", "TAXES", "PRICE", "INCL", "ONLY", "BEST", "PACK"].includes(candidate.toUpperCase())) {
      batchNumber = candidate;
    }
  }

  // 7. Brand Recognition
  const upper = normalized.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(upper)) {
      brand = b.charAt(0) + b.slice(1).toLowerCase();
      break;
    }
  }

  // 8. Product category/type hints with word boundaries
  if (/\b(?:BISCUIT|BISCUITS|COOKIE|COOKIES)\b/i.test(normalized)) productType = "Biscuits";
  else if (/\b(?:NOODLES|PASTA|MAGGI)\b/i.test(normalized)) productType = "Noodles & Pasta";
  else if (/\b(?:OIL|GHEE|ATTA|RICE|FLOUR|DAL|PULSES)\b/i.test(normalized)) productType = "Staples";
  else if (/\b(?:SOAP|SHAMPOO|LOTION|TOOTHPASTE)\b/i.test(normalized)) productType = "Personal Care";
  else if (/\b(?:TABLET|TABLETS|CAPSULE|CAPSULES|SYRUP|OINTMENT|SUSPENSION|INJECTION)\b/i.test(normalized)) productType = "Medicine";

  // Compute confidence score based on recognized attributes
  let points = 0;
  if (mrp) points += 25;
  if (expiryDate) points += 30;
  if (batchNumber) points += 25;
  if (mfgDate) points += 10;
  if (netWeight) points += 10;

  return {
    rawText: normalized,
    mrp,
    mrpFormatted,
    unitRate,
    netWeight,
    mfgDate,
    expiryDate,
    batchNumber,
    brand,
    productType,
    confidence: points,
  };
}

/**
 * Preprocesses an HTML Canvas image for optical character recognition of inkjet dot-matrix text:
 * 1. Grayscale conversion (Luminance weighting)
 * 2. Contrast stretching (Min-Max normalization)
 * 3. Otsu / Adaptive Binarization thresholding
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  cropRect?: { x: number; y: number; width: number; height: number }
): void {
  const sx = cropRect?.x ?? 0;
  const sy = cropRect?.y ?? 0;
  const sw = cropRect?.width ?? sourceCanvas.width;
  const sh = cropRect?.height ?? sourceCanvas.height;

  targetCanvas.width = sw;
  targetCanvas.height = sh;
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  // Draw cropped region
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  // Pass 1: Grayscale + find min & max luminance for contrast stretching
  let minLum = 255;
  let maxLum = 0;
  const lums = new Uint8Array(sw * sh);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // Standard perceptual luminance: 0.299 R + 0.587 G + 0.114 B
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    lums[j] = lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum || 1;
  const threshold = minLum + range * 0.45; // slightly bias towards crisp dark dot-matrix text

  // Pass 2: Contrast stretch + binarize
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const lum = lums[j];
    // Contrast stretched value
    const stretched = Math.min(255, Math.max(0, ((lum - minLum) / range) * 255));
    // Crisp binarization for dot matrix print
    const bin = stretched > threshold ? 255 : 0;

    data[i] = bin;
    data[i + 1] = bin;
    data[i + 2] = bin;
    data[i + 3] = 255; // full opacity
  }

  ctx.putImageData(imgData, 0, 0);
}

