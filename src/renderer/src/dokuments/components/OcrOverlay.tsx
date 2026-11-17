 
import React, { useCallback, useEffect, useState } from "react";
import { PageFragment } from "../api/graphql";

// Color palette for OCR text overlays
const colors = [
  'rgba(255, 107, 107, 0.3)', // Red
  'rgba(54, 162, 235, 0.3)',  // Blue
  'rgba(255, 206, 84, 0.3)',  // Yellow
  'rgba(75, 192, 192, 0.3)',  // Teal
  'rgba(153, 102, 255, 0.3)', // Purple
  'rgba(255, 159, 64, 0.3)',  // Orange
  'rgba(199, 199, 199, 0.3)', // Grey
  'rgba(83, 102, 255, 0.3)',  // Indigo
];

interface OcrOverlayProps {
  page: PageFragment;
  imageRef: React.RefObject<HTMLImageElement | null>;
  show: boolean;
}

export const OcrOverlay: React.FC<OcrOverlayProps> = ({ page, imageRef, show }) => {
  const [overlays, setOverlays] = useState<React.JSX.Element[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const updateOverlays = useCallback(() => {
    if (!show || !page.ocrResult?.lines || !imageRef.current || !imageLoaded) {
      setOverlays([]);
      return;
    }

    const img = imageRef.current;

    // Ensure image is loaded and has dimensions
    if (!img.naturalWidth || !img.naturalHeight) {
      setOverlays([]);
      return;
    }

    const imgRect = img.getBoundingClientRect();
    const scaleX = imgRect.width / img.naturalWidth;
    const scaleY = imgRect.height / img.naturalHeight;

    const newOverlays = page.ocrResult.lines.map((line, index) => {
      if (!line.bbox || line.bbox.length === 0) return null;

      // Convert bbox points to polygon path
      const points = line.bbox.map(([x, y]) => `${x * scaleX},${y * scaleY}`).join(' ');
      const color = colors[index % colors.length];

      return (
        <div key={index} className="absolute inset-0 pointer-events-none">
          <svg
            className="absolute inset-0 w-full h-full"
            style={{
              width: imgRect.width,
              height: imgRect.height
            }}
          >
            <polygon
              points={points}
              fill={color}
              stroke={color.replace('0.3', '0.6')}
              strokeWidth="1"
              className="transition-opacity duration-200 hover:opacity-80"
            />
          </svg>
          {/* Text label */}
          <div
            className="dark absolute text-xs bg-background/70 text-foreground px-1 py-0.5 rounded pointer-events-none"
            style={{
              left: line.bbox[0]?.[0] * scaleX || 0,
              top: (line.bbox[0]?.[1] || 0) * scaleY - 20,
              fontSize: '10px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {line.text}
          </div>
        </div>
      );
    }).filter(Boolean) as React.JSX.Element[];

    setOverlays(newOverlays);
  }, [show, page.ocrResult?.lines, imageRef, imageLoaded]);

  // Update overlays when dependencies change
  useEffect(() => {
    updateOverlays();
  }, [updateOverlays]);

  // Listen for image load events to ensure proper scaling
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    const handleImageError = () => {
      setImageLoaded(false);
    };

    // Check if image is already loaded
    if (img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    } else {
      img.addEventListener('load', handleImageLoad);
      img.addEventListener('error', handleImageError);
    }

    return () => {
      img.removeEventListener('load', handleImageLoad);
      img.removeEventListener('error', handleImageError);
    };
  }, [imageRef]);

  // Listen for window resize to update overlay positioning
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded) {
        // Small delay to ensure layout has updated
        setTimeout(updateOverlays, 50);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateOverlays, imageLoaded]);

  return <>{overlays}</>;
};
