// frontend/src/pages/business/utils/qrExport.js
// Utilities for downloading QR codes as PNG and PDF

/**
 * Download the QR code canvas as a branded PNG file.
 * @param {string} businessName - Used in filename and branding text
 */
export function downloadQRPng(businessName = 'fuse101') {
  const src = document.querySelector('#qr-code-canvas canvas');
  if (!src) {
    console.error('QR canvas not found');
    return;
  }

  const padding = 20;
  const footerHeight = 40;
  const out = document.createElement('canvas');
  out.width  = src.width  + padding * 2;
  out.height = src.height + padding * 2 + footerHeight;

  const ctx = out.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  // QR code
  ctx.drawImage(src, padding, padding);

  // Branding footer
  ctx.fillStyle = '#003594';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Follow Us Everywhere · FUSE101',
    out.width / 2,
    out.height - 14
  );

  const filename = `${businessName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
  const a = document.createElement('a');
  a.download = filename;
  a.href = out.toDataURL('image/png');
  a.click();
}

/**
 * Download a print-ready PDF containing the QR code.
 * Uses browser print dialog with a styled print page.
 * @param {string} businessName
 * @param {string} slug - fuse101.com/qr/:slug
 */
export function downloadQRPdf(businessName = 'Your Business', slug = '') {
  const src = document.querySelector('#qr-code-canvas canvas');
  if (!src) {
    console.error('QR canvas not found');
    return;
  }

  const dataUrl = src.toDataURL('image/png');
  const landingUrl = `fuse101.com/qr/${slug}`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${businessName} QR Code</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fff;
        }
        .card {
          border: 3px solid #FDD001;
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          max-width: 320px;
        }
        .badge {
          background: #FDD001;
          border-radius: 20px;
          padding: 5px 16px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #003594;
          text-transform: uppercase;
        }
        .biz-name {
          font-size: 18px;
          font-weight: 800;
          color: #003594;
          text-align: center;
        }
        img { border-radius: 8px; width: 200px; height: 200px; }
        .url {
          font-size: 11px;
          color: #8A9DC0;
          letter-spacing: 0.05em;
        }
        .powered {
          font-size: 10px;
          color: #8A9DC0;
          margin-top: 4px;
        }
        .powered span { color: #FDD001; font-weight: 700; }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">✦ Follow Us Everywhere ✦</div>
        <div class="biz-name">${businessName}</div>
        <img src="${dataUrl}" alt="QR Code" />
        <div class="url">${landingUrl}</div>
        <div class="powered">Powered by <span>FUSE101</span></div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Copy the landing page URL to clipboard.
 * @param {string} slug
 * @returns {Promise<boolean>}
 */
export async function copyQRLink(slug = '') {
  const url = `https://fuse101.com/qr/${slug}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate the iframe embed code string.
 * @param {string} slug
 * @param {string} mode - 'minimal' | 'branded' | 'full' | 'custom'
 * @returns {string}
 */
export function getEmbedCode(slug = '', mode = 'branded') {
  return `<iframe\n  src="https://fuse101.com/qr/${slug}?mode=${mode}"\n  width="300"\n  height="500"\n  frameborder="0"\n  style="border-radius:20px;border:none;"\n></iframe>`;
}
