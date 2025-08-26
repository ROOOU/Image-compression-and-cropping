import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop, ImageFile } from './types';

// Let TypeScript know that JSZip is available globally from the script tag
declare var JSZip: any;

// --- HELPER FUNCTIONS (IMAGE PROCESSING) ---

function imageToDataUrl(file: File): Promise<{ name: string, dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({ name: file.name, dataUrl: reader.result as string });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function processResize(image: HTMLImageElement, minSide: number): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  let { width, height } = image;
  if (width < height) {
    const ratio = width / minSide;
    width = minSide;
    height = height / ratio;
  } else {
    const ratio = height / minSide;
    height = minSide;
    width = width / ratio;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

function processCrop(image: HTMLImageElement, crop: PixelCrop): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  ctx.scale(pixelRatio, pixelRatio);

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  ctx.drawImage(
    image,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}


// --- UI ICONS ---

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const ResizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" />
  </svg>
);
const CropIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 5.879A3 3 0 0116.243 5h3.757m-3.757 14.121a3 3 0 01-2.122-.879M14.121 5.879L5 15m9.121-9.121a3 3 0 00-4.242 0L5 10.121M7.757 21h3.757a3 3 0 002.121-.879m-5.878 0A3 3 0 015 18.243V5" />
  </svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M5.222 9A8.001 8.001 0 0119.778 9M20 20v-5h-5m-0.778-4A8.001 8.001 0 014.222 15" />
  </svg>
);
const ZipIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 9.75l-7.5 7.5-7.5-7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 9.75h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 12h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 14.25h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0118 19.5H6a2.25 2.25 0 01-2.25-2.25V6.75z" />
    </svg>
);
const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

// --- REUSABLE BUTTON COMPONENT ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon?: React.ElementType;
  isLoading?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, Icon, className = '', isLoading = false, ...props }, ref) => (
    <button
      ref={ref}
      className={`flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white rounded-lg shadow-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : (Icon && <Icon className="w-5 h-5" />)}
      {children}
    </button>
  )
);

// --- IMAGE UPLOADER COMPONENT ---

interface ImageUploaderProps {
  onImagesUpload: (images: { name: string, dataUrl: string }[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}
const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesUpload, setIsProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files.length > 0) {
      setIsProcessing(true);
      try {
        const imagePromises = Array.from(files).map(imageToDataUrl);
        const newImages = await Promise.all(imagePromises);
        onImagesUpload(newImages);
      } catch (error) {
        console.error("Error reading files:", error);
        alert("Could not load some images. Please try another file.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label
        onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-indigo-400 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
          <UploadIcon className="w-10 h-10 mb-3" />
          <p className="mb-2 text-sm"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs">PNG, JPG, GIF, WEBP</p>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files)} multiple />
      </label>
    </div>
  );
};


// --- IMAGE EDITOR COMPONENT ---

interface ImageEditorProps {
  activeImage: ImageFile | null;
  onUpdateImage: (id: string, dataUrl: string) => void;
  onResetAll: () => void;
  onDownloadAll: () => void;
  isProcessing: boolean;
  canDownloadAll: boolean;
  onBatchResize: (minSide: number) => void;
  selectedImageIds: Set<string>;
}
const ImageEditor: React.FC<ImageEditorProps> = ({ activeImage, onUpdateImage, onResetAll, onDownloadAll, isProcessing, canDownloadAll, onBatchResize, selectedImageIds }) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [resizeDim, setResizeDim] = useState<number>(800);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleResizeClick = () => {
    if (resizeDim > 0 && selectedImageIds.size > 0) {
      onBatchResize(resizeDim);
    }
  };

  const handleApplyCrop = () => {
    if (!completedCrop || !imgRef.current || !activeImage) return;
    const croppedDataUrl = processCrop(imgRef.current!, completedCrop);
    onUpdateImage(activeImage.id, croppedDataUrl);
    setCompletedCrop(undefined);
  };

  const handleDownload = () => {
    if (!activeImage?.processedSrc) return;
    const link = document.createElement('a');
    link.href = activeImage.processedSrc;
    link.download = `processed-${activeImage.name}.jpg`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  
  const selectedCount = selectedImageIds.size;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 xl:w-1/4 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white border-b border-gray-600 pb-2">Tools</h2>
        
        <div className="flex flex-col gap-2 border border-gray-700 rounded-lg p-3">
          <h3 className="text-md font-semibold text-indigo-300">Batch Resize</h3>
          <label htmlFor="resize-dim" className="text-sm font-medium text-gray-300">Shortest Side (px)</label>
          <input 
              id="resize-dim"
              type="number"
              value={resizeDim}
              onChange={(e) => setResizeDim(parseInt(e.target.value, 10) || 0)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              placeholder="e.g., 800"
          />
          <Button 
              onClick={handleResizeClick} 
              Icon={ResizeIcon} 
              isLoading={isProcessing} 
              className="bg-indigo-600 hover:bg-indigo-700 w-full" 
              disabled={isProcessing || selectedCount === 0 || !resizeDim || resizeDim <= 0}
          >
              Resize Selected ({selectedCount})
          </Button>
        </div>

        <div className="flex flex-col gap-2 border border-gray-700 rounded-lg p-3">
            <h3 className="text-md font-semibold text-emerald-300">Crop Active Image</h3>
            <Button onClick={handleApplyCrop} Icon={CropIcon} isLoading={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 w-full" disabled={!completedCrop?.width || !activeImage}>Apply Crop</Button>
        </div>
        
        <div className="border-t border-gray-600 pt-4 flex flex-col gap-2">
            <h3 className="text-lg font-bold text-white">Batch Download</h3>
            <Button onClick={onDownloadAll} Icon={ZipIcon} isLoading={isProcessing} className="bg-sky-600 hover:bg-sky-700 w-full" disabled={!canDownloadAll}>Download All (.zip)</Button>
        </div>

        <div className="border-t border-gray-600 pt-4 mt-auto">
          <Button onClick={onResetAll} Icon={ResetIcon} isLoading={isProcessing} className="bg-red-600 hover:bg-red-700 w-full">Clear All Images</Button>
        </div>
      </div>

      <div className="w-full lg:w-2/3 xl:w-3/4 flex-1 flex flex-col gap-6">
        {activeImage ? (
          <div key={activeImage.id}>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 truncate">Editing: {activeImage.name}</h3>
              <div className="max-h-[60vh] overflow-auto rounded-lg bg-black/30">
                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                  <img ref={imgRef} src={activeImage.originalSrc} alt="Original to edit" className="w-full h-auto" />
                </ReactCrop>
              </div>
            </div>
            {activeImage.processedSrc && (
              <div className="bg-gray-800 p-4 rounded-xl shadow-lg animate-fade-in mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Processed Image</h3>
                  <Button onClick={handleDownload} Icon={DownloadIcon} className="bg-blue-600 hover:bg-blue-700">Download</Button>
                </div>
                <div className="max-h-[60vh] overflow-auto rounded-lg bg-black/30">
                  <img src={activeImage.processedSrc} alt="Processed result" className="w-full h-auto" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 p-4 rounded-xl shadow-lg min-h-[300px]">
              <p className="text-gray-400">Select an image from the tray below to start editing.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- IMAGE LIST COMPONENT ---
interface ImageListProps {
    images: ImageFile[];
    activeImageId: string | null;
    selectedImageIds: Set<string>;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onToggleSelectAll: () => void;
}
const ImageList: React.FC<ImageListProps> = ({ images, activeImageId, selectedImageIds, onSelect, onRemove, onToggleSelection, onToggleSelectAll }) => {
    const allSelected = images.length > 0 && images.length === selectedImageIds.size;

    return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm p-4 mt-8 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white">Image Tray ({images.length})</h3>
             {images.length > 0 && (
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="selectAll" 
                        checked={allSelected} 
                        onChange={onToggleSelectAll} 
                        className="h-4 w-4 rounded border-gray-500 text-indigo-600 bg-gray-700 focus:ring-indigo-500 focus:ring-offset-gray-800 cursor-pointer"
                    />
                    <label htmlFor="selectAll" className="text-sm text-gray-300 select-none cursor-pointer">Select All</label>
                </div>
            )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
            {images.map(image => {
                const isSelected = selectedImageIds.has(image.id);
                const isActive = activeImageId === image.id;
                return (
                    <div key={image.id} className="flex-shrink-0 relative group">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(image.id)}
                            className="absolute top-2 left-2 z-10 h-5 w-5 rounded border-gray-400 text-indigo-600 bg-gray-900/50 focus:ring-indigo-500 focus:ring-offset-gray-800 cursor-pointer"
                            aria-label={`Select ${image.name}`}
                        />
                        <button 
                            onClick={() => onSelect(image.id)}
                            className={`block w-28 h-28 rounded-lg overflow-hidden border-2 transition-all duration-200 
                                ${isActive ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-purple-500' : ''}
                                ${isSelected ? 'border-indigo-500' : 'border-transparent group-hover:border-gray-500'}
                            `}
                        >
                            <img src={image.originalSrc} alt={image.name} className="w-full h-full object-cover" />
                        </button>
                        {image.processedSrc && (
                            <div className="absolute top-1 right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-gray-800" title="Processed"></div>
                        )}
                        <button 
                            onClick={() => onRemove(image.id)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors text-sm font-bold"
                            aria-label="Remove image"
                        >
                            &times;
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
)};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const activeImage = images.find(img => img.id === activeImageId) || null;
  const canDownloadAll = images.some(img => img.processedSrc);

  const handleImagesUpload = (newImages: { name: string; dataUrl: string }[]) => {
    const preparedImages: ImageFile[] = newImages.map((img, index) => ({
      id: `${img.name}-${Date.now()}-${index}`,
      name: img.name,
      originalSrc: img.dataUrl,
      processedSrc: null,
    }));
    setImages(prev => [...prev, ...preparedImages]);
    if (!activeImageId) {
      setActiveImageId(preparedImages[0].id);
    }
  };
  
  const handleUpdateImage = (id: string, dataUrl: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, processedSrc: dataUrl } : img));
  };
  
  const handleRemoveImage = (idToRemove: string) => {
    setImages(currentImages => {
      const remaining = currentImages.filter(img => img.id !== idToRemove);
      if (activeImageId === idToRemove) {
        setActiveImageId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
    setSelectedImageIds(currentIds => {
        const newIds = new Set(currentIds);
        newIds.delete(idToRemove);
        return newIds;
    });
  };

  const handleResetAll = () => {
    setImages([]);
    setActiveImageId(null);
    setSelectedImageIds(new Set());
  };

  const handleToggleSelection = (id: string) => {
    setSelectedImageIds(currentIds => {
        const newIds = new Set(currentIds);
        if (newIds.has(id)) {
            newIds.delete(id);
        } else {
            newIds.add(id);
        }
        return newIds;
    });
  };

  const handleToggleSelectAll = () => {
      setSelectedImageIds(currentIds => {
          if (currentIds.size === images.length) {
              return new Set(); // Deselect all
          } else {
              return new Set(images.map(img => img.id)); // Select all
          }
      });
  };

  const handleBatchResize = async (minSide: number) => {
    if (selectedImageIds.size === 0 || minSide <= 0) return;

    setIsProcessing(true);
    try {
        const imagesToProcess = images.filter(img => selectedImageIds.has(img.id));
        
        const updatePromises = imagesToProcess.map(imageFile => {
            return new Promise<{ id: string, processedSrc: string }>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const resizedDataUrl = processResize(img, minSide);
                        resolve({ id: imageFile.id, processedSrc: resizedDataUrl });
                    } catch (e) {
                        reject(e);
                    }
                };
                img.onerror = (err) => reject(err);
                img.src = imageFile.originalSrc;
            });
        });

        const updatedImagesData = await Promise.all(updatePromises);
        const updatesMap = new Map(updatedImagesData.map(item => [item.id, item.processedSrc]));

        setImages(currentImages => currentImages.map(img => 
            updatesMap.has(img.id) ? { ...img, processedSrc: updatesMap.get(img.id)! } : img
        ));

    } catch (error) {
        console.error("Batch resize failed:", error);
        alert("An error occurred during batch resize. Please check console for details.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    const processedImages = images.filter(img => img.processedSrc);
    if (processedImages.length === 0) return;

    setIsProcessing(true);
    try {
        const zip = new JSZip();
        const promises = processedImages.map(async (image) => {
            const response = await fetch(image.processedSrc!);
            const blob = await response.blob();
            zip.file(`processed-${image.name}.jpg`, blob);
        });
        await Promise.all(promises);
        
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `processed-images-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch(error) {
        console.error("Failed to create zip:", error);
        alert("An error occurred while creating the zip file.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <main className="bg-gray-900 text-gray-200 min-h-screen p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          Image Resizer & Cropper
        </h1>
        <p className="mt-2 text-gray-400 max-w-2xl">
          Upload multiple images to resize, crop, and download them in a batch.
        </p>
      </div>

      <div className="w-full max-w-7xl">
        {images.length === 0 ? (
          <div className="bg-gray-900/50 p-6 rounded-2xl shadow-2xl border border-gray-700">
            <ImageUploader onImagesUpload={handleImagesUpload} setIsProcessing={setIsProcessing} />
          </div>
        ) : (
          <div>
            <div className="bg-gray-900/50 p-6 rounded-2xl shadow-2xl border border-gray-700">
              <ImageEditor
                activeImage={activeImage}
                onUpdateImage={handleUpdateImage}
                onResetAll={handleResetAll}
                onDownloadAll={handleDownloadAll}
                isProcessing={isProcessing}
                canDownloadAll={canDownloadAll}
                onBatchResize={handleBatchResize}
                selectedImageIds={selectedImageIds}
              />
            </div>
            <ImageList 
                images={images}
                activeImageId={activeImageId}
                selectedImageIds={selectedImageIds}
                onSelect={setActiveImageId}
                onRemove={handleRemoveImage}
                onToggleSelection={handleToggleSelection}
                onToggleSelectAll={handleToggleSelectAll}
            />
          </div>
        )}
      </div>
    </main>
  );
}
