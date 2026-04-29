import React, { useState, useEffect, useRef } from 'react';

const DraggableContactButton = () => {
  const [position, setPosition] = useState(() => {
    // Load saved position from localStorage or use default
    const saved = localStorage.getItem('contactButtonPosition');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default position - bottom right
    return {
      x: window.innerWidth - 180,
      y: window.innerHeight - (window.innerWidth <= 768 ? 150 : 80)
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('contactButtonPosition', JSON.stringify(position));
  }, [position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - 160;
        const maxY = window.innerHeight - 60;
        return {
          x: Math.min(Math.max(20, prev.x), maxX),
          y: Math.min(Math.max(20, prev.y), maxY)
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      return; // Don't start drag if clicking the link
    }
    
    setIsDragging(true);
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      return;
    }

    setIsDragging(true);
    const touch = e.touches[0];
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Constrain to viewport
    const maxX = window.innerWidth - 160;
    const maxY = window.innerHeight - 60;

    setPosition({
      x: Math.min(Math.max(20, newX), maxX),
      y: Math.min(Math.max(20, newY), maxY)
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;

    const maxX = window.innerWidth - 160;
    const maxY = window.innerHeight - 60;

    setPosition({
      x: Math.min(Math.max(20, newX), maxX),
      y: Math.min(Math.max(20, newY), maxY)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      <a
        href="https://www.instagram.com/ajeet_up82?igsh=cGNyejJldWN3M3V5"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          // Prevent navigation if we just finished dragging
          if (isDragging) {
            e.preventDefault();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: isDragging 
            ? '0 8px 24px rgba(0,0,0,0.5)' 
            : '0 4px 12px rgba(0,0,0,0.3)',
          textDecoration: 'none',
          transition: isDragging ? 'none' : 'transform 0.2s, box-shadow 0.2s',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          whiteSpace: 'nowrap',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }
        }}
        title="Drag to move • Click to contact developer"
      >
        <i className="fa-solid fa-grip-vertical" style={{ 
          marginRight: '8px', 
          opacity: 0.7,
          fontSize: '10px'
        }}></i>
        Contact Developer
      </a>
      
      {/* Drag hint - shows on first load */}
      {!localStorage.getItem('contactButtonDragHintShown') && (
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            animation: 'fadeOut 3s forwards',
            pointerEvents: 'none'
          }}
          onAnimationEnd={() => {
            localStorage.setItem('contactButtonDragHintShown', 'true');
          }}
        >
          👆 Drag me anywhere!
        </div>
      )}

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DraggableContactButton;
