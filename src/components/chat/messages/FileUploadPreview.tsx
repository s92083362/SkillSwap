"use client";

import React from 'react';

interface FileUploadPreviewProps {
  selectedFile: File;
  filePreview: string | null;
  fileCaption: string;
  uploading: boolean;
  onCaptionChange: (caption: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export default function FileUploadPreview({
  selectedFile,
  filePreview,
  fileCaption,
  uploading,
  onCaptionChange,
  onSend,
  onCancel,
}: FileUploadPreviewProps) {
  return (
    <div className="bg-gray-50 border-t p-2 sm:p-4 flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
          <div className="flex items-start gap-2 sm:gap-4">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-2xl sm:text-4xl">📄</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 mb-2 sm:mb-3">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <input
                type="text"
                placeholder="Add a caption..."
                value={fileCaption}
                onChange={(e) => onCaptionChange(e.target.value)}
                className="w-full border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg sm:text-xl"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-4">
            <button
              onClick={onSend}
              disabled={uploading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {uploading ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={onCancel}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border rounded-lg hover:bg-gray-50 text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}