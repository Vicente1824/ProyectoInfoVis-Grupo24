import React, { useState } from 'react';

const Selector = ({ label, options, currentSelection, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Buscamos el texto de la opción seleccionada para mostrarlo en el botón
  const selectedLabel = options.find(opt => opt.value === currentSelection)?.label || 'Seleccionar';

  return (
    <div className={`dropdown ${isOpen ? 'is-active' : ''}`}>
      <div className="dropdown-trigger">
        <button 
          className="button" 
          onClick={() => setIsOpen(!isOpen)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Cierra al hacer clic afuera
        >
          <span><strong>{label}:</strong> {selectedLabel} ▼</span>
        </button>
      </div>
      <div className="dropdown-menu">
        <div className="dropdown-content">
          {options.map((opt) => (
            <a 
              key={opt.value} 
              className={`dropdown-item ${currentSelection === opt.value ? 'is-active' : ''}`}
              onClick={() => {
                onSelect(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Selector;