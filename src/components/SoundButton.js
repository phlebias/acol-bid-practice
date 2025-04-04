import React from 'react';
import { playButtonSound } from '../utils/sound';

function SoundButton({ onClick, children, className = '', ...props }) {
  const handleClick = (e) => {
    playButtonSound();
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`btn ${className}`.trim()}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default SoundButton; 