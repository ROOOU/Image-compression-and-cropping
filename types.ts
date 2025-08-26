// These types are based on the 'react-image-crop' library.
// Defining them here allows for centralized type management.

export interface Crop {
  unit: 'px' | '%';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelCrop extends Crop {
  unit: 'px';
}

// New type for managing multiple images
export interface ImageFile {
  id: string;
  name: string;
  originalSrc: string;
  processedSrc: string | null;
}
