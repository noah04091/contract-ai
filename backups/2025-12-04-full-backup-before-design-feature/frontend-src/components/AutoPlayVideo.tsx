import { useEffect, useRef, useState } from 'react';

interface AutoPlayVideoProps {
  src: string;
  poster?: string;
  alt: string;
  className?: string;
}

/**
 * AutoPlayVideo - Professionelle Video-Komponente
 *
 * Features:
 * - Spielt automatisch ab, wenn im Sichtfeld (Intersection Observer)
 * - Pausiert automatisch, wenn aus dem Sichtfeld gescrollt
 * - Loop für endlose Wiederholung
 * - Muted für Autoplay-Kompatibilität
 * - Lazy Loading für Performance
 * - Fallback bei Ladefehlern
 */
const AutoPlayVideo = ({ src, poster, alt, className = '' }: AutoPlayVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intersection Observer für Sichtbarkeits-Tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.3, // Video muss 30% sichtbar sein
        rootMargin: '50px', // Starte etwas früher
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Play/Pause basierend auf Sichtbarkeit
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isVisible) {
      // Video abspielen wenn sichtbar
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay wurde blockiert - ignorieren
        });
      }
    } else {
      // Video pausieren wenn nicht sichtbar
      video.pause();
    }
  }, [isVisible, hasError]);

  const handleError = () => {
    setHasError(true);
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  // Bei Fehler: Fallback zu Poster-Bild oder Platzhalter
  if (hasError) {
    return (
      <div className={`video-fallback ${className}`}>
        {poster ? (
          <img src={poster} alt={alt} />
        ) : (
          <div className="video-error">
            <span>Video konnte nicht geladen werden</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={`auto-play-video ${className} ${isLoaded ? 'loaded' : 'loading'}`}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      onError={handleError}
      onLoadedData={handleLoadedData}
      aria-label={alt}
    />
  );
};

export default AutoPlayVideo;
