const PDFDocument = require('pdfkit');

function generateInvoiceNumber() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${y}${m}${d}-${rand}`;
}

function money(v) {
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return n.toFixed(2);
}

function currencyLabel(code) {
  if (!code) return '';
  const c = String(code).toUpperCase();
  if (c === 'USD') return '$';
  return c;
}

function buildInvoicePdf({ invoice, order, user }) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  doc.fontSize(18).text('Halal Express - Invoice', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Invoice: ${invoice.number}`);
  doc.text(`Issued: ${new Date(invoice.issuedAt).toLocaleString()}`);
  doc.text(`Order: ${order.id}`);
  doc.moveDown(0.5);

  doc.text(`Customer: ${user?.email ?? order.userId}`);
  doc.text(`Delivery address: ${order.deliveryAddress}`);
  doc.text(`Phone: ${order.deliveryPhone}`);
  doc.text(`Delivery time: ${new Date(order.deliveryTime).toLocaleString()}`);

  doc.moveDown(1);
  doc.fontSize(12).text('Items', { underline: true });
  doc.moveDown(0.5);

  order.items.forEach((it) => {
    const snap = it.productSnapshot || {};
    doc.fontSize(11).text(`${snap.name ?? 'Item'} x${it.quantity}`);
    const cur = currencyLabel(invoice.currency);
    doc.fontSize(10).fillColor('#444').text(`Unit: ${cur}${money(it.price)}`);
    doc.fontSize(10).fillColor('#444').text(`Line: ${cur}${money(Number(it.price) * it.quantity)}`);
    doc.fillColor('black');
    doc.moveDown(0.5);
  });

  doc.moveDown(0.5);
  doc.fontSize(12).text('Totals', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const cur = currencyLabel(invoice.currency);
  doc.text(`Subtotal: ${cur}${money(order.subtotal)}`);
  doc.text(`Delivery fee: ${cur}${money(order.deliveryFee)}`);
  const vatAmount = invoice.vatAmount !== undefined && invoice.vatAmount !== null ? Number(invoice.vatAmount) : 0;
  const vatRate = invoice.vatRate !== undefined && invoice.vatRate !== null ? Number(invoice.vatRate) : 0;
  if (vatRate > 0 || vatAmount > 0) {
    doc.text(`VAT (${(vatRate * 100).toFixed(2)}%): ${cur}${money(vatAmount)}`);
  }
  doc.fontSize(12).text(`Total: ${cur}${money(order.total)}`, { bold: true });

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#666').text('Thank you for your order.', { align: 'center' });

  doc.end();
  return doc;
}

module.exports = { generateInvoiceNumber, buildInvoicePdf };
