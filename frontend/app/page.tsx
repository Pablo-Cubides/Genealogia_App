 'use client'

import React, { useMemo, useRef, useState } from 'react'
import TreeCanvas from './components/TreeCanvas'

type Persona = {
  id: string
  nombre: string
  fecha_nacimiento?: string | null
  genero?: string | null
  padres?: string[]
  avatar?: string | null
}

export default function Page(){
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ personas: Persona[]; errores: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<boolean>(false)
  const [rows, setRows] = useState<Persona[]>([{
    id: '1', nombre: 'Persona 1', fecha_nacimiento: '', genero: '', padres: []
  }])
  const treeRef = useRef<any>(null)
  const [selected, setSelected] = useState<Persona | null>(null)
  // runtime backend base URL (browser-accessible host:port)
  const backendBase = (typeof window !== 'undefined')
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

  async function upload(){
    if(!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${backendBase}/parse`, {method:'POST', body:fd});
    const j = await r.json();
    setResult(j);
    setError(j.errores && j.errores.length ? j.errores.join('\n') : null);
    if(j.personas) setRows(j.personas)
  }

  // Determine backend URL at runtime so browser can reach the host-mapped port.
  const base = backendBase

  function parseToISO(v: string){
    if(!v) return ''
    v = v.trim()
    // If already ISO-ish
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v)
    if(iso) return v
    // common dd/mm/yyyy or dd-mm-yyyy
    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(v)
    if(dmy){
      let day = dmy[1].padStart(2,'0')
      let month = dmy[2].padStart(2,'0')
      let year = dmy[3]
      if(year.length === 2) year = '19' + year // naive two-digit year -> 1900s
      return `${year}-${month}-${day}`
    }
    // try Date parse fallback
    const dt = new Date(v)
    if(!isNaN(dt.getTime())){
      const y = dt.getFullYear()
      const m = String(dt.getMonth()+1).padStart(2,'0')
      const d = String(dt.getDate()).padStart(2,'0')
      return `${y}-${m}-${d}`
    }
    return ''
  }

  async function validateRows(){
    try{
      const r = await fetch(`${base}/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) })
      if(!r.ok){
        const txt = await r.text()
        setError(`Error del servidor: ${r.status} ${r.statusText} - ${txt}`)
        return
      }
      const j = await r.json()
      setResult(j)
      setError(j.errores && j.errores.length ? j.errores.join('\n') : null)
    }catch(err:any){
      setError('Error de red: ' + (err.message || String(err)))
    }
  }

  function addRow(){
    const nextId = (rows.length + 1).toString()
    setRows([...rows, { id: nextId, nombre: `Persona ${nextId}`, fecha_nacimiento: '', genero: '', padres: [] }])
  }
  function removeRow(index: number){
    const copy = rows.slice();
    copy.splice(index, 1)
    setRows(copy)
  }
  function updateRow<K extends keyof Persona>(index: number, key: K, value: Persona[K]){
    const copy = rows.slice();
    // @ts-ignore simple mutable update
    // normalize dates if updating fecha_nacimiento
    if(key === 'fecha_nacimiento' && typeof value === 'string'){
      const parsed = parseToISO(value as string)
      // prefer parsed ISO if available, otherwise store raw
      // @ts-ignore
      copy[index][key] = parsed || value
    } else {
      // @ts-ignore
      copy[index][key] = value
    }
    setRows(copy)
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'personas.json'; a.click()
    URL.revokeObjectURL(url)
  }
  function exportCSV(){
    const header = ['id','nombre','fecha_nacimiento','genero','padres']
    const lines = [header.join(',')]
    rows.forEach(r=>{
      const padres = (r.padres||[]).join(';')
      lines.push([r.id, r.nombre, r.fecha_nacimiento||'', r.genero||'', padres].map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'personas.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportSVG(){
    const svg: SVGSVGElement | null = treeRef.current?.getSVG()
    if(!svg) return alert('No hay árbol para exportar')
    const serializer = new XMLSerializer()
    const str = serializer.serializeToString(svg)
    const blob = new Blob([str], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'arbol.svg'; a.click(); URL.revokeObjectURL(url)
  }

  async function exportPNG(){
    const svg: SVGSVGElement | null = treeRef.current?.getSVG()
    if(!svg) return alert('No hay árbol para exportar')
    const serializer = new XMLSerializer()
    const str = serializer.serializeToString(svg)
    const img = new Image()
    const svgBlob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    await new Promise<void>((res, rej)=>{ img.onload = ()=>res(); img.onerror = ()=>rej(); img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = img.width || 1200
    canvas.height = img.height || 800
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob(b=>{ if(!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'arbol.png'; a.click(); URL.revokeObjectURL(a.href) })
    URL.revokeObjectURL(url)
  }

  function onSelectPersona(p: Persona){
    setSelected(p)
  }

  const presetAvatars: Record<string,string[]> = {
    M: [
      '/presets/m1.png','/presets/m2.png','/presets/m3.png','/presets/m4.png','/presets/m5.png'
    ],
    F: [
      '/presets/f1.png','/presets/f2.png','/presets/f3.png','/presets/f4.png','/presets/f5.png'
    ],
    Otro: [
      '/presets/o1.png','/presets/o2.png','/presets/o3.png','/presets/o4.png','/presets/o5.png'
    ]
  }

  function choosePreset(url: string){
    if(!selected) return
    const idx = rows.findIndex(r=>r.id === selected.id)
    if(idx<0) return
    const copy = rows.slice()
    // @ts-ignore
    copy[idx].avatar = `${window.location.protocol}//${window.location.host}${url}`
    setRows(copy)
    setSelected(copy[idx])
  }

  function presetAbsolute(u: string){
    if(!u) return u
    return String(u).startsWith('http') ? String(u) : `${window.location.protocol}//${window.location.host}${String(u)}`
  }

  function onAvatarUpload(file: File | null){
    if(!file || !selected) return
    const fd = new FormData()
    fd.append('file', file)
  const base = backendBase
  fetch(`${base}/upload_avatar/${selected.id}`, { method: 'POST', body: fd })
      .then(async r=>{
        if(!r.ok){
          const txt = await r.text().catch(()=>String(r.statusText))
          throw new Error(`HTTP ${r.status}: ${txt}`)
        }
        return r.json()
      })
      .then(j=>{
        const url = (j && j.url) ? j.url : null
        if(url){
          const idx = rows.findIndex(r=>r.id === selected.id)
          if(idx >= 0){
            const copy = rows.slice()
            // handle absolute or relative URL returned by backend
            const abs = String(url).startsWith('http') ? String(url) : `${base}${url}`
            // @ts-ignore
            copy[idx].avatar = abs
            setRows(copy)
            setSelected(copy[idx])
          }
        }
      })
      .catch(err=> alert('Error subiendo avatar: '+ (err && err.message ? err.message : String(err))))
  }

  async function savePersonas(){
  const base = backendBase
  const r = await fetch(`${base}/save_personas`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(rows) })
    if(!r.ok){ alert('Error guardando personas') ; return }
    alert('Guardado OK')
  }

  const hasResult = !!(result && result.personas)

  return (
    <div style={{minHeight: '100vh', backgroundColor: 'white', padding: '32px', color: '#374151'}}>
      <h1 style={{fontSize: '30px', fontWeight: '600'}}>Genealogía Dinámica</h1>
      <p style={{fontSize: '14px', color: '#6b7280'}}>Interfaz en español — sube un archivo Excel/CSV/JSON o edita manualmente.</p>

      <div style={{marginTop: '24px', display: 'flex', gap: 8, alignItems: 'center'}}>
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button onClick={upload} style={{padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Subir y analizar</button>
        <span style={{marginLeft: 8, color: '#6b7280'}}>|</span>
        <button onClick={()=>setEditMode(v=>!v)} style={{padding: '8px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>
          {editMode ? 'Cerrar edición manual' : 'Editar manualmente'}
        </button>
        {editMode && (
          <>
            <button onClick={addRow} style={{padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Añadir persona</button>
            <button onClick={validateRows} style={{padding: '8px 16px', backgroundColor: '#0ea5e9', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Validar</button>
            <button onClick={savePersonas} style={{padding: '8px 16px', backgroundColor: '#0f766e', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Guardar</button>
            <button onClick={exportJSON} style={{padding: '8px 16px', backgroundColor: '#111827', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Exportar JSON</button>
            <button onClick={exportCSV} style={{padding: '8px 16px', backgroundColor: '#374151', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer'}}>Exportar CSV</button>
          </>
        )}
      </div>

      {error && <pre style={{marginTop: '16px', color: '#dc2626'}}>{error}</pre>}

  {editMode && (
        <div style={{marginTop: 24}}>
          <h2 style={{fontSize: 20, fontWeight: 500}}>Edición manual</h2>
          <div style={{overflowX: 'auto', marginTop: 12}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr>
                  {['ID','Nombre','Fecha nacimiento','Género','Padres (IDs separados por ;)','Acciones'].map(h=>
                    <th key={h} style={{borderBottom: '1px solid #e5e7eb', textAlign: 'left', padding: 8, fontWeight: 600}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i)=> (
                  <tr key={i}>
                    <td style={{padding: 8}}>
                      <input value={row.id} onChange={e=>updateRow(i,'id', e.target.value)} style={{width: '100%'}} />
                    </td>
                    <td style={{padding: 8}}>
                      <input value={row.nombre} onChange={e=>updateRow(i,'nombre', e.target.value)} style={{width: '100%'}} />
                    </td>
                    <td style={{padding: 8}}>
                      <input type="date" value={row.fecha_nacimiento||''} onChange={e=>updateRow(i,'fecha_nacimiento', e.target.value)} style={{width: '100%'}} placeholder="YYYY-MM-DD" />
                      <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>También puedes escribir una fecha (ej. 31/12/1980) y el sistema la parseará.</div>
                    </td>
                    <td style={{padding: 8}}>
                      <select value={row.genero||''} onChange={e=>updateRow(i,'genero', e.target.value)} style={{width: '100%'}}>
                        <option value="">—</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </td>
                    <td style={{padding: 8}}>
                      <input value={(row.padres||[]).join(';')} onChange={e=>updateRow(i,'padres', e.target.value.split(';').map(s=>s.trim()).filter(Boolean))} style={{width: '100%'}} placeholder="1;2" />
                    </td>
                    <td style={{padding: 8}}>
                      <button onClick={()=>removeRow(i)} style={{padding: '6px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <pre style={{marginTop: 12, color: '#dc2626'}}>{error}</pre>}
        </div>
      )}

      {hasResult && !editMode && (
        <div style={{marginTop: 24}}>
          <h2 style={{fontSize: 20, fontWeight: 500}}>Personas</h2>
          <pre style={{backgroundColor: '#f3f4f6', padding: 16, borderRadius: 4, marginTop: 8}}>{JSON.stringify(result!.personas, null, 2)}</pre>
        </div>
      )}

      <div style={{marginTop: 24}}>
        <h2 style={{fontSize: 20, fontWeight: 500}}>Visualización</h2>
        <p style={{color: '#6b7280', marginTop: 8}}>El árbol se genera desde las filas actuales (editor o archivo subido).</p>
        <div style={{marginTop: 12}}>
          <button onClick={exportSVG} style={{padding: '8px 12px', marginRight: 8, background: '#111827', color: 'white', border: 'none', borderRadius: 4}}>Exportar SVG</button>
          <button onClick={exportPNG} style={{padding: '8px 12px', marginRight: 8, background: '#111827', color: 'white', border: 'none', borderRadius: 4}}>Exportar PNG</button>
        </div>
        <div style={{display:'flex', gap:12, marginTop: 12}}>
            <div style={{flex:1, border: '1px solid #e5e7eb', padding: 12}}>
            <TreeCanvas ref={treeRef} data={rows} onSelect={onSelectPersona} presets={presetAvatars} />
          </div>
          <div style={{width:320, border: '1px solid #e5e7eb', padding: 12}}>
            <h3 style={{marginTop:0}}>Detalle</h3>
            {selected ? (
              <div>
                <div style={{display:'flex', gap:12, alignItems:'center'}}>
                  <div style={{width:72,height:72,borderRadius:999,overflow:'hidden',background:'#f3f4f6'}}>
                    {selected.avatar ? <img src={selected.avatar as any} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <div style={{padding:12,color:'#9ca3af'}}>Sin foto</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600}}>{selected.nombre}</div>
                    <div style={{fontSize:12,color:'#6b7280'}}>{selected.fecha_nacimiento || 'Fecha no definida'}</div>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <label style={{display:'block',fontSize:12}}>Subir avatar</label>
                  <input type="file" accept="image/*" onChange={e=>onAvatarUpload(e.target.files?.[0]||null)} />
                </div>
                <div style={{marginTop:12}}>
                  <label style={{display:'block',fontSize:12}}>O elegir avatar preestablecido</label>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                    {(selected && (presetAvatars[selected.genero||'Otro'] || presetAvatars['Otro'])).map((p)=> (
                      <img key={p} src={presetAbsolute(p)} style={{width:48,height:48,borderRadius:999,objectFit:'cover',cursor:'pointer',border:'2px solid transparent'}} onClick={()=>choosePreset(p)} onError={(e)=>{ const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = presetAbsolute('/presets/m1.png'); console.warn('Error cargando preset', p) }} />
                    ))}
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <label style={{display:'block',fontSize:12}}>Editar nombre</label>
                  <input value={selected.nombre} onChange={e=>{const idx=rows.findIndex(r=>r.id===selected.id); if(idx>=0){updateRow(idx,'nombre', e.target.value); setSelected({...rows[idx], nombre:e.target.value})}}} style={{width:'100%'}} />
                </div>
                <div style={{marginTop:12}}>
                  <label style={{display:'block',fontSize:12}}>Fecha nacimiento</label>
                  <input type="date" value={selected.fecha_nacimiento||''} onChange={e=>{const idx=rows.findIndex(r=>r.id===selected.id); if(idx>=0){updateRow(idx,'fecha_nacimiento', e.target.value); setSelected({...rows[idx], fecha_nacimiento:e.target.value})}}} />
                </div>
                <div style={{marginTop:12}}>
                  <label style={{display:'block',fontSize:12}}>Padres (IDs ; separados)</label>
                  <input value={(selected.padres||[]).join(';')} onChange={e=>{const arr=e.target.value.split(';').map(s=>s.trim()).filter(Boolean); const idx=rows.findIndex(r=>r.id===selected.id); if(idx>=0){updateRow(idx,'padres', arr); setSelected({...rows[idx], padres:arr})}}} style={{width:'100%'}} />
                </div>
              </div>
            ) : (
              <div style={{color:'#6b7280'}}>Selecciona un nodo para ver/editar detalles</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
