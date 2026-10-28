import React from 'react';

const Attribution = () => {
  return (
    <div className="text-center py-2 text-xs text-muted-foreground/70">
      <p>
        Designed by{' '}
        <a 
          href="https://github.com/aidenpinto" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          Aiden
        </a>
        {' '}at Iroquois Ridge High School
      </p>
    </div>
  );
};

export default Attribution;