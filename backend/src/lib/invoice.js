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
    doc.fontSize(10).fillColor('#444').text(`Unit: ${money(it.price)} ${invoice.currency}`);
    doc.fontSize(10).fillColor('#444').text(`Line: ${money(Number(it.price) * it.quantity)} ${invoice.currency}`);
    doc.fillColor('black');
    doc.moveDown(0.5);
  });

  doc.moveDown(0.5);
  doc.fontSize(12).text('Totals', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Subtotal: ${money(order.subtotal)} ${invoice.currency}`);
  doc.text(`Delivery fee: ${money(order.deliveryFee)} ${invoice.currency}`);
  doc.fontSize(12).text(`Total: ${money(order.total)} ${invoice.currency}`, { bold: true });

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#666').text('Thank you for your order.', { align: 'center' });

  doc.end();
  return doc;
}

module.exports = { generateInvoiceNumber, buildInvoicePdf };
