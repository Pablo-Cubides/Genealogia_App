import networkx as nx

def to_hierarchy(personas):
    # convierte la lista plana en una jerarquía simple para visualización
    mapa = {p['id']: {**p, 'children': []} for p in personas}
    roots = []
    for p in mapa.values():
        if not p.get('padres'):
            roots.append(p)
        else:
            for padre in p.get('padres'):
                if padre in mapa:
                    mapa[padre]['children'].append(p)
                else:
                    roots.append(p)
    if len(roots) == 1:
        return roots[0]
    return {'id':'root', 'nombre':'Familia', 'children': roots}
