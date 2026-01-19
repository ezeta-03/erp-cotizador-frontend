# Frontend - Sistema de Cotización ZAAZMAGO

## 🚀 Despliegue

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

### Build falla
1. Ejecutar `npm install` para actualizar dependencias
2. Verificar que todas las variables de entorno estén definidas
3. Revisar logs de build para errores específicos

### PDF no descarga
1. Verificar que el backend esté configurado correctamente
2. Revisar logs del backend durante la generación del PDF
3. Verificar permisos de usuario para acceder a la cotización