// Función de utilidad para descargar PDFs de forma segura
export const descargarPDF = async (cotizacionId, token, numero = null) => {
  const pdfUrl = `${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacionId}/pdf?token=${token}`;

  try {
    // Descargar el PDF completo
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Obtener el blob del PDF
    const pdfBlob = await response.blob();
    console.log('📄 Blob recibido, tamaño:', pdfBlob.size, 'bytes, tipo:', pdfBlob.type);

    // Verificar que el blob tenga contenido
    if (pdfBlob.size === 0) {
      throw new Error('PDF vacío recibido del servidor');
    }

    // Crear URL del objeto blob
    const pdfUrlBlob = URL.createObjectURL(pdfBlob);

    // Crear enlace para descargar
    const link = document.createElement('a');
    link.href = pdfUrlBlob;
    link.download = `COT-${numero || cotizacionId}.pdf`;
    link.target = '_blank';

    // Agregar al DOM y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar el URL del objeto después de un tiempo
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrlBlob);
    }, 1000);

    return true; // Éxito
  } catch (error) {
    console.error('Error descargando PDF desde backend:', error);
    throw error; // Re-lanzar para que el caller lo maneje
  }
};

// Función alternativa para generar PDF usando jsPDF (compatible con Vercel/Render)
export const generarPDFCliente = async (cotizacion) => {
  try {
    // Import dinámico para evitar problemas de build
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();

    // Configuración de colores y fuentes
    const primaryColor = [253, 97, 19]; // Naranja ZAAZMAGO
    const secondaryColor = [16, 176, 129]; // Verde

    // Encabezado
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('ZAAZMAGO', 105, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Cotización de Servicios', 105, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    // Información de la cotización
    let yPosition = 50;

    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text(`Cotización ${cotizacion.numero || 'N/A'}`, 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${cotizacion.cliente?.nombreComercial || 'N/A'}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Fecha: ${new Date(cotizacion.createdAt).toLocaleDateString()}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Estado: ${cotizacion.estado}`, 20, yPosition);
    yPosition += 15;

    // Tabla de productos
    const tableData = cotizacion.items ? cotizacion.items.map(item => {
      const productoNombre = item.producto?.material || item.producto?.servicio || item.producto?.nombre || 'Producto';
      const glosa = item.glosa || '';
      return [
        item.cantidad || 0,
        `${productoNombre} ${glosa}`,
        `S/. ${(item.precio || 0).toFixed(2)}`,
        `S/. ${(item.subtotal || 0).toFixed(2)}`
      ];
    }) : [];

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Cant.', 'Producto', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 100 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 }
        }
      });
    }

    // Total
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : yPosition + 20;
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.text(`TOTAL: S/. ${cotizacion.total ? cotizacion.total.toFixed(2) : '0.00'}`, 150, finalY, { align: 'right' });

    // Pie de página
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('ZAAZMAGO - Cotización generada automáticamente', 105, pageHeight - 20, { align: 'center' });
    doc.text('ventas@zaazmago.com | +51 999 999 999', 105, pageHeight - 10, { align: 'center' });

    // Descargar el PDF
    const fileName = `COT-${cotizacion.numero || cotizacion.id || 'NUEVA'}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error('Error generando PDF con jsPDF:', error);
    throw error;
  }
};

// Función inteligente que intenta backend primero, luego jsPDF como fallback
export const descargarPDFInteligente = async (cotizacion, token) => {
  try {
    // Intentar primero con el backend (Puppeteer)
    console.log('🔄 Intentando descargar PDF desde backend...');
    await descargarPDF(cotizacion.id, token, cotizacion.numero);
    console.log('✅ PDF descargado exitosamente desde backend');
  } catch (error) {
    console.warn('⚠️ Error descargando PDF desde backend, usando jsPDF como alternativa...', error);

    try {
      // Fallback: generar PDF con jsPDF
      console.log('📄 Generando PDF con jsPDF...');
      await generarPDFCliente(cotizacion);
      console.log('✅ PDF generado exitosamente con jsPDF');
    } catch (fallbackError) {
      console.error('❌ Error generando PDF con jsPDF:', fallbackError);
      alert('Error generando PDF. Por favor, contacte al administrador.');
    }
  }
};