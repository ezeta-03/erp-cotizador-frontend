# Frontend - Sistema de Cotización ZAAZMAGO

## 🚀 Despliegue en Vercel

### 1. Conectar repositorio
1. Ve a [vercel.com](https://vercel.com) y conecta tu repositorio de GitHub
2. Selecciona el proyecto `frontend`
3. Configura el build command: `npm run build`
4. Configura el output directory: `dist`

### 2. Variables de Entorno en Vercel
En el dashboard de Vercel → Project Settings → Environment Variables:

```env
VITE_API_URL=https://tu-backend-en-render.onrender.com/api
```

### 3. Build Settings
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend` (si está en subdirectorio)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Deploy
Una vez configurado, cada push a `main` hará deploy automático.

## 🔧 Configuración Local

### Variables de Entorno

#### Desarrollo (.env)
```env
VITE_API_URL=http://localhost:4000/api
```

#### Producción (.env.production)
```env
VITE_API_URL=https://erp-cotizador-backend.onrender.com/api
```

### Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🌍 Entornos

### Desarrollo
- **URL**: `http://localhost:5173`
- **API**: `http://localhost:4000/api`
- **Datos**: Cotizaciones ficticias para testing

### Producción
- **URL**: `https://tu-frontend.vercel.app`
- **API**: `https://erp-cotizador-backend.onrender.com/api`
- **Datos**: Cotizaciones reales de la base de datos

## 🔧 Configuración por Entorno

La aplicación detecta automáticamente el entorno de build:

- **Desarrollo**: Vite usa `.env`
- **Producción**: Vite usa `.env.production`

## 📱 Funcionalidades

- ✅ Dashboard administrativo
- ✅ Gestión de cotizaciones
- ✅ Generación de PDFs
- ✅ Autenticación JWT
- ✅ Roles de usuario (ADMIN, VENTAS, CLIENTE)

## 🐛 Troubleshooting

### API no conecta
1. Verificar VITE_API_URL en el entorno correspondiente
2. Revisar CORS en el backend
3. Verificar que el backend esté ejecutándose

### Build falla en Vercel
1. Verificar que el **Root Directory** esté configurado como `frontend`
2. Asegurarse de que **VITE_API_URL** esté configurado en Environment Variables
3. Revisar los logs de build en Vercel para errores específicos
4. Si hay errores de sintaxis, ejecutar `npm run build` localmente primero

### Error "Unexpected export"
- Verificar que todos los archivos `.js` tengan sintaxis correcta
- Asegurarse de que los imports/exports estén bien formateados
- Revisar que no haya código suelto fuera de funciones

### PDFs no se generan
- Verificar que el backend esté configurado correctamente
- Revisar que las variables de entorno del backend estén bien
- Usar la función fallback con jsPDF si Puppeteer falla
3. Revisar logs de build para errores específicos

### PDF no descarga
1. Verificar que el backend esté configurado correctamente
2. Revisar logs del backend durante la generación del PDF
3. Verificar permisos de usuario para acceder a la cotización
4. **En producción**: Verificar que Render tenga suficiente memoria (1GB+) para Puppeteer

### Sistema de PDF Inteligente
La aplicación incluye un sistema inteligente de generación de PDFs:

- **Primera opción**: Puppeteer en el backend (mejor calidad, requiere más recursos)
- **Fallback automático**: jsPDF en el frontend (compatible con Vercel, Supabase, Render)
- **Compatible con**: Vercel, Netlify, Render, Railway, DigitalOcean, AWS, etc.

### Si Puppeteer falla en producción:
- El sistema automáticamente usa jsPDF como alternativa
- Los PDFs generados con jsPDF tienen calidad aceptable
- No requiere configuración especial del servidor

### Problemas conocidos en producción
- **PDF no se genera**: Puppeteer puede fallar en entornos con poca memoria
- **Error "Puppeteer launch failed"**: Indica problemas con Chrome en el servidor
- **Timeout**: Los PDFs pueden tardar hasta 2 minutos en generarse