 'use client'
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as d3 from 'd3'

// Accept either hierarchical data or flat personas array
function buildHierarchyFromList(personas: any[]){
  const map = new Map(personas.map(p=>[p.id, {...p, children: []}]))
  const allIds = new Set(personas.map(p => p.id))
  const roots: any[] = []
  
  for(const p of personas){
    const node = map.get(p.id)
    const padres = (p.padres || []).filter((padreId: string) => allIds.has(padreId)) // Solo padres que existen en el dataset
    
    if(!padres || padres.length === 0){
      roots.push(node)
    } else {
      // attach to first existing parent if available, otherwise treat as root
      let attached = false
      for(const pr of padres){
        const par = map.get(pr)
        if(par){ par.children.push(node); attached = true; break }
      }
      if(!attached) roots.push(node)
    }
  }
  // if multiple roots, create a virtual root
  if(roots.length === 1) return roots[0]
  return { id: 'root', nombre: 'Raíz', children: roots }
}

const TreeCanvas = forwardRef(function TreeCanvas({ data, onSelect, presets }: { data: any, onSelect?: (p:any)=>void, presets?: Record<string,string[]> }, ref){
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(()=>{
    if(!data || !containerRef.current) return;
    const el = containerRef.current;
    el.innerHTML = '';
    const width = el.clientWidth || 800;
    const dx = 24;
    const dy = 140;

    // normalize data
    const rootData = Array.isArray(data) ? buildHierarchyFromList(data) : data
    // Build hierarchy and compute positions with a custom layout:
    // - assign sequential x to leaves
    // - parent x = mean(children.x)
    // - apply per-depth collision shifts by moving whole subtrees
    const root = d3.hierarchy(rootData as any)
    // initialize y positions based on depth
    root.each((d:any)=>{ d.y = d.depth * dy })

    const minGap = 120
    // post-order assign x
    let nextX = 0
    function assignX(node: any){
      if(!node.children || node.children.length === 0){
        node.x = nextX
        nextX += minGap
      } else {
        node.children.forEach((c:any)=> assignX(c))
        node.x = node.children.reduce((s:any,c:any)=> s + c.x, 0) / node.children.length
      }
    }
    assignX(root)

    // collision avoidance: for each depth, ensure nodes separated by minGap
    const depthMap = new Map<number, any[]>()
    root.descendants().forEach((n:any)=>{
      const arr = depthMap.get(n.depth) || []
      arr.push(n)
      depthMap.set(n.depth, arr)
    })
    // helper to shift subtree (node and all descendants)
    function shiftSubtree(node:any, delta:number){
      node.x += delta
      if(node.children) node.children.forEach((c:any)=> shiftSubtree(c, delta))
    }
    // apply left-to-right scan per depth
    Array.from(depthMap.keys()).sort((a,b)=>a-b).forEach(depth=>{
      const arr = depthMap.get(depth) || []
      arr.sort((a:any,b:any)=> a.x - b.x)
      for(let i=1;i<arr.length;i++){
        const prev = arr[i-1]
        const cur = arr[i]
        const needed = prev.x + minGap
        if(cur.x < needed){
          const shift = needed - cur.x
          // shift current subtree and also any later nodes at same depth
          shiftSubtree(cur, shift)
          for(let j=i+1;j<arr.length;j++) shiftSubtree(arr[j], shift)
        }
      }
    })

    // convert to a tree-like layout object for links and rendering
    const rootT = root

    // compute x bounds to avoid overlap and set viewBox accordingly
    const xs = rootT.descendants().map(d=>d.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const vbWidth = Math.max(800, (maxX - minX) + 240)
    const svg = d3.create('svg')
      .attr('viewBox', [minX - 120, -80, vbWidth, Math.max(400, rootT.height * dx + 160)])
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      .style('width', '100%')
      .style('height', 'auto')
      .attr('role','img')
      .attr('aria-label','Árbol genealógico')

    svgRef.current = svg.node() as any

    const g = svg.append('g')

    const nodeById = new Map(rootT.descendants().map((d:any)=>[d.data.id, d]))
    // primary tree links
    g.append('g')
      .selectAll('path')
      .data(rootT.links())
      .join('path')
      .attr('d', (d:any)=> {
        // use adjusted x positions
        return d3.linkVertical().x((p:any)=>p.x).y((p:any)=>p.y)(d)
      })
      .attr('fill', 'none')
      .attr('stroke', '#9CA3AF')
      .attr('stroke-width', 1.2)

    // extra parent links (non-primary parents) - only for existing nodes
    const extraLinks: any[] = []
    const visibleIds = new Set(rootT.descendants().map((d:any) => d.data.id))
    
    rootT.descendants().forEach((d:any)=>{
      const pid = d.data.id
      const padres = d.data.padres || []
      for(const p of padres){
        // Only create links if both parent and child are visible in the tree
        if(visibleIds.has(p)){
          const parentNode = nodeById.get(p)
          if(parentNode && parentNode !== d.parent){
            extraLinks.push({ source: parentNode, target: d })
          }
        }
      }
    })

    g.append('g')
      .selectAll('path.extra')
      .data(extraLinks)
      .join('path')
      .attr('class','extra')
      .attr('d', (d:any)=> d3.linkVertical().x((p:any)=>p.x).y((p:any)=>p.y)(d))
      .attr('fill','none')
      .attr('stroke','#6b7280')
      .attr('stroke-width',1)
      .attr('stroke-dasharray','4 4')

    // exclude the virtual root from rendering (if it exists and id==='root')
    const toRender = rootT.descendants().filter(d=> !(d.data && d.data.id === 'root'))

    const node = g.append('g')
      .selectAll('g')
      .data(toRender)
      .join('g')
      .attr('transform', d=>`translate(${d.x},${d.y})`)

    // normalize various genero values to preset keys
    function genderKey(g?: string | null){
      const v = (g||'').toString().trim().toLowerCase()
      if(v === 'm' || v === 'masculino') return 'M'
      if(v === 'f' || v === 'femenino') return 'F'
      return 'Otro'
    }

    // render avatar image if provided, otherwise circle
    node.each(function(d:any){
      const el = d3.select(this)
      // decide avatar: explicit avatar URL, otherwise preset based on genero
      let avatarUrl = d.data && d.data.avatar ? d.data.avatar : null
      if(!avatarUrl && presets){
        const gen = genderKey(d.data && d.data.genero ? d.data.genero : null)
        const list = presets[gen] || presets['Otro'] || []
        if(list && list.length){
          // deterministic pick by id hash
          const hash = String(d.data.id).split('').reduce((acc,c)=>acc + c.charCodeAt(0), 0)
          const pick = list[hash % list.length]
          avatarUrl = pick // use relative path directly
        }
      }

      const imgSize = 36
      if(avatarUrl){
        // create circular clip path
        const clipId = `clip-${String(d.data.id).replace(/[^a-zA-Z0-9_-]/g,'')}`
        el.append('defs').append('clipPath').attr('id', clipId).append('circle').attr('r', imgSize/2).attr('cx',0).attr('cy',0)
        
        // ensure absolute URL
        const absAvatar = String(avatarUrl).startsWith('http') ? String(avatarUrl) : `${window.location.protocol}//${window.location.host}${String(avatarUrl)}`
        
        // render image directly (no preloading)
        el.append('image')
          .attr('href', absAvatar)
          .attr('xlink:href', absAvatar)
          .attr('x', -imgSize/2)
          .attr('y', -imgSize/2)
          .attr('width', imgSize)
          .attr('height', imgSize)
          .attr('clip-path', `url(#${clipId})`)
          .style('cursor', 'pointer')
      } else {
        // fallback circle
        el.append('circle').attr('r', 18).attr('fill', '#fff').attr('stroke', '#2563eb')
      }
      
      el.append('text').attr('dy', '0.35em').attr('x', 26).text((d:any)=>d.data.nombre || d.data.id)
    })

    // click handler to surface info via callback
    node.style('cursor','pointer').on('click', (event,d:any)=>{
      if(onSelect) onSelect(d.data)
    })

  el.appendChild(svg.node())
  }, [data])

  useImperativeHandle(ref, ()=>({
    getSVG: ()=> svgRef.current
  }))

  return <div ref={containerRef} className="w-full" />
})

export default TreeCanvas
