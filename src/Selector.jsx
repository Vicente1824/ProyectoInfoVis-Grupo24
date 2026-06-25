import React, { useState, useRef, useEffect } from 'react';

const Selector = ({ label, options, currentSelection, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null); // Referencia para saber dónde hacemos clic

  const selectedLabel = options.find(opt => opt.value === currentSelection)?.label || 'Seleccionar';

  // Este useEffect reemplaza tu onBlur. 
  // Escucha clics en toda la pantalla y si el clic es AFUERA de este menú, lo cierra.
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Si el menú está abierto y el clic no ocurrió dentro de nuestro componente...
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    // Agregamos position: 'relative' para que el menú flote correctamente
    // Quitamos la dependencia de clases que cambian dinámicamente en el contenedor padre
    <div ref={dropdownRef} className="dropdown" style={{ position: 'relative' }}>
      <div className="dropdown-trigger">
        <button 
          className="button" 
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span><strong>{label}:</strong> {selectedLabel} ▼</span>
        </button>
      </div>
      
      {/* MAGIA AQUÍ: En lugar de usar CSS para ocultar, usamos React puro. */}
      {/* Si isOpen es true, el HTML existe. Si es false, no existe en el DOM. */}
      {isOpen && (
        <div 
          className="dropdown-menu" 
          style={{ display: 'block', position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}
        >
          <div className="dropdown-content" style={{ backgroundColor: 'white', border: '1px solid #dbdbdb', borderRadius: '4px' }}>
            {options.map((opt) => (
              <a 
                key={opt.value} 
                // Añadimos estilos en línea para evitar que Protobject los sobreescriba
                style={{ 
                  display: 'block', 
                  padding: '0.375rem 1rem', 
                  cursor: 'pointer',
                  backgroundColor: currentSelection === opt.value ? '#3273dc' : 'transparent',
                  color: currentSelection === opt.value ? 'white' : '#4a4a4a'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Selector;