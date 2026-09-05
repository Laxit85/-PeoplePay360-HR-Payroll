import React, { useState, useEffect } from 'react';

export function Ambient3DBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 3D Glowing Ambient Orb 1 - Gold */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(197,160,89,0.8) 0%, rgba(197,160,89,0) 70%)',
          top: '10%',
          left: '15%',
          transform: `translate3d(${mousePos.x * 1.2}px, ${mousePos.y * 1.2}px, 0px)`,
        }}
      />

      {/* 3D Glowing Ambient Orb 2 - Sky Cyan */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[160px] opacity-15 transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(56,189,248,0) 70%)',
          bottom: '15%',
          right: '10%',
          transform: `translate3d(${mousePos.x * -1.5}px, ${mousePos.y * -1.5}px, 0px)`,
        }}
      />

      {/* 3D Glowing Ambient Orb 3 - Deep Navy Accent */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-[130px] opacity-25 transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(38,47,74,0.9) 0%, rgba(18,22,36,0) 70%)',
          top: '50%',
          left: '50%',
          transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0px) translate(-50%, -50%)`,
        }}
      />

      {/* Floating 3D Micro Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#262f4a_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />

      {/* Animated Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] left-[30%] w-2 h-2 rounded-full bg-primary-600/40 animate-pulse" />
        <div className="absolute top-[60%] left-[80%] w-3 h-3 rounded-full bg-sky-400/30 animate-pulse" />
        <div className="absolute top-[75%] left-[25%] w-1.5 h-1.5 rounded-full bg-primary-600/50 animate-pulse" />
      </div>
    </div>
  );
}
