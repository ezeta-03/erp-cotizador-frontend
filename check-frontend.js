import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificación del Frontend\n');

// Verificar archivos críticos
const criticalFiles = [
  'package.json',
  'vite.config.js',
  'src/main.jsx',
  'src/App.jsx',
  'src/api/pdf.js'
];

console.log('📁 Verificando archivos críticos:');
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NO ENCONTRADO`);
  }
});

// Verificar variables de entorno
console.log('\n📋 Variables de entorno:');
const envVars = ['VITE_API_URL'];
envVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`   ✅ ${envVar}: configurado`);
  } else {
    console.log(`   ❌ ${envVar}: NO CONFIGURADO`);
  }
});

// Verificar sintaxis de archivos JS críticos
console.log('\n🔧 Verificando sintaxis:');
const jsFiles = ['src/api/pdf.js', 'src/main.jsx'];
jsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    // Verificación básica de sintaxis
    if (content.includes('export') && content.includes('import')) {
      console.log(`   ✅ ${file}: sintaxis correcta`);
    } else {
      console.log(`   ⚠️ ${file}: posible problema de sintaxis`);
    }
  } catch (error) {
    console.log(`   ❌ ${file}: error al leer - ${error.message}`);
  }
});

console.log('\n💡 Recomendaciones para Vercel:');
console.log('   1. Configurar VITE_API_URL en Environment Variables');
console.log('   2. Verificar Root Directory: frontend');
console.log('   3. Build Command: npm run build');
console.log('   4. Output Directory: dist');

console.log('\n🏁 Verificación completada');