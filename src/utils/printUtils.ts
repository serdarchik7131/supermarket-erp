/**
 * Print Utilities for Tradeuz SFA / ERP System
 * Ensures printing works 100% reliably in preview containers, modals, and browser windows.
 */

export function printHtml(htmlContent: string, docTitle: string = 'Hujjat') {
  try {
    // Gather all stylesheets and inline style tags from current document
    const headStyles = Array.from(document.querySelectorAll('head style, head link[rel="stylesheet"], body style'))
      .map((node) => node.outerHTML)
      .join('\n');

    // Create a temporary print iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    iframe.style.zIndex = '999999';
    iframe.style.background = '#ffffff';
    iframe.id = 'tradeuz-print-iframe';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${headStyles}
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              margin: 0 !important;
              padding: 16px !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, button, select, input[type="button"], input[type="submit"] {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="printable-wrapper">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger print after styles render
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print()', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  } catch (err) {
    console.error('Print utility error:', err);
    window.print();
  }
}

export function printElementById(elementId: string, docTitle: string = 'Hujjat') {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Print element #${elementId} not found, invoking default window.print()`);
    window.print();
    return;
  }

  // Clone element and strip .no-print elements (keep SVGs and layout intact!)
  const clone = el.cloneNode(true) as HTMLElement;
  const noPrintEls = clone.querySelectorAll('.no-print');
  noPrintEls.forEach((item) => item.remove());

  printHtml(clone.outerHTML, docTitle);
}

