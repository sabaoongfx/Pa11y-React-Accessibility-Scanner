import express from 'express';
import cors from 'cors';
import pa11y from 'pa11y';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, 'pa11y-logo.png');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let scanInProgress = false;

// ── Request logger ──
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ── Helper: run pa11y scan ──
async function runScan(url, standard) {
  return pa11y(url, {
    standard,
    timeout: 60000,
    chromeLaunchConfig: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });
}

function formatResults(raw, standard) {
  const issues = raw.issues.map(i => ({
    code: i.code, type: i.type, message: i.message,
    selector: i.selector, context: i.context, runner: i.runner
  }));

  const counts = issues.reduce(
    (acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; },
    { error: 0, warning: 0, notice: 0 }
  );

  return {
    url: raw.pageUrl,
    standard,
    documentTitle: raw.documentTitle,
    date: new Date().toISOString(),
    counts,
    issues
  };
}

// ── Shared validation + scan lock middleware ──
const VALID_STANDARDS = ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'];

function validateScanRequest(req, res, next) {
  const { url, standard = 'WCAG2AA' } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }
  if (!VALID_STANDARDS.includes(standard)) {
    return res.status(400).json({ error: `Invalid standard. Must be one of: ${VALID_STANDARDS.join(', ')}` });
  }
  if (scanInProgress) {
    return res.status(429).json({ error: 'A scan is already in progress. Please wait.' });
  }
  next();
}

// ── Quick scan ──
app.post('/api/scan', validateScanRequest, async (req, res) => {
  const { url, standard = 'WCAG2AA' } = req.body;

  console.log(`[SCAN] Starting: ${url} (${standard})`);
  scanInProgress = true;

  try {
    const raw = await runScan(url, standard);
    const result = formatResults(raw, standard);
    console.log(`[SCAN] Done! ${result.issues.length} issues (${result.counts.error}E / ${result.counts.warning}W / ${result.counts.notice}N)`);
    res.json(result);
  } catch (err) {
    console.error('[SCAN] Error:', err.message);
    res.status(500).json({ error: `Scan failed: ${err.message}` });
  } finally {
    scanInProgress = false;
  }
});

// ── PDF generation ──
app.post('/api/scan/pdf', validateScanRequest, async (req, res) => {
  const { url, standard = 'WCAG2AA' } = req.body;

  console.log(`[PDF] Starting scan + PDF: ${url} (${standard})`);
  scanInProgress = true;

  try {
    const raw = await runScan(url, standard);
    const result = formatResults(raw, standard);
    console.log(`[PDF] Scan done, generating PDF...`);
    generatePdf(res, result);
  } catch (err) {
    console.error('[PDF] Error:', err.message);
    res.status(500).json({ error: `PDF generation failed: ${err.message}` });
  } finally {
    scanInProgress = false;
  }
});

function generatePdf(res, result) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const W = 595.28; // A4 width
  const H = 841.89; // A4 height
  const M = 50;     // content margin
  const contentW = W - M * 2;

  res.setHeader('Content-Type', 'application/pdf');
  const hostname = new URL(result.url).hostname;
  const now = new Date(result.date);
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
  const filename = `Pa11y-accessibility-check-${result.standard}-${hostname}-${dateStr}-${timeStr}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // ═══════════════════════════════════════════
  //  COVER PAGE
  // ═══════════════════════════════════════════

  // Top gradient bar
  doc.save();
  doc.rect(0, 0, W, 6).fill('#4f46e5');
  doc.restore();

  // Subtle background shape (large circle, top-right)
  doc.save();
  doc.circle(480, 80, 260).fill('#f5f3ff');
  doc.restore();

  // Small accent circle bottom-left
  doc.save();
  doc.circle(80, 740, 120).fill('#eef2ff');
  doc.restore();

  // Logo
  const logoSize = 90;
  doc.image(LOGO_PATH, (W - logoSize) / 2, 200, { width: logoSize, height: logoSize });

  // Title
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#1e1b4b')
    .text('Accessibility', M, 320, { align: 'center', width: contentW });
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#4f46e5')
    .text('Report', { align: 'center', width: contentW });

  // Accent line
  doc.save();
  const accentY = doc.y + 14;
  doc.roundedRect((W - 60) / 2, accentY, 60, 4, 2).fill('#4f46e5');
  doc.restore();

  // Website info card
  const cardX = 70;
  const cardW = W - 140;
  const cardY = accentY + 40;
  const cardH = 130;
  const cardR = 12;

  doc.save();
  doc.roundedRect(cardX, cardY, cardW, cardH, cardR).fill('#ffffff');
  // Card shadow effect (slightly offset darker rect behind)
  doc.restore();
  doc.save();
  doc.roundedRect(cardX, cardY, cardW, cardH, cardR)
    .fillAndStroke('#ffffff', '#e5e7eb');
  doc.restore();

  // Page title inside card
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827')
    .text(result.documentTitle || 'Untitled Page', cardX + 24, cardY + 20, { width: cardW - 48 });

  // URL inside card
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#4f46e5')
    .text(result.url, cardX + 24, doc.y, { width: cardW - 48 });

  // Standard + Date row inside card
  doc.moveDown(0.8);
  const metaY = doc.y;

  // Standard pill (9pt font ~6.5px height, pill 24px, center: (24-6.5)/2 ≈ 8.75)
  const pillH = 24;
  const pillFontH = 9 * 0.72;
  const pillPadY = (pillH - pillFontH) / 2;

  doc.save();
  doc.roundedRect(cardX + 24, metaY, 90, pillH, 12).fill('#eef2ff');
  doc.restore();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#4338ca')
    .text(result.standard, cardX + 24, metaY + pillPadY, { width: 90, align: 'center' });

  // Date pill
  doc.save();
  doc.roundedRect(cardX + 124, metaY, 170, pillH, 12).fill('#f3f4f6');
  doc.restore();
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text(new Date(result.date).toLocaleString(), cardX + 124, metaY + pillPadY, { width: 170, align: 'center' });

  // Footer text
  doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
    .text('Generated by Pa11y Accessibility Checker  |  sabaoon.dev', M, H - 60, { align: 'center', width: contentW });

  // Bottom bar
  doc.save();
  doc.rect(0, H - 6, W, 6).fill('#4f46e5');
  doc.restore();

  // ═══════════════════════════════════════════
  //  PAGE 2: SUMMARY + ISSUES
  // ═══════════════════════════════════════════
  doc.addPage();

  // Top accent bar on results page
  doc.save();
  doc.rect(0, 0, W, 4).fill('#4f46e5');
  doc.restore();

  // Section title
  doc.y = M + 10;
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e1b4b')
    .text('Summary', M, doc.y);
  doc.moveDown(0.8);

  // Stat blocks
  const { error = 0, warning = 0, notice = 0 } = result.counts;
  const total = error + warning + notice;

  const blockY = doc.y;
  const blockW = 150;
  const blockH = 80;
  const gap = 22;
  const startX = M;
  const radius = 10;

  const blocks = [
    { label: 'Errors',   count: error,   bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
    { label: 'Warnings', count: warning, bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
    { label: 'Notices',  count: notice,  bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' },
  ];

  // Content inside each block: count (30pt ~22px) + gap (8) + label (10pt ~8px) = ~38px
  const countFontSize = 30;
  const labelFontSize = 11;
  const countHeight = countFontSize * 0.72;  // approx rendered height
  const labelHeight = labelFontSize * 0.72;
  const innerGap = 6;
  const contentH = countHeight + innerGap + labelHeight;
  const topPad = (blockH - contentH) / 2;

  blocks.forEach((block, i) => {
    const x = startX + i * (blockW + gap);

    // Shadow
    doc.save();
    doc.roundedRect(x + 2, blockY + 3, blockW, blockH, radius).fill('#e2e8f0');
    doc.restore();

    // Card
    doc.save();
    doc.roundedRect(x, blockY, blockW, blockH, radius)
      .fillAndStroke(block.bg, block.border);
    doc.restore();

    // Count — vertically centered
    doc.save();
    doc.fontSize(countFontSize).font('Helvetica-Bold').fillColor(block.text)
      .text(String(block.count), x, blockY + topPad, { width: blockW, align: 'center' });
    doc.restore();

    // Label — right below count
    doc.save();
    doc.fontSize(labelFontSize).font('Helvetica-Bold').fillColor(block.text)
      .text(block.label, x, blockY + topPad + countHeight + innerGap, { width: blockW, align: 'center' });
    doc.restore();
  });

  doc.y = blockY + blockH + 20;
  doc.x = M;

  // Total pill
  const totalPillH = 28;
  const totalFontH = 10 * 0.72;
  const totalPadY = (totalPillH - totalFontH) / 2;

  doc.save();
  doc.roundedRect(M, doc.y, 200, totalPillH, 14).fill('#f3f4f6');
  doc.restore();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
    .text(`${total} total issue${total !== 1 ? 's' : ''} found`, M, doc.y + totalPadY, { width: 200, align: 'center' });

  doc.y += 46;

  // Divider
  doc.moveTo(M, doc.y).lineTo(W - M, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  doc.moveDown(1.2);

  // Section title
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e1b4b')
    .text('Issues', M, doc.y);
  doc.moveDown(0.6);

  // Issues list
  if (result.issues.length === 0) {
    doc.save();
    const successY = doc.y;
    doc.roundedRect(M, successY, contentW, 50, 10).fill('#f0fdf4');
    doc.restore();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#16a34a')
      .text('No accessibility issues found!', M, successY + 16, { width: contentW, align: 'center' });
    doc.y = successY + 60;
  } else {
    const typeBg = { error: '#fef2f2', warning: '#fffbeb', notice: '#eff6ff' };
    const typeAccent = { error: '#dc2626', warning: '#d97706', notice: '#2563eb' };
    const typeBadgeBg = { error: '#fee2e2', warning: '#fef3c7', notice: '#dbeafe' };

    result.issues.forEach((issue, idx) => {
      // Check space for new issue (estimate ~80px per issue)
      if (doc.y > H - 120) {
        doc.addPage();
        doc.save();
        doc.rect(0, 0, W, 4).fill('#4f46e5');
        doc.restore();
        doc.y = M + 10;
      }

      const issueY = doc.y;
      const accent = typeAccent[issue.type] || '#6b7280';
      const bg = typeBg[issue.type] || '#f9fafb';
      const badgeBg = typeBadgeBg[issue.type] || '#f3f4f6';

      // Badge
      const badgeText = issue.type.toUpperCase();
      const badgeW = badgeText.length * 6.5 + 16;
      const badgeH = 18;
      const badgeFontH = 8 * 0.72;
      const badgePadY = (badgeH - badgeFontH) / 2;
      doc.save();
      doc.roundedRect(M + 12, issueY, badgeW, badgeH, 9).fill(badgeBg);
      doc.restore();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(accent)
        .text(badgeText, M + 12, issueY + badgePadY, { width: badgeW, align: 'center' });

      // Issue number
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text(`#${idx + 1}`, M + 12 + badgeW + 8, issueY + 4);

      // Message
      doc.y = issueY + 24;
      doc.fontSize(9.5).font('Helvetica').fillColor('#1f2937')
        .text(issue.message, M + 12, doc.y, { width: contentW - 24 });

      // Selector
      if (issue.selector) {
        doc.moveDown(0.2);
        doc.save();
        const selY = doc.y;
        doc.roundedRect(M + 12, selY, contentW - 24, 16, 4).fill('#f9fafb');
        doc.restore();
        doc.fontSize(7.5).font('Helvetica').fillColor('#6b7280')
          .text(issue.selector, M + 18, selY + 4, { width: contentW - 36 });
        doc.y = selY + 20;
      }

      // Context
      if (issue.context) {
        doc.moveDown(0.1);
        doc.save();
        const ctxY = doc.y;
        doc.roundedRect(M + 12, ctxY, contentW - 24, 20, 4).fill('#f9fafb');
        doc.restore();
        doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
          .text(issue.context, M + 18, ctxY + 4, { width: contentW - 36, height: 14, ellipsis: true });
        doc.y = ctxY + 24;
      }

      // WCAG code
      doc.fontSize(7).font('Helvetica').fillColor('#d1d5db')
        .text(issue.code, M + 12, doc.y);

      doc.moveDown(1.2);
    });
  }

  // Footer on every results page
  const addFooter = () => {
    doc.fontSize(8).font('Helvetica').fillColor('#d1d5db')
      .text('Pa11y Accessibility Checker  |  sabaoon.dev', M, H - 40, { width: contentW, align: 'center' });
    doc.save();
    doc.rect(0, H - 6, W, 6).fill('#4f46e5');
    doc.restore();
  };

  addFooter();
  doc.end();
}

app.listen(PORT, () => {
  console.log(`Pa11y server running on http://localhost:${PORT}`);
});
