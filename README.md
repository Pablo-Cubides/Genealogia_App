Genealogía Dinámica - microservicio

Estructura:
- backend: FastAPI
- frontend: Next.js 15 (App Router)

Levantar con Docker Compose:

```powershell
docker compose up --build
```

Endpoints backend:
- POST /parse -> subir archivo (xlsx/csv/json)
- POST /validate -> validar lista JSON de personas

Interfaz en español; frontend básico listo para extender.

PowerShell (Windows) - pasos rápidos:

```powershell
cd "d:\\Mis aplicaciones\\genealogia"
docker compose up --build
```

Probar localmente sin Docker (backend):

```powershell
cd "d:\\Mis aplicaciones\\genealogia\\backend"
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Prueba de ejemplo (curl):

```powershell
curl -F "file=@backend/app/sample_personas.json" http://localhost:8000/parse
```

Estado actual vs requisitos:

- Subida y parseo de archivos (xlsx/csv/json): Implementado en `/parse` (FastAPI) — Done
- Validación y detección de ciclos/missing parents: Implementado en `/validate` y check en `/parse` — Done
- Frontend con Next.js 15 y Tailwind: Scaffold implementado con upload y visualización D3 básica — Partial (UI básica, aún mejorar diseño)
- Visualización de árbol dinámica: Implementación básica con D3 en `TreeCanvas` — Partial (interactividad limitada)
- Edición en línea / export (PNG/PDF/CSV): No implementado completamente — Deferred (se puede agregar)
- Localización en español: Endpoints y UI textos básicos en español — Partial

Siguientes pasos sugeridos:
- Añadir formularios editables y tabla para crear/editar personas en UI.
- Añadir export a PNG/PDF/SVG y descarga CSV/JSON.
- Mejorar diseño Tailwind, accesibilidad y temas (contrast friendly).
- Añadir tests automáticos y CI.

