const axios = require('axios');

// Configuración
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://cotizador-backend-zaazmago.onrender.com'
  : 'http://localhost:3000';

const TEST_COTIZACION_ID = '1'; // ID de prueba

async function testCotizacionAPI() {
  try {
    console.log('🧪 Probando API de cotizaciones...\n');

    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@zaazmago.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');

    // Obtener cotización específica
    const cotizacionResponse = await axios.get(`${API_BASE_URL}/api/cotizaciones/${TEST_COTIZACION_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Cotización obtenida:', cotizacionResponse.data.numero);
    console.log('📊 Items:', cotizacionResponse.data.items.length);
    console.log('💰 Total:', cotizacionResponse.data.total);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

    if (error.response?.status === 404) {
      console.log('🔍 Cotización no encontrada - usando datos de desarrollo');
    }
  }
}

async function testPdfGeneration() {
  try {
    console.log('\n🧪 Probando generación de PDF...\n');

    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@zaazmago.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');

    // Generar PDF
    const pdfResponse = await axios.get(`${API_BASE_URL}/api/cotizaciones/${TEST_COTIZACION_ID}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });

    console.log('✅ PDF generado exitosamente desde backend');
    console.log(`📄 Tamaño del PDF: ${pdfResponse.data.length} bytes`);

  } catch (error) {
    console.error('❌ Error generando PDF desde backend:', error.response?.data || error.message);
    console.log('🔄 El frontend usará jsPDF como alternativa automática');
  }
}

async function runTests() {
  await testCotizacionAPI();
  await testPdfGeneration();
  console.log('\n🏁 Pruebas completadas');
}

runTests();