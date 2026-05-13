export const colorscale = [
  [0, '#fdf4e3'], [0.20, '#f8d89c'], [0.42, '#eda845'],
  [0.65, '#c4661e'], [0.85, '#8b3910'], [1, '#4d1805'],
];

export function centroid(feature) {
  const geom = feature.geometry;
  const ring = geom.type === 'MultiPolygon'
    ? geom.coordinates.map(p => p[0]).reduce((a, b) => a.length >= b.length ? a : b)
    : geom.coordinates[0];
  const n = ring.length;
  const sumLon = ring.reduce((s, [lon]) => s + lon, 0);
  const sumLat = ring.reduce((s, [, lat]) => s + lat, 0);
  return [sumLon / n, sumLat / n];
}

export function spreadLats(features, latMin, latMax) {
  const n = features.length;
  const step = (latMax - latMin) / n;
  const byLat = features
    .map((f, i) => ({ i, lat: centroid(f)[1] }))
    .sort((a, b) => b.lat - a.lat);
  const result = new Array(n);
  byLat.forEach(({ i }, rank) => {
    result[i] = latMax - (rank + 0.5) * step;
  });
  return result;
}

export function buildChoropleth(features, geoAxis, showColorbar, data) {
  const ids = features.map(f => f.id);
  return {
    type: 'choropleth',
    geo: geoAxis,
    geojson: { type: 'FeatureCollection', features },
    locations: ids,
    z: ids.map(id => data[id]?.valor),
    text: ids.map(id => data[id] ? `<b>${data[id].nombre}</b><br>${data[id].valor}%` : id),
    hovertemplate: '%{text}<extra></extra>',
    colorscale,
    zmin: 0, zmax: 100,
    showscale: showColorbar,
    colorbar: {
      title: {
        text: 'participación',
        side: 'right',
        font: { size: 20, color: '#4A4540', family: 'Inter, sans-serif' },
      },
      ticksuffix: '%',
      tickfont: { size: 16, color: '#4A4540', family: 'Inter, sans-serif' },
      thickness: 14,
      len: 0.60,
      x: 1.02,
      y: 0.5,
      outlinewidth: 0,
      bgcolor: 'rgba(0,0,0,0)',
    },
    marker: { line: { color: '#faf9f7', width: 1 } },
  };
}

export function buildLabels(features, geoAxis, fixedLon, labelLats, data) {
  return {
    type: 'scattergeo',
    geo: geoAxis,
    lon: features.map(() => fixedLon),
    lat: labelLats,
    text: features.map(f => data[f.id] ? `<b>${data[f.id].nombre}</b><br>${data[f.id].valor}%` : f.id),
    mode: 'text',
    textposition: 'middle center',
    textfont: { size: 14, color: '#1c1c2e', family: 'Inter, sans-serif' },
    hoverinfo: 'skip',
  };
}

export function buildConnectors(features, geoAxis, fixedLon, labelLats, lineEdgeOffset, arrowSymbol) {
  const lons = [], lats = [];
  const arrowLons = [], arrowLats = [];
  features.forEach((f, i) => {
    const [clon, clat] = centroid(f);
    lons.push(fixedLon + lineEdgeOffset, clon, null);
    lats.push(labelLats[i], clat, null);
    arrowLons.push(clon);
    arrowLats.push(clat);
  });
  return [
    {
      type: 'scattergeo', geo: geoAxis,
      lon: lons, lat: lats,
      mode: 'lines',
      line: { color: '#b8afa6', width: 1 },
      hoverinfo: 'skip',
    },
    {
      type: 'scattergeo', geo: geoAxis,
      lon: arrowLons, lat: arrowLats,
      mode: 'markers',
      marker: { symbol: arrowSymbol, size: 5, color: '#b8afa6' },
      hoverinfo: 'skip',
    },
  ];
}