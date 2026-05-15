import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as mapUtils from './mapUtils';

import Selector from './Selector';
import { dataSets } from './dataSets';

import Plotly from 'plotly.js-dist-min';
import _createPlotlyComponent from 'react-plotly.js/factory';

// Tuve que hacer esta solución sacada de Gemini para poder usar plotly + Vue + React
const createPlotlyComponent = _createPlotlyComponent.default ?? _createPlotlyComponent;
const Plot = createPlotlyComponent(Plotly);

const menuConfig = {
  total: { 
    label: 'Total País', 
    options: [{ value: 'general', label: 'General' }] 
  },
  sexo: { 
    label: 'Sexo', 
    options: [
      { value: 'hombre', label: 'Hombres' }, 
      { value: 'mujer', label: 'Mujeres' }
    ] 
  },
  edad: { 
    label: 'Tramo Etario', 
    options: [
      { value: 'jovenes', label: 'Jóvenes (15-29)' }, 
      { value: 'adultos', label: 'Adultos (30-64)' },
      { value: 'mayores', label: 'Mayores (65+)' }
    ] 
  },
  socioeconomico: { 
    label: 'Nivel Socioeconómico', 
    options: [
      { value: 'baja', label: 'Clase Baja' }, 
      { value: 'media', label: 'Clase Media' }, 
      { value: 'alta', label: 'Clase Alta' }
    ] 
  },
  educacion: { 
    label: 'Nivel de Educación', 
    options: [
      { value: 'basica', label: 'Educación Básica' }, 
      { value: 'secundaria', label: 'Educación Secundaria' }, 
      { value: 'superior', label: 'Educación Superior' }
    ] 
  },
  discapacidad: { 
    label: 'Discapacidad en el hogar', 
    options: [
      { value: 'discapacidad', label: 'Personas en situación de Discapacidad' }, 
      { value: 'noDiscapacidad', label: 'No hay personas en situación de Discapacidad' }, 
    ] 
  },
  mayores: { 
    label: 'Personas mayores en hogar', 
    options: [
      { value: 'mayores', label: 'Hay personas mayores en el hogar' }, 
      { value: 'noMayores', label: 'No hay personas mayores en el hogar' }, 
    ] 
  }
};

const playSound = (value) => {
  const audioPath = `${import.meta.env.BASE_URL}quack.mp3`;

  const audio = new Audio(audioPath); 
  
  const volume = Math.min(Math.max(value / 100, 0), 1);
  
  audio.volume = volume;
  audio.play().catch(e => {
    console.log("Audio bloqueado");
  });
};

const isoNorte = new Set(['CL-AP','CL-TA','CL-AN','CL-AT','CL-CO','CL-VS','CL-RM','CL-LI']);
const isoSur   = new Set(['CL-ML','CL-NB','CL-BI','CL-AR','CL-LR','CL-LL','CL-AI','CL-MA']);

function App() {
  // Aquí se guarda el GeoJSON completo y el estado del filtro
  const [geoJson, setGeoJson] = useState(null);
  const [dimension, setDimension] = useState('total'); 
  const [subGroup, setSubGroup] = useState('general');

  // REFERENCIA AL AUDIO: Se crea una sola vez
  const audioRef = useRef(null);
  
  // Esto carga el GeoJSON al montar el componente. Solo se hace una vez.
  useEffect(() => {
    const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
    fetch(url)
      .then(r => r.json())
      .then(json => {
        const filtered = json.features
          .filter(f => f.properties.admin === 'Chile')
          .map(f => ({ ...f, id: f.properties.iso_3166_2 }));
        setGeoJson(filtered);
      });
  }, []);

  useEffect(() => {
    // Inicializamos el audio
    const audioPath = `audio_voces.m4a`;
    const audio = new Audio(audioPath);
    audio.loop = true;
    audio.volume = 0; // Empezamos en silencio
    audioRef.current = audio;

    // Limpieza al desmontar el componente
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Función para manejar el volumen
  const updateVolume = (val) => {
    if (audioRef.current) {
      // Si es la primera vez, intentamos darle Play (el navegador requiere interacción)
      if (audioRef.current.paused) {
        audioRef.current.play();
      }
      
      const normalizedVolume = (val - 50) / 50;
      const targetVolume = Math.min(Math.max(normalizedVolume, 0), 1);
      
      audioRef.current.volume = targetVolume;
    }
  };

  const silence = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0;
    }
  };

  // Generar trazos solo cuando cambia el GeoJSON o el filtro
  const traces = useMemo(() => {
    if (!geoJson) return [];

    const currentData = dataSets[subGroup];
    const featNorte = geoJson.filter(f => isoNorte.has(f.id));
    const featSur   = geoJson.filter(f => isoSur.has(f.id));

    const latsNorte = mapUtils.spreadLats(featNorte, -36, -17);
    const latsSur   = mapUtils.spreadLats(featSur, -57, -34);

    return [
      mapUtils.buildChoropleth(geoJson, 'geo', true, currentData),
      mapUtils.buildChoropleth(featNorte, 'geo2', false, currentData),
      mapUtils.buildLabels(featNorte, 'geo2', -77, latsNorte, currentData),
      ...mapUtils.buildConnectors(featNorte, 'geo2', -77, latsNorte, 2.0, 'triangle-right'),
      mapUtils.buildChoropleth(featSur, 'geo3', false, currentData),
      mapUtils.buildLabels(featSur, 'geo3', -63, latsSur, currentData),
      ...mapUtils.buildConnectors(featSur, 'geo3', -63, latsSur, -2.0, 'triangle-left'),
    ];
  }, [geoJson, subGroup]);

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 40, b: 40, l: 0, r: 0 },
    showlegend: false,
    geo: {
      domain: { x: [0, 0.15], y: [0, 1] },
      bgcolor: 'rgba(0,0,0,0)',
      visible: false,
      lataxis: { range: [-57, -17] },
      lonaxis: { range: [-76, -65] },
    },
    geo2: {
      domain: { x: [0.18, 0.58], y: [0, 1] },
      bgcolor: 'rgba(0,0,0,0)',
      visible: false,
      lataxis: { range: [-36, -17] },
      lonaxis: { range: [-80, -65] },
    },
    geo3: {
      domain: { x: [0.62, 0.98], y: [0, 1] },
      bgcolor: 'rgba(0,0,0,0)',
      visible: false,
      lataxis: { range: [-57, -34] },
      lonaxis: { range: [-76, -59] },
    },
  };

  return (
    <div>
      <nav className='navbar'>
        <div className='navbar-menu'>
          <div className='navbar-start'>
            <div className='navbar-item'>
              <Selector 
                label="Analizar por" 
                currentSelection={dimension}
                options={Object.keys(menuConfig).map(key => ({ value: key, label: menuConfig[key].label }))}
                onSelect={(val) => {
                  setDimension(val);
                  setSubGroup(menuConfig[val].options[0].value);
                }}
              />
            </div>
            <div className='navbar-item'>
              <Selector 
                label="Ver" 
                currentSelection={subGroup}
                options={menuConfig[dimension].options}
                onSelect={(val) => setSubGroup(val)}
              />
            </div>
          </div>
        </div>
      </nav>
      <section className="section">
        <h1 className="title">Participación en actividades culturales</h1>
        <h2 className="subtitle">
          <strong>% de participación</strong> en actividades culturales en Chile según la Encuesta Nacional de Participación Cultural y Comportamiento Lector (ENPCCL) (2024)
        </h2>
      </section>
      <div style={{ height: '75vh', width: '100%',  }}>
        {!geoJson ? (
          <div style={{ textAlign: 'center', paddingTop: '20%' }}>Cargando datos geográficos...</div>
        ) : (
          <Plot
            data={traces}
            layout={layout}
            useResizeHandler={true}
            style={{ width: "100%", height: "100%" }}
            config={{ responsive: true, displayModeBar: false }}
            onHover={(data) => {
              const point = data.points[0];
              if (point && point.z !== undefined) {
                updateVolume(point.z);
              }
            }}
            onUnhover={() => {
              silence(); // Al salir de una región, volumen 0
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;