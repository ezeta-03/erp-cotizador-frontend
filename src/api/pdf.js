export const descargarPDF = async (cotizacionId, token, numero = null) => {
  const pdfUrl = `${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacionId}/pdf?token=${token}`;

  const response = await fetch(pdfUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const pdfBlob = await response.blob();
  if (pdfBlob.size === 0) throw new Error("PDF vacío recibido del servidor");

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `COT-${numero || cotizacionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const generarPDFCliente = async (cotizacion) => {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const GRAY    = [107, 114, 128];
  const LGRAY   = [209, 213, 219];
  const BLACK   = [17, 17, 17];
  const BLUE    = [29, 78, 216];
  const GREEN   = [22, 101, 52];
  const GBG     = [220, 252, 231];
  const SINBG   = [243, 244, 246];
  const SINGRAY = [107, 114, 128];

  const conIgv     = cotizacion.conIgv !== undefined ? cotizacion.conIgv : true;
  const total      = cotizacion.total || 0;
  const valorVenta = conIgv ? parseFloat((total / 1.18).toFixed(2)) : total;
  const igvMonto   = conIgv ? parseFloat((total - valorVenta).toFixed(2)) : 0;

  const S = (v) => `S/ ${(v || 0).toFixed(2)}`;

  const fecha = cotizacion.createdAt
    ? new Date(cotizacion.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
    : "N/A";

  const PW = 210;
  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;

  let y = 18;

  // ── Brand ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text("ZAAZMAGO", ML, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("PUBLICIDAD & DISEÑO", ML, y + 5);

  // Doc info (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(`Cotización ${cotizacion.numero || "N/A"}`, PW - MR, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(fecha, PW - MR, y + 5, { align: "right" });

  const estado = cotizacion.estado || "PENDIENTE";
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(estado, PW - MR, y + 10, { align: "right" });

  y += 16;

  // ── Separator ──
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(ML, y, PW - MR, y);
  y += 10;

  // ── Cliente ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("PARA", ML, y);
  y += 5;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(cotizacion.cliente?.nombreComercial || "N/A", ML, y);
  y += 5;

  if (cotizacion.cliente?.nombreContacto) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(cotizacion.cliente.nombreContacto, ML, y);
    y += 4;
  }
  if (cotizacion.cliente?.email) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(cotizacion.cliente.email, ML, y);
    y += 4;
  }

  y += 8;

  // ── IGV notice ──
  const noticeBg   = conIgv ? GBG : SINBG;
  const noticeText = conIgv ? GREEN : SINGRAY;
  const noticeStr  = conIgv ? "Precios con IGV incluido (18%)" : "Precios sin IGV (valor de venta)";
  const noticeW    = doc.getTextWidth(noticeStr) + 8;
  doc.setFillColor(...noticeBg);
  doc.roundedRect(ML, y - 4, noticeW, 6.5, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...noticeText);
  doc.text(noticeStr, ML + 4, y + 0.5);
  y += 10;

  // ── Items table ──
  const tableData = (cotizacion.items || []).map((item, i) => {
    const nombre = item.producto?.nombre || item.producto?.servicio || item.producto?.material || "Producto";
    const glosa  = item.descripcion || item.glosa || "";
    return [
      `${i + 1}`,
      glosa ? `${nombre}\n${glosa}` : nombre,
      `${item.cantidad || 0}`,
      S(item.precio),
      S(item.subtotal),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Descripción", "Cant.", "Precio unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fontStyle: "bold",
      fontSize: 7.5,
      textColor: GRAY,
      cellPadding: { top: 0, right: 4, bottom: 4, left: 0 },
      lineWidth: { bottom: 0.4 },
      lineColor: BLACK,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: BLACK,
      cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 0 },
      lineWidth: { bottom: 0.1 },
      lineColor: [243, 244, 246],
    },
    alternateRowStyles: {},
    columnStyles: {
      0: { cellWidth: 8,  textColor: GRAY, fontSize: 8 },
      1: { cellWidth: 90, fontStyle: "bold" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    margin: { left: ML, right: MR },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Totals ──
  const totalsX = PW - MR - 65;
  const valX    = PW - MR;

  const drawTotalsRow = (label, value, opts = {}) => {
    doc.setFontSize(opts.large ? 13 : 9.5);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(...(opts.color || [55, 65, 81]));
    doc.text(label, totalsX, y);
    doc.text(value, valX, y, { align: "right" });
    y += opts.large ? 6 : 5.5;
  };

  if (conIgv) {
    drawTotalsRow("Valor de venta", S(valorVenta));
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("IGV (18%)", totalsX, y);
    doc.text(`+ ${S(igvMonto)}`, valX, y, { align: "right" });
    y += 5.5;

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(totalsX, y + 1, valX, y + 1);
    y += 5;
  }

  // Total row
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Total", totalsX, y);
  doc.text(S(total), valX, y, { align: "right" });

  // Badge: Con IGV / Sin IGV
  const badgeLabel = conIgv ? "Con IGV" : "Sin IGV";
  const badgeBg    = conIgv ? GBG : SINBG;
  const badgeText  = conIgv ? GREEN : SINGRAY;
  const badgeW     = 14;
  const badgeH     = 4;
  const badgeX     = totalsX + doc.getTextWidth("Total") + 2;
  const badgeY     = y - 3.5;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...badgeText);
  doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 2.8, { align: "center" });

  // ── Footer ──
  const PH = doc.internal.pageSize.height;
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.2);
  doc.line(ML, PH - 18, PW - MR, PH - 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Cotización válida por 15 días hábiles desde la fecha de emisión.", ML, PH - 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LGRAY);
  doc.text("ZAAZMAGO", PW - MR, PH - 12, { align: "right" });

  doc.save(`COT-${cotizacion.numero || cotizacion.id || "NUEVA"}.pdf`);
};

export const descargarPDFInteligente = async (cotizacion, token) => {
  try {
    await descargarPDF(cotizacion.id, token, cotizacion.numero);
  } catch {
    try {
      await generarPDFCliente(cotizacion);
    } catch (err) {
      console.error("❌ Error generando PDF:", err);
      alert("Error generando PDF. Por favor, contacte al administrador.");
    }
  }
};
