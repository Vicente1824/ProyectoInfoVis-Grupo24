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

const descripcionesDimension = {
  total: "Visión general de la participación cultural a nivel nacional. Refleja el porcentaje total de personas que han participado en al menos una actividad cultural en los últimos 12 meses en cada región.",
  sexo: "El gráfico revela que la presencia de ambos sexos se mantiene constante en todo el país, pero notarás que la proporción de mujeres es consistentemente más alta.",
  edad: "Explora que grupo etario concentran mayor actividad. Revisa como la participación alcanza su punto más alto en los rangos jóvenes y decae gradualmente en los adultos mayores.",
  socioeconomico: "Explora que grupos socioeconómicos concentran la mayor actividad. Revisa como influye este nivel en la participación y compara la diferencia de las tres clases.",
  educacion: "Revisa que nivel educacional concentra la mayor actividad. Notarás un incremento significativo a medida que avanza la escolaridad; esto refleja como la autonomía y el interés de los jóvenes impulsan una mayor participación.",
  discapacidad: "Revisa la distribución entre hogares con y sin discapacidad. Verás que existe un pequeño contraste en la participación, visibilizando los sutiles desafíos de inclusión que aún persisten.",
  mayores: "Explora cómo influye la composición familiar en la actividad. Se observa una mayor participación en los hogares que no cuentan con personas mayores, lo que suele reflejar como las responsabilidades de cuidado impactan la capacidad de participar."
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
    // Función que reacciona al evento global
    const manejarAruco = (e) => {
      const markerId = e.detail;
      
      switch (markerId) {
        case "0": setDimension('total'); setSubGroup('general'); break;
        
        case "1": setDimension('sexo'); setSubGroup('hombre'); break;
        case "2": setDimension('sexo'); setSubGroup('mujer'); break;
        
        case "3": setDimension('edad'); setSubGroup('jovenes'); break;
        case "4": setDimension('edad'); setSubGroup('adultos'); break;
        case "5": setDimension('edad'); setSubGroup('mayores'); break;
        
        case "6": setDimension('socioeconomico'); setSubGroup('baja'); break;
        case "7": setDimension('socioeconomico'); setSubGroup('media'); break;
        case "8": setDimension('socioeconomico'); setSubGroup('alta'); break;
        
        case "9": setDimension('educacion'); setSubGroup('basica'); break;
        case "10": setDimension('educacion'); setSubGroup('secundaria'); break;
        case "11": setDimension('educacion'); setSubGroup('superior'); break;
        
        case "12": setDimension('discapacidad'); setSubGroup('discapacidad'); break;
        case "13": setDimension('discapacidad'); setSubGroup('noDiscapacidad'); break;
        
        case "14": setDimension('mayores'); setSubGroup('mayores'); break;
        case "15": setDimension('mayores'); setSubGroup('noMayores'); break;
        
        default:
          console.log("Marcador detectado pero no mapeado:", markerId);
      }
    };

    window.addEventListener('arucoDetectado', manejarAruco);

    return () => {
      window.removeEventListener('arucoDetectado', manejarAruco);
    };
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
      domain: { x: [0, 0.01], y: [0, 0.01] }, 
      visible: false,
    },
    geo2: {
      domain: { x: [0.0, 0.48], y: [0, 1] }, 
      bgcolor: 'rgba(0,0,0,0)',
      visible: false,
      lataxis: { range: [-36, -17] },
      lonaxis: { range: [-80, -65] },
    },
    geo3: {
      domain: { x: [0.50, 0.95], y: [0, 1] },
      bgcolor: 'rgba(0,0,0,0)',
      visible: false,
      lataxis: { range: [-57, -34] },
      lonaxis: { range: [-76, -59] },
    },
  };

  const [hoveredRegion, setHoveredRegion] = useState(null);

  const promedioNacional = useMemo(() => {
    const valores = Object.values(dataSets[subGroup]).map(item => item.valor);
    return (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
  }, [subGroup]);
  const currentSubGroupLabel = menuConfig[dimension].options.find(o => o.value === subGroup)?.label;
  
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
      <div className="section pt-0">
        {/* Quitamos is-vcentered para que la columna izquierda pueda estirarse en todo el alto disponible */}
        <div className="columns is-desktop">
          
          {/* 2. SOLUCIÓN: Hacemos la columna más angosta (is-3 es el 25% del ancho) */}
          <div className="column is-3">
            <div 
              className="box has-background-white-ter is-flex is-flex-direction-column is-justify-content-center p-5" 
              style={{ height: '100%', borderLeft: '5px solid #eda845' }}
            >
              <p className="heading has-text-grey">{menuConfig[dimension].label}</p>
              <h3 className="title is-4">{currentSubGroupLabel}</h3>
              <p className="is-size-6" style={{ lineHeight: '1.6' }}>
                {descripcionesDimension[dimension]}
              </p>
            </div>
          </div>

          {/* El resto del espacio (75%) lo toman los mapas */}
          <div className="column is-9" style={{ height: '75vh' }}>
            {!geoJson ? (
              <div className="has-text-centered pt-6">Cargando datos geográficos...</div>
            ) : (
              <Plot
                data={traces}
                layout={layout}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{ responsive: true, displayModeBar: false }}
                onHover={(data) => {
                  const point = data.points[0];
                  if (point && point.location) {
                    const info = dataSets[subGroup][point.location];
                    const diff = (info.valor - parseFloat(promedioNacional)).toFixed(1);
                    setHoveredRegion({ ...info, diff: diff > 0 ? `+${diff}` : diff });
                    updateVolume(info.valor);
                  }
                }}
                onUnhover={() => {
                  setHoveredRegion(null);
                  silence();
                }}
              />
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default App;