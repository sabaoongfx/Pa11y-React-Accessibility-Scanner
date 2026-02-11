import pa11y from 'pa11y';
import chromium from '@sparticuz/chromium';

const VALID_STANDARDS = ['WCAG2A', 'WCAG2AA', 'WCAG2AAA'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, standard = 'WCAG2AA' } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }
  if (!VALID_STANDARDS.includes(standard)) {
    return res.status(400).json({ error: `Invalid standard. Must be one of: ${VALID_STANDARDS.join(', ')}` });
  }

  try {
    const executablePath = await chromium.executablePath();

    const raw = await pa11y(url, {
      standard,
      timeout: 50000,
      chromeLaunchConfig: {
        executablePath,
        headless: chromium.headless,
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    const issues = raw.issues.map(i => ({
      code: i.code, type: i.type, message: i.message,
      selector: i.selector, context: i.context, runner: i.runner
    }));

    const counts = issues.reduce(
      (acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; },
      { error: 0, warning: 0, notice: 0 }
    );

    res.json({
      url: raw.pageUrl,
      standard,
      documentTitle: raw.documentTitle,
      date: new Date().toISOString(),
      counts,
      issues
    });
  } catch (err) {
    console.error('[SCAN] Error:', err.message);
    res.status(500).json({ error: `Scan failed: ${err.message}` });
  }
}
