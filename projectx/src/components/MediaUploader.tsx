'use client';

import { useState, useRef } from 'react';
import { uploadMediaFile } from '@/lib/mediaUpload';

interface MediaUploaderProps {
  existingUrls?: string[];
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
}

export default function MediaUploader({ 
  existingUrls = [], 
  onUrlsChange,
  maxFiles = 4 
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check total file count
    if (existingUrls.length + files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} media items allowed`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    const newUrls: string[] = [];
    const errors: string[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Not a supported image or video format`);
        continue;
      }

      // Validate file size
      const maxImageSize = 5 * 1024 * 1024; // 5MB
      const maxVideoSize = 512 * 1024 * 1024; // 512MB
      const maxSize = isImage ? maxImageSize : maxVideoSize;
      
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        errors.push(`${file.name}: Exceeds maximum size of ${maxSizeMB}MB`);
        continue;
      }

      // Upload file
      const result = await uploadMediaFile(file);
      
      if (result.success && result.url) {
        newUrls.push(result.url);
      } else {
        errors.push(`${file.name}: ${result.error || 'Upload failed'}`);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join('; '));
    }

    if (newUrls.length > 0) {
      onUrlsChange([...existingUrls, ...newUrls]);
    }

    setUploading(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeUrl = (index: number) => {
    const newUrls = existingUrls.filter((_, i) => i !== index);
    onUrlsChange(newUrls);
  };

  const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return 'unknown';
  };

  return (
    <div className="space-y-3">
      {/* Existing Media Previews */}
      {existingUrls.length > 0 && (
        <div className="space-y-2">
          {existingUrls.map((url, index) => {
            const mediaType = getMediaType(url);
            return (
              <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                {mediaType === 'image' ? (
                  <img 
                    src={url} 
                    alt={`Media ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : mediaType === 'video' ? (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-2xl">🎥</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs">📎</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{url}</p>
                  <p className="text-xs text-gray-400">{mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : 'File'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button */}
      {existingUrls.length < maxFiles && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || existingUrls.length >= maxFiles}
            className="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">📸🎥</span>
                {existingUrls.length === 0 
                  ? 'Click to upload media (images or videos)' 
                  : `Add more media (${existingUrls.length}/${maxFiles})`}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {uploadError}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        Supported: Images (max 5MB), Videos (max 512MB). Twitter/X allows up to {maxFiles} media items per post.
      </p>
    </div>
  );
}

