import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../assets/logo_orange.png';

// ── Trim whitespace from image using canvas ───────────────────────────────────
async function loadLogoTrimmed(url) {
  try {
    // fetch as blob so canvas.getImageData() is never CORS-tainted
    const blob = await fetch(url).then(r => r.blob());
    const blobUrl = URL.createObjectURL(blob);

    const result = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
          for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
              const i = (y * c.width + x) * 4;
              if (d[i] < 230 || d[i + 1] < 230 || d[i + 2] < 230) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX <= minX || maxY <= minY) { resolve(null); return; }
          const pad = 6;
          const sx = Math.max(0, minX - pad), sy = Math.max(0, minY - pad);
          const sw = Math.min(c.width, maxX + pad + 1) - sx;
          const sh = Math.min(c.height, maxY + pad + 1) - sy;
          const c2 = document.createElement('canvas');
          c2.width = sw; c2.height = sh;
          c2.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
          resolve({ dataUrl: c2.toDataURL('image/png'), w: sw, h: sh });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = blobUrl;
    });

    URL.revokeObjectURL(blobUrl);
    return result;
  } catch { return null; }
}

// ── Category metadata ────────────────────────────────────────────────────────
const CAT_LABEL = { food: 'Food', transport: 'Transport', stay: 'Stay', activity: 'Activity', shopping: 'Shopping', other: 'Other' };
// Pill bg + text colors (RGB) matching app CATS
const CAT_PILL = {
  food:      { bg: [250, 238, 218], text: [133, 79, 11] },
  transport: { bg: [225, 245, 238], text: [15, 110, 86] },
  stay:      { bg: [230, 241, 251], text: [55, 110, 221] },
  activity:  { bg: [238, 237, 254], text: [83, 74, 183] },
  shopping:  { bg: [250, 236, 231], text: [153, 60, 29] },
  other:     { bg: [241, 239, 232], text: [107, 107, 104] },
};

// Maps non-Latin-1 currency symbols to safe PDF strings (Helvetica only covers Latin-1)
const SAFE_SYM = {
  '₹': 'Rs.', '₩': 'KRW', '₺': 'TRY', '₫': 'VND', '₱': 'PHP',
  '₨': 'Rs.', 'रू': 'NPR', '฿': 'THB', '﷼': 'SAR', 'د.إ': 'AED',
};

function safeSym(sym) { return SAFE_SYM[sym] ?? sym; }

function fmtAmt(n, sym) {
  return `${safeSym(sym)} ${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Generates a clean white-background expense report PDF and shares via Web Share API or download.
 */
export async function generateAndShareExpensePDF(trip, expenses, insights, currencySymbol = 'Rs.') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 14; // margin
  const CW = PAGE_W - M * 2; // content width

  const ORANGE      = [255, 106, 0];
  const ORANGE_LITE = [255, 248, 244];
  const ORANGE_BDR  = [255, 220, 194];
  const WHITE       = [255, 255, 255];
  const GRAY        = [130, 130, 130];
  const DARK        = [30, 30, 30];
  const GREEN       = [22, 163, 74];
  const CARD_BG     = [248, 248, 248];
  const LINE        = [226, 226, 226];

  const fmt = (n) => fmtAmt(n, currencySymbol);

  // ── 1. Thin orange accent strip at top ───────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // ── 2. Logo + trip header (white) ────────────────────────────────────────
  const logo = await loadLogoTrimmed(logoUrl);
  if (logo) {
    // fit trimmed logo into a 58×14 mm bounding box, preserving aspect ratio
    const maxW = 58, maxH = 14;
    const ar = logo.w / logo.h;
    const dw = ar >= maxW / maxH ? maxW : maxH * ar;
    const dh = ar >= maxW / maxH ? maxW / ar : maxH;
    doc.addImage(logo.dataUrl, 'PNG', M, 5, dw, dh);
  }

  // Trip metadata on the right of the logo row
  const count = trip.travelers?.length ?? 1;
  const metaLine = `${fmtDate(trip.startDate)} - ${fmtDate(trip.endDate)}  |  ${trip.totalDays ?? insights.totalDays} days  |  ${count} traveler${count !== 1 ? 's' : ''}`;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('EXPENSE REPORT', PAGE_W - M, 9, { align: 'right' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(trip.name || 'Trip', PAGE_W - M, 17, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(metaLine, PAGE_W - M, 23, { align: 'right' });

  // thin separator
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, 29, PAGE_W - M, 29);

  let y = 35;

  // ── 3. Summary cards ─────────────────────────────────────────────────────
  const cardW = (CW - 8) / 3;
  const cardH = 24;
  const projOnTrack = insights.projectedEnd <= (trip.totalBudget || Infinity);
  const cards = [
    { lbl: 'TOTAL SPENT',   val: fmt(trip.totalSpent),                                                   sub: `${fmt(Math.round(trip.totalSpent / (insights.daysElapsed || 1)))} / day`, vc: DARK },
    { lbl: 'BUDGET LEFT',   val: trip.totalBudget ? fmt(trip.totalBudget - trip.totalSpent) : 'N/A',     sub: trip.totalBudget ? `of ${fmt(trip.totalBudget)}` : '',                    vc: GREEN },
    { lbl: 'PROJECTED END', val: fmt(insights.projectedEnd),                                             sub: projOnTrack ? 'on track' : 'over budget',                                vc: ORANGE },
  ];

  cards.forEach((card, i) => {
    const x = M + i * (cardW + 4);
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(card.lbl, x + 5, y + 6.5);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.vc);
    doc.text(card.val, x + 5, y + 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(card.sub, x + 5, y + 21);
  });

  y += cardH + 10;

  // ── 4. Expenses table ─────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('EXPENSES', M, y);
  y += 5;

  // keep raw cat ids parallel to rows so didParseCell can look them up
  const rawCatIds = expenses.map(e => (e.category || e.cat || 'other').toLowerCase());

  const tableRows = expenses.map((e) => [
    e.description || e.desc || '',
    CAT_LABEL[rawCatIds[expenses.indexOf(e)]] || (e.category || e.cat || 'Other'),
    e.paidBy || '',
    fmtDate(e.date),
    fmt(e.amount),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Description', 'Category', 'Paid by', 'Date', 'Amount']],
    body: tableRows,
    foot: [['', '', '', 'Total', fmt(trip.totalSpent)]],
    styles:      { fontSize: 9, cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, textColor: DARK, lineColor: LINE, lineWidth: 0.15 },
    headStyles:  { fillColor: CARD_BG, textColor: GRAY, fontStyle: 'bold', fontSize: 7.5, lineColor: LINE, lineWidth: 0.2 },
    footStyles:  { fillColor: WHITE, textColor: ORANGE, fontStyle: 'bold', fontSize: 10, lineColor: LINE, lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20 },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    tableLineColor: LINE,
    tableLineWidth: 0.15,
    // draw colored category pill over the default text
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 1) {
        // hide default text — we'll redraw it inside the pill
        data.cell.styles.textColor = data.cell.styles.fillColor ?? WHITE;
      }
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 1) {
        const catId = rawCatIds[data.row.index] || 'other';
        const pill = CAT_PILL[catId] || CAT_PILL.other;
        const label = CAT_LABEL[catId] || data.cell.raw;
        const { x, y: cy, height } = data.cell;
        const ph = 6.5;
        const pw = Math.min(data.cell.width - 6, 28);
        const px = x + 3;
        const py = cy + (height - ph) / 2;
        doc.setFillColor(...pill.bg);
        doc.roundedRect(px, py, pw, ph, 2, 2, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...pill.text);
        doc.text(label, px + pw / 2, py + ph / 2 + 1.2, { align: 'center' });
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── 5. Insights grid (2 × 2) ──────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('INSIGHTS', M, y);
  y += 5;

  const iW = (CW - 4) / 2;
  const iH = 22;
  const saved = insights.budgetSaved ?? 0;
  const iCards = [
    { lbl: 'DAILY RATE',    val: fmt(insights.dailyRate || 0),                                                      sub: insights.dailyBudget ? `vs ${fmt(insights.dailyBudget)} planned` : '', vc: DARK },
    { lbl: 'DAYS ELAPSED',  val: `${insights.daysElapsed} of ${insights.totalDays}`,                               sub: `${insights.daysLeft} day${insights.daysLeft !== 1 ? 's' : ''} left`,  vc: DARK },
    { lbl: 'BUDGET SAVED',  val: fmt(Math.abs(saved)),                                                              sub: saved >= 0 ? 'under budget' : 'over budget',                           vc: saved >= 0 ? GREEN : [220, 38, 38] },
    { lbl: 'CREW PACE',     val: insights.crewPacePercent != null ? `${insights.crewPacePercent}% of plan` : 'N/A', sub: insights.allSettled ? 'everyone settled' : 'balances pending',         vc: DARK },
  ];

  iCards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (iW + 4);
    const cy = y + row * (iH + 4);
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cy, iW, iH, 3, 3, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY);
    doc.text(card.lbl, x + 5, cy + 7);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.vc);
    doc.text(card.val, x + 5, cy + 14.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(card.vc === GREEN ? GREEN : GRAY));
    if (card.sub) doc.text(card.sub, x + 5, cy + 19.5);
  });

  y += iH * 2 + 4 * 2 + 8;

  // ── 6. Money mood box ─────────────────────────────────────────────────────
  if (insights.moodMessage) {
    const lines = doc.splitTextToSize(insights.moodMessage, CW - 16);
    const boxH = 10 + lines.length * 5.2;
    doc.setFillColor(...ORANGE_LITE);
    doc.setDrawColor(...ORANGE_BDR);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, boxH, 3, 3, 'FD');
    doc.setFillColor(...ORANGE);
    doc.rect(M, y, 2.5, boxH, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text('GROUP MONEY MOOD', M + 7, y + 5.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 48, 16);
    doc.text(lines, M + 7, y + 10.5);
    y += boxH + 8;
  }

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('tripbae.in', M, PAGE_H - 7);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    PAGE_W - M, PAGE_H - 7, { align: 'right' }
  );

  // ── 8. Share / download ───────────────────────────────────────────────────
  const fileName = `${(trip.name || 'Trip').replace(/\s+/g, '-')}-expenses.pdf`;
  const pdfBlob = doc.output('blob');
  const title = `${trip.name || 'Trip'} — Expense Report`;

  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({
      title,
      text: title,
      url: uri,
      dialogTitle: 'Share expense report',
    });
    return;
  }

  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

