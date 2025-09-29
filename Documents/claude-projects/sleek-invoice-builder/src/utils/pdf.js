import { ensureFontLoaded } from '../utils/fontLoader';

const PAPER_MAP = {
  Letter: '8.5in 11in',
  A4: '210mm 297mm',
  Legal: '8.5in 14in'
};

const FONT_HREFS = {
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
  Lato: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  Merriweather: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
  Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap',
  Raleway: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
  'Source Sans Pro': 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&display=swap',
  Ubuntu: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap'
};

function copyStylesTo(idoc, fromDoc) {
  // Copy <link rel="stylesheet">
  [...fromDoc.querySelectorAll('link[rel="stylesheet"]')].forEach(l => {
    const copy = idoc.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = l.href;
    idoc.head.appendChild(copy);
  });
  // Copy inline <style> tags (important for Vite dev and Tailwind in dev)
  [...fromDoc.querySelectorAll('style')].forEach(s => {
    const copy = idoc.createElement('style');
    copy.textContent = s.textContent || '';
    idoc.head.appendChild(copy);
  });
}

async function waitForStylesFontsImages(idoc) {
  // Wait for stylesheet links to load
  const linkLoads = [...idoc.querySelectorAll('link[rel="stylesheet"]')].map(l => {
    if (l.sheet || l.styleSheet) return Promise.resolve();
    return new Promise(res => { l.addEventListener('load', () => res()); l.addEventListener('error', () => res()); });
  });

  const fontReady = idoc.fonts && idoc.fonts.ready ? idoc.fonts.ready : Promise.resolve();

  const images = [...idoc.images];
  const imgLoads = images.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; }));

  await Promise.all([...linkLoads, fontReady, ...imgLoads]);
}

async function printInIframe(node, { paper = 'Letter', font = 'System', autoClose = true, title = '' } = {}) {
  if (!node) throw new Error('printInIframe: missing node');

  // Ensure font is loaded in parent (helps speed) and we will also add it to the iframe
  await ensureFontLoaded(font);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: 0, bottom: 0, width: 0, height: 0, border: 0 });
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow.document;
  idoc.open(); idoc.write('<!doctype html><html><head></head><body></body></html>'); idoc.close();

  copyStylesTo(idoc, document);

  // Add webfont link if selected
  if (font && font !== 'System' && FONT_HREFS[font]) {
    const link = idoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREFS[font];
    idoc.head.appendChild(link);
  }

  // Print-specific CSS
  const style = idoc.createElement('style');
  style.textContent = `
    @page { size: ${PAPER_MAP[paper] || PAPER_MAP.Letter}; margin: 0.3in; }
    html, body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      padding: 0;
      overflow: visible !important;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      background: white !important;
      color: #111827;
    }

    /* Ensure all content is visible */
    .invoice-preview-container {
      overflow: visible !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    /* Ensure notes section is visible */
    section {
      overflow: visible !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Notes specific styling */
    section:last-child,
    section:has(h3) {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 20px;
    }

    /* Ensure text content is visible */
    p, span, div {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: pre-wrap !important;
    }

    /* Table handling */
    table {
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    @media print {
      body {
        background: white !important;
        color: #111827 !important;
      }
      section {
        display: block !important;
        visibility: visible !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      /* Force light print so PDFs don't invert */
      body { background: white !important; color: #111827 !important; }
    }
  `;
  idoc.head.appendChild(style);

  // Clone invoice node and apply selected font inline
  const clone = node.cloneNode(true);
  clone.style.fontFamily = font && font !== 'System'
    ? `"${font}", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
    : 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';

  // Ensure the clone has proper dimensions for printing
  clone.style.width = '100%';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';

  idoc.body.appendChild(clone);

  // Wait for CSS, fonts and images
  await waitForStylesFontsImages(idoc);

  if (title) idoc.title = title;

  const win = iframe.contentWindow;
  await new Promise(res => setTimeout(res, 50));
  win.focus(); win.print();

  if (autoClose) setTimeout(() => document.body.removeChild(iframe), 500);
}

export async function printNode(node, opts = {}) { return printInIframe(node, opts); }
export async function downloadNodeAsPDF(node, filename = 'invoice.pdf', opts = {}) {
  return printInIframe(node, { ...opts, title: filename });
}