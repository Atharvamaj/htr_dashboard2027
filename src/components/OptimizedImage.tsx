import React, { useState, useRef, useEffect, memo } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazy?: boolean;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

// Placeholder blur data URL for smooth loading experience
const PLACEHOLDER_BLUR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyaqIq/9k=';

// Custom hook for intersection observer
const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return { ref, isIntersecting };
};

// Image optimization utilities
const getOptimizedImageUrl = (src: string, width?: number, quality = 75): string => {
  // For SVG files, return as-is
  if (src.includes('.svg')) {
    return src;
  }

  // For local images, return as-is (would need server-side optimization)
  if (src.startsWith('/') || src.startsWith('./')) {
    return src;
  }

  // For external images, you could add optimization service here
  // Example: return `https://your-optimization-service.com/transform?src=${src}&w=${width}&q=${quality}`;
  return src;
};

const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  placeholder = PLACEHOLDER_BLUR,
  lazy = true,
  quality = 75,
  priority = false,
  className = '',
  onLoad,
  onError,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(priority ? src : placeholder);
  const { ref, isIntersecting } = useIntersectionObserver();

  // Load image when it enters viewport or if priority is true
  useEffect(() => {
    if (!lazy || priority || isIntersecting) {
      const optimizedSrc = getOptimizedImageUrl(src, width, quality);
      
      const img = new Image();
      img.onload = () => {
        setImageSrc(optimizedSrc);
        setIsLoaded(true);
        onLoad?.();
      };
      img.onerror = () => {
        setHasError(true);
        onError?.();
      };
      
      // Start loading the image
      img.src = optimizedSrc;
    }
  }, [src, isIntersecting, lazy, priority, width, quality, onLoad, onError]);

  // Container styles for aspect ratio preservation
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    overflow: 'hidden',
    ...style,
  };

  // Image styles with transition effects
  const imageStyle: React.CSSProperties = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0.7,
    filter: isLoaded ? 'none' : 'blur(5px)',
  };

  if (hasError) {
    return (
      <div
        ref={ref}
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '200px',
          ...style,
        }}
        {...props}
      >
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div ref={ref} style={containerStyle} className={className}>
      <img
        src={imageSrc}
        alt={alt}
        style={imageStyle}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
      />
      
      {/* Loading indicator */}
      {!isLoaded && lazy && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Higher-order component for automatic image optimization
export const withImageOptimization = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const OptimizedComponent = (props: P) => {
    return <WrappedComponent {...props} />;
  };

  OptimizedComponent.displayName = `withImageOptimization(${WrappedComponent.displayName || WrappedComponent.name})`;

  return OptimizedComponent;
};

// Preload function for critical images
export const preloadImage = (src: string, width?: number, quality = 75): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = getOptimizedImageUrl(src, width, quality);
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    
    document.head.appendChild(link);
  });
};

// Hook for responsive image sizes
export const useResponsiveImageSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setSize({ width: 320, height: 240 });
      } else if (width < 768) {
        setSize({ width: 480, height: 360 });
      } else if (width < 1024) {
        setSize({ width: 640, height: 480 });
      } else {
        setSize({ width: 800, height: 600 });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
};

export default OptimizedImage;