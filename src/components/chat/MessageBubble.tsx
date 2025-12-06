"use client";

import React, { useState } from "react";

interface MessageBubbleProps {
  content: string;
  isSender: boolean;
  timestamp?: string;
  senderName?: string;
  type?: "text" | "image" | "file";
  fileUrl?: string | null;
  fileName?: string | null;
}

export default function MessageBubble({
  content,
  isSender,
  timestamp,
  senderName,
  type = "text",
  fileUrl,
  fileName,
}: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const bubbleClasses = isSender
    ? "bg-blue-500 text-white"
    : "bg-gray-200 text-gray-800";

  const isImageFile = (name?: string | null) => {
    if (!name) return false;
    const ext = name.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
      ext || ""
    );
  };

  const isPDF = (name?: string | null, url?: string | null) => {
    if (name?.toLowerCase().endsWith('.pdf')) return true;
    if (url?.includes('.pdf')) return true;
    return false;
  };

  const getFileIcon = (name?: string | null) => {
    if (!name) return "📎";
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      case "ppt":
      case "pptx":
        return "📽️";
      case "zip":
      case "rar":
      case "7z":
        return "🗜️";
      case "mp4":
      case "mov":
      case "avi":
      case "mkv":
      case "webm":
        return "🎥";
      case "mp3":
      case "wav":
      case "flac":
      case "ogg":
        return "🎵";
      case "txt":
        return "📃";
      case "json":
      case "xml":
        return "📋";
      case "csv":
        return "📊";
      default:
        return "📎";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  // Only render as image if explicitly marked as image type AND it's actually an image file
  const shouldRenderAsImage =
    type === "image" && isImageFile(fileName || content) && !imageError;

  const handleDownload = async (url: string, name?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to direct link
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className={`flex flex-col max-w-md mb-3 ${
        isSender ? "ml-auto items-end" : "mr-auto items-start"
      }`}
    >
      {!isSender && senderName && (
        <span className="text-xs text-gray-600 mb-1 font-medium">
          {senderName}
        </span>
      )}

      <div
        className={`px-4 py-3 rounded-2xl font-medium shadow ${bubbleClasses}`}
      >
        {shouldRenderAsImage && fileUrl ? (
          <div className="flex flex-col gap-2">
            {imageLoading && (
              <div className="w-64 h-48 bg-gray-300 animate-pulse rounded flex items-center justify-center">
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            )}
            <img
              src={fileUrl}
              alt={fileName || "image"}
              className={`rounded max-h-64 object-cover cursor-pointer transition-opacity ${
                imageLoading ? "hidden" : "block"
              }`}
              onClick={() => window.open(fileUrl, "_blank")}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
            {!imageLoading && (
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => window.open(fileUrl, "_blank")}
                  className="underline hover:opacity-80 font-medium"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => handleDownload(fileUrl, fileName || "image")}
                  className="underline hover:opacity-80 font-medium"
                >
                  Download
                </button>
              </div>
            )}
          </div>
        ) : fileUrl ? (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {getFileIcon(fileName || content)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">
                  {fileName || content}
                </div>
                {type === "file" && (
                  <div className="text-xs opacity-75 mt-0.5">
                    {isPDF(fileName, fileUrl) ? "Click to view PDF" : "Click to download"}
                  </div>
                )}
              </div>
            </div>
            <div
              className="flex gap-4 text-sm pt-2 border-t"
              style={{
                borderColor: isSender
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.15)",
              }}
            >
              {isPDF(fileName, fileUrl) ? (
                <>
                  <button
                    onClick={() => window.open(fileUrl, "_blank")}
                    className="underline hover:opacity-80 font-medium"
                  >
                    View PDF
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(fileUrl, fileName || content || "document.pdf")
                    }
                    className="underline hover:opacity-80 font-medium"
                  >
                    Download
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => window.open(fileUrl, "_blank")}
                    className="underline hover:opacity-80 font-medium"
                  >
                    Open
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(fileUrl, fileName || content || "file")
                    }
                    className="underline hover:opacity-80 font-medium"
                  >
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </span>
        )}
      </div>

      {timestamp && (
        <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
      )}
    </div>
  );
}