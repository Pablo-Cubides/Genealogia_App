from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import json
import networkx as nx
from typing import List, Optional, Dict
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import shutil

app = FastAPI(title="Genealogía Dinámica - Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Person(BaseModel):
    id: str
    nombre: str
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    padres: Optional[List[str]] = []
    avatar: Optional[str] = None

class ParseResult(BaseModel):
    personas: List[Person]
    errores: List[str]


def build_graph(persons):
    G = nx.DiGraph()
    for p in persons:
        G.add_node(p['id'], **p)
    for p in persons:
        for padre in p.get('padres', []) or []:
            if not G.has_node(padre):
                # missing parent
                continue
            G.add_edge(padre, p['id'])
    return G


def detect_cycles(G):
    try:
        cycles = list(nx.simple_cycles(G))
        return cycles
    except Exception:
        return []

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / '..' / 'data'
UPLOAD_DIR = APP_DIR / '..' / 'uploads'
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR.resolve())), name='uploads')

@app.post('/save_personas')
async def save_personas(persons: List[Person]):
    out = [p.dict() for p in persons]
    fn = DATA_DIR / 'personas.json'
    with open(fn, 'w', encoding='utf-8') as f:
        import json
        json.dump(out, f, ensure_ascii=False, indent=2)
    return { 'status': 'ok', 'path': str(fn) }

@app.post('/upload_avatar/{person_id}')
async def upload_avatar(person_id: str, file: UploadFile = File(...)):
    # save file to uploads directory and return accessible path
    filename = f"{person_id}{Path(file.filename).suffix}"
    dest = UPLOAD_DIR / filename
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    # return URL path
    return { 'url': f"/uploads/{filename}" }

@app.post('/parse', response_model=ParseResult)
async def parse_file(file: UploadFile = File(...)):
    content = await file.read()
    name = file.filename.lower()
    personas = []
    errores = []
    try:
        if name.endswith('.json'):
            data = json.loads(content)
            # Si data es una lista, usarla directamente, si es dict buscar 'personas'
            if isinstance(data, list):
                personas = data
            else:
                personas = data.get('personas', data)
        elif name.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
            personas = df.to_dict(orient='records')
        elif name.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(content))
            personas = df.to_dict(orient='records')
        else:
            raise HTTPException(status_code=400, detail='Formato no soportado')
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # normalize persons
    norm = []
    for i, p in enumerate(personas):
        pid = str(p.get('id') or p.get('ID') or p.get('identificador') or i)
        nombre = p.get('nombre') or p.get('name') or ''
        fecha = p.get('fecha_nacimiento') or p.get('dob') or p.get('fecha') or None
        genero = p.get('genero') or p.get('sex') or p.get('gender') or None
        padres = p.get('padres') or p.get('parents') or []
        if isinstance(padres, str):
            padres = [x.strip() for x in padres.split(';') if x.strip()]
        norm.append({
            'id': pid,
            'nombre': nombre,
            'fecha_nacimiento': fecha,
            'genero': genero,
            'padres': padres
        })

    G = build_graph(norm)
    # detect missing parents
    for p in norm:
        for padre in p.get('padres', []) or []:
            if not G.has_node(padre):
                errores.append(f"Padre/madre referenciado no existe: {padre} (en {p['id']})")

    cycles = detect_cycles(G)
    if cycles:
        errores.append('Se detectaron ciclos en las relaciones: ' + str(cycles))

    return ParseResult(personas=norm, errores=errores)


@app.post('/validate', response_model=ParseResult)
async def validate_persons(persons: List[Person]):
    data = [p.dict() for p in persons]
    G = build_graph(data)
    errores = []
    for p in data:
        for padre in p.get('padres', []) or []:
            if not G.has_node(padre):
                errores.append(f"Padre/madre referenciado no existe: {padre} (en {p['id']})")
    cycles = detect_cycles(G)
    if cycles:
        errores.append('Se detectaron ciclos en las relaciones: ' + str(cycles))
    return ParseResult(personas=data, errores=errores)
