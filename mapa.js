const participacion = {
  'CL-AP': { nombre: 'Arica y Parinacota', valor: 79.61 },
  'CL-TA': { nombre: 'Tarapacá',            valor: 82.38 },
  'CL-AN': { nombre: 'Antofagasta',         valor: 84.21 },
  'CL-AT': { nombre: 'Atacama',             valor: 71.11 },
  'CL-CO': { nombre: 'Coquimbo',            valor: 76.44 },
  'CL-VS': { nombre: 'Valparaíso',          valor: 74.01 },
  'CL-RM': { nombre: 'Metropolitana',       valor: 75.94 },
  'CL-LI': { nombre: "O'Higgins",           valor: 73.84 },
  'CL-ML': { nombre: 'Maule',               valor: 70.45 },
  'CL-NB': { nombre: 'Ñuble',               valor: 67.99 },
  'CL-BI': { nombre: 'Biobío',              valor: 73.79 },
  'CL-AR': { nombre: 'La Araucanía',        valor: 74.30 },
  'CL-LR': { nombre: 'Los Ríos',            valor: 75.01 },
  'CL-LL': { nombre: 'Los Lagos',           valor: 75.18 },
  'CL-AI': { nombre: 'Aysén',               valor: 62.04 },
  'CL-MA': { nombre: 'Magallanes',          valor: 72.11 },
};

const isoNorte = new Set(['CL-AP','CL-TA','CL-AN','CL-AT','CL-CO','CL-VS','CL-RM','CL-LI']);
const isoSur   = new Set(['CL-ML','CL-NB','CL-BI','CL-AR','CL-LR','CL-LL','CL-AI','CL-MA']);

// Arena pálida → ocre → terracota → vino oscuro.
const colorscale = [
  [0,    '#fdf4e3'],
  [0.20, '#f8d89c'],
  [0.42, '#eda845'],
  [0.65, '#c4661e'],
  [0.85, '#8b3910'],
  [1,    '#4d1805'],
];

// Centroide como media de vértices del anillo exterior principal.
function centroid(feature) {
  const geom = feature.geometry;
  const ring = geom.type === 'MultiPolygon'
    ? geom.coordinates.map(p => p[0]).reduce((a, b) => a.length >= b.length ? a : b)
    : geom.coordinates[0];
  const n = ring.length;
  const sumLon = ring.reduce((s, [lon]) => s + lon, 0);
  const sumLat = ring.reduce((s, [, lat]) => s + lat, 0);
  return [sumLon / n, sumLat / n];
}

function buildChoropleth(features, geoAxis, showColorbar) {
  const ids     = features.map(f => f.id);
  const valores = ids.map(id => participacion[id]?.valor);
  return {
    type: 'choropleth',
    geo: geoAxis,
    geojson: { type: 'FeatureCollection', features },
    locations: ids,
    z: valores,
    text: ids.map(id => {
      const d = participacion[id];
      return d ? `<b>${d.nombre}</b><br>${d.valor}%` : id;
    }),
    hovertemplate: '%{text}<extra></extra>',
    colorscale,
    zmin: 60,
    zmax: 87,
    showscale: showColorbar,
    colorbar: {
      title: {
        text: '% participación',
        side: 'right',
        font: { size: 10.5, color: '#999', family: 'Inter, sans-serif' },
      },
      ticksuffix: '%',
      tickfont: { size: 10.5, color: '#999', family: 'Inter, sans-serif' },
      thickness: 9,
      len: 0.60,
      x: 1.02,
      y: 0.5,
      outlinewidth: 0,
      bgcolor: 'rgba(0,0,0,0)',
    },
    marker: { line: { color: '#faf9f7', width: 0.5 } },
  };
}

// Distribuye las latitudes de las etiquetas uniformemente dentro del rango del panel,
// respetando el orden norte-sur de los centroides.
// Devuelve un array de lats en el mismo orden que features.
function spreadLats(features, latMin, latMax) {
  const n = features.length;
  const step = (latMax - latMin) / n;
  // Ordenar por latitud descendente (norte primero) y asignar posición uniforme
  const byLat = features
    .map((f, i) => ({ i, lat: centroid(f)[1] }))
    .sort((a, b) => b.lat - a.lat);
  const result = new Array(n);
  byLat.forEach(({ i }, rank) => {
    result[i] = latMax - (rank + 0.5) * step;
  });
  return result;
}

// Etiquetas como scattergeo fuera del territorio chileno.
// labelLats: array de latitudes uniformemente distribuidas (de spreadLats).
function buildLabels(features, geoAxis, fixedLon, labelLats, textPos, fontSize) {
  const ids = features.map(f => f.id);
  return {
    type: 'scattergeo',
    geo: geoAxis,
    lon: features.map(() => fixedLon),
    lat: labelLats,
    text: ids.map(id => {
      const d = participacion[id];
      return d ? `<b>${d.nombre}</b><br>${d.valor}%` : id;
    }),
    mode: 'text',
    textposition: textPos,
    textfont: { size: fontSize, color: '#1c1c2e', family: 'Inter, sans-serif' },
    hoverinfo: 'skip',
    showlegend: false,
  };
}

// Conectores: línea desde el borde del texto (posición distribuida) hasta el centroide real,
// más un triángulo como punta de flecha en el centroide.
// lineEdgeOffset: grados desde fixedLon al inicio de la línea
//   (+2 para Norte = hacia el este; -2 para Sur = hacia el oeste).
function buildConnectors(features, geoAxis, fixedLon, labelLats, lineEdgeOffset, arrowSymbol) {
  const lons = [], lats = [];
  const arrowLons = [], arrowLats = [];

  features.forEach((f, i) => {
    const [clon, clat] = centroid(f);
    lons.push(fixedLon + lineEdgeOffset, clon, null);
    lats.push(labelLats[i], clat, null);   // parte de la posición distribuida, llega al centroide real
    arrowLons.push(clon);
    arrowLats.push(clat);
  });

  return [
    {
      type: 'scattergeo', geo: geoAxis,
      lon: lons, lat: lats,
      mode: 'lines',
      line: { color: '#b8afa6', width: 0.9 },
      hoverinfo: 'skip', showlegend: false,
    },
    {
      type: 'scattergeo', geo: geoAxis,
      lon: arrowLons, lat: arrowLats,
      mode: 'markers',
      marker: { symbol: arrowSymbol, size: 5, color: '#b8afa6' },
      hoverinfo: 'skip', showlegend: false,
    },
  ];
}

const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

fetch(url)
  .then(r => r.json())
  .then(geojson => {
    const allFeatures = geojson.features
      .filter(f => f.properties.admin === 'Chile')
      .map(f => ({ ...f, id: f.properties.iso_3166_2 }));

    const featNorte = allFeatures.filter(f => isoNorte.has(f.id));
    const featSur   = allFeatures.filter(f => isoSur.has(f.id));

    // Lats uniformemente distribuidas para que ninguna etiqueta quede pegada a otra
    const latsNorte = spreadLats(featNorte, -36, -17);
    const latsSur   = spreadLats(featSur,   -57, -34);

    const traces = [
      // Panel izquierdo: Chile completo, sin etiquetas
      buildChoropleth(allFeatures, 'geo', true),
      // Panel central: Norte — etiquetas a la IZQUIERDA, flechas apuntando al centroide
      buildChoropleth(featNorte, 'geo2', false),
      buildLabels(featNorte, 'geo2', -77, latsNorte, 'middle center', 13),
      ...buildConnectors(featNorte, 'geo2', -77, latsNorte, +2.0, 'triangle-right'),
      // Panel derecho: Sur — etiquetas a la DERECHA, flechas apuntando al centroide
      buildChoropleth(featSur, 'geo3', false),
      buildLabels(featSur, 'geo3', -63, latsSur, 'middle center', 13),
      ...buildConnectors(featSur, 'geo3', -63, latsSur, -2.0, 'triangle-left'),
    ];

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 14, b: 30, l: 0, r: 80 },

      // Mapa completo de Chile — sin etiquetas
      geo: {
        domain: { x: [0, 0.15], y: [0.02, 0.98] },
        visible: false,
        bgcolor: '#d4e8f2',
        lataxis: { range: [-57, -17] },
        lonaxis: { range: [-76, -65] },
      },

      // Norte: lonaxis extendido ~3° al oeste para alojar las etiquetas
      // (lon -80 a -76 = espacio blanco; lon -76 a -65 = territorio chileno)
      geo2: {
        domain: { x: [0.18, 0.60], y: [0.02, 0.98] },
        visible: false,
        bgcolor: 'rgba(0,0,0,0)',
        lataxis: { range: [-36, -17] },
        lonaxis: { range: [-80, -65] },
      },

      // Sur: lonaxis extendido ~4° al este para alojar las etiquetas
      // (lon -76 a -65 = territorio chileno; lon -65 a -59 = espacio blanco)
      geo3: {
        domain: { x: [0.63, 0.99], y: [0.02, 0.98] },
        visible: false,
        bgcolor: 'rgba(0,0,0,0)',
        lataxis: { range: [-57, -34] },
        lonaxis: { range: [-76, -59] },
      },

      // Divisores sutiles
      shapes: [
        {
          type: 'line', xref: 'paper', yref: 'paper',
          x0: 0.16, y0: 0.04, x1: 0.16, y1: 0.96,
          line: { color: '#e0dbd4', width: 1 },
        },
        {
          type: 'line', xref: 'paper', yref: 'paper',
          x0: 0.61, y0: 0.04, x1: 0.61, y1: 0.96,
          line: { color: '#e0dbd4', width: 1 },
        },
      ],

      annotations: [
        {
          text: 'Fuente: Ministerio de las Culturas — ENPC 2024',
          x: 0.5, y: -0.01,
          xref: 'paper', yref: 'paper',
          showarrow: false, xanchor: 'center', yanchor: 'top',
          font: { size: 10, color: '#c0b8b0', family: 'Inter, sans-serif' },
        },
      ],
    };

    Plotly.newPlot('map', traces, layout, { responsive: true });
  });
