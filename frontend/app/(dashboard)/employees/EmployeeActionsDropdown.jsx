import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function EmployeeActionsDropdown({ 
  employee, 
  isOpen, 
  setIsOpen, 
  onEdit, 
  onSalary, 
  onHistory, 
  onToggleActive, 
  onSoftDelete 
}) {
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleToggle = (e) => {
    e.stopPropagation();
    
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 220; 
      
      let topPosition = rect.bottom + window.scrollY;
      
      if (spaceBelow < dropdownHeight) {
        topPosition = rect.top + window.scrollY - dropdownHeight - 4;
      }

      setCoords({
        top: topPosition,
        left: rect.right + window.scrollX - 144
      });
    }
    
    // Safety check: makes sure parent function exists before executing
    if (typeof setIsOpen === 'function') {
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalClick = () => {
      if (typeof setIsOpen === 'function') setIsOpen(false);
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isOpen, setIsOpen]);

  return (
    <div className="inline-block text-left">
      <button 
        ref={buttonRef}
        onClick={handleToggle} 
        className={`p-1.5 rounded-full transition-colors focus:outline-none ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>

      {isOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
          }}
          className="z-[9999] w-36 bg-white border border-gray-200 rounded-lg shadow-xl py-1 focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsOpen(false); onEdit(); }}>Edit</button>
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsOpen(false); onSalary(); }}>Salary</button>
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setIsOpen(false); onHistory(); }}>History</button>
          
          <button
            className={`block w-full text-left px-4 py-2 text-sm border-t border-gray-100 hover:bg-gray-50 ${employee.isActive !== false ? 'text-red-600' : 'text-green-600'}`}
            onClick={() => { setIsOpen(false); onToggleActive(); }}
          >
            {employee.isActive !== false ? 'Terminate' : 'Reactivate'}
          </button>
          
          <button
            className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-50"
            onClick={() => { setIsOpen(false); onSoftDelete(); }}
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}