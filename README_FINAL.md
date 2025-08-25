# Genealogía Dinámica - Microservicio Docker

Aplicación web completa para crear y visualizar árboles genealógicos con Next.js 15 y FastAPI.

## 🚀 Inicio Rápido

### Requisitos
- Docker Desktop
- PowerShell (Windows) o bash (Linux/Mac)

### Levantar la aplicación

```powershell
cd "d:\Mis aplicaciones\genealogia"
docker compose up -d
```

### Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

## 🔧 Funcionalidades Implementadas

### ✅ Completadas
- **Backend FastAPI**: Endpoints para parseo y validación de archivos
- **Frontend Next.js 15**: Interfaz para subir archivos y visualizar datos
- **Soporte de formatos**: JSON, CSV, Excel (xlsx)
- **Validación**: Detección de ciclos y referencias faltantes
- **Interfaz en español**: Todos los mensajes y UI en español
- **Docker Compose**: Levantamiento completo con un comando

### 🚧 Pendientes (próximas funcionalidades)
- Edición inline de personas y relaciones
- Visualización gráfica del árbol con D3.js
- Export a PNG/PDF/SVG
- Formularios para crear familias desde cero

## 📂 Estructura del Proyecto

```
genealogia/
├── docker-compose.yml          # Orquestación de servicios
├── backend/                    # API FastAPI
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py            # Endpoints principales
│   │   ├── utils.py           # Utilidades
│   │   └── sample_personas.json
└── frontend/                   # UI Next.js 15
    ├── Dockerfile
    ├── package.json
    ├── app/
    │   ├── page.tsx           # Página principal
    │   ├── layout.tsx         # Layout base
    │   └── globals.css        # Estilos
```

## 🧪 Probar la aplicación

### Subir archivo de ejemplo
1. Ve a http://localhost:3000
2. Selecciona el archivo `backend/app/sample_personas.json`
3. Haz clic en "Subir y analizar"
4. Verás la lista de personas parseadas

### Probar API directamente
```powershell
# Parsear archivo JSON
curl -X POST -F "file=@backend/app/sample_personas.json" http://localhost:8000/parse

# Validar datos manualmente
curl -X POST -H "Content-Type: application/json" -d '[{"id":"1","nombre":"Test","padres":[]}]' http://localhost:8000/validate
```

## 🔄 Comandos útiles

```powershell
# Levantar en modo desarrollo (con logs)
docker compose up --build

# Detener servicios
docker compose down

# Ver logs específicos
docker compose logs backend
docker compose logs frontend

# Reconstruir imágenes
docker compose build --no-cache

# Reiniciar un servicio específico
docker compose restart backend
```

## 🐛 Solución de problemas

### Frontend no carga
1. Verificar que no hay errores de build: `docker compose logs frontend`
2. Reiniciar el servicio: `docker compose restart frontend`

### Backend no responde
1. Verificar logs: `docker compose logs backend`  
2. Probar conectividad: `curl http://localhost:8000/docs`

### Error de permisos Docker
1. Asegúrate de que Docker Desktop esté ejecutándose
2. En Windows, ejecuta PowerShell como administrador si es necesario

## 📋 Formato de datos esperado

### JSON
```json
[
  {
    "id": "1",
    "nombre": "Juan Pérez",
    "fecha_nacimiento": "1950-01-01",
    "genero": "M",
    "padres": []
  },
  {
    "id": "2", 
    "nombre": "María López",
    "fecha_nacimiento": "1975-05-10",
    "genero": "F",
    "padres": ["1"]
  }
]
```

### CSV
```csv
id,nombre,fecha_nacimiento,genero,padres
1,Juan Pérez,1950-01-01,M,
2,María López,1975-05-10,F,1
```

## 🔧 Variables de entorno

### Frontend
- `NEXT_PUBLIC_BACKEND_URL`: URL del backend (default: http://localhost:8000)

### Configuración en docker-compose.yml
- El frontend automáticamente usa `http://backend:8000` cuando corre en Docker
- Para desarrollo local, usar `http://localhost:8000`

## 📈 Próximos pasos sugeridos

1. **Visualización**: Implementar árbol interactivo con D3.js
2. **CRUD**: Formularios para crear/editar/eliminar personas
3. **Export**: Funcionalidad de descarga en múltiples formatos
4. **Autenticación**: Sistema de usuarios para árboles privados
5. **Deploy**: Configuración para producción (Heroku, Railway, etc.)

---

**Estado**: ✅ Funcional y listo para usar
**Última actualización**: Agosto 2025
