"use client";

import React from "react";
import {
  VideoCameraIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraSlashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/solid";
import { useVideoCall, VideoCallHookArgs } from "@/hooks/video/useVideoCall";

export default function VideoCall(props: VideoCallHookArgs) {
  const {
    // state
    isCalling,
    isReceivingCall,
    callStatus,
    isMuted,
    isVideoOff,
    isSpeakerOff,
    isScreenSharing,
    permissionError,
    showPermissionGuide,
    isConnected,
    remoteScreenSharing,
    remoteScreenSharerName,
    showChat,
    chatMessages,
    chatInput,
    unreadCount,
    showAttachMenu,
    selectedFile,
    filePreview,
    fileCaption,
    uploading,
    uploadError,
    minimized,
    offset,

    // refs
    dragHandleRef,
    localVideoRef,
    remoteVideoRef,
    screenShareRef,
    chatEndRef,
    fileInputRef,
    outgoingAudioRef,
    incomingAudioRef,

    // actions
    setShowChat,
    setUnreadCount,
    setShowAttachMenu,
    setFileCaption,
    setChatInput,
    setMinimized,
    setOffset,
    retryPermissions,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleScreenShare,
    sendChatMessage,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
    startCall,
    answerCall,
    declineCall,
    endCall,
    getBrowserInstructions,
  } = useVideoCall(props);

  const { otherUserName, onClose } = props;

  if (permissionError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-center mb-2">
            Permission Required
          </h2>
          <p className="text-gray-600 text-center mb-4">{permissionError}</p>

          {showPermissionGuide && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 font-semibold mb-2">
                How to enable:
              </p>
              <p className="text-sm text-gray-600">
                {getBrowserInstructions()}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={retryPermissions}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minimizedStyle = minimized
    ? ({
        right: Math.max(0, 16 + offset.x),
        bottom: Math.max(0, 80 + offset.y),
        width: 280,
        height: 64,
      } as React.CSSProperties)
    : ({} as React.CSSProperties);

  return (
    <div
      className={`fixed z-50 flex flex-col ${
        minimized ? "bg-gray-900 rounded-lg shadow-2xl" : "inset-0 bg-black"
      }`}
      style={minimizedStyle}
    >
      {/* Header / drag handle */}
      <div
        ref={dragHandleRef}
        className={`flex items-center justify-between px-3 py-2 bg-gray-900 text-white ${
          minimized ? "cursor-move rounded-t-lg" : "cursor-default"
        }`}
      >
        <span className="text-xs sm:text-sm truncate">
          Video call with {otherUserName}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="text-xs px-2 py-1 bg-gray-700 rounded flex items-center gap-1 hover:bg-gray-600"
          >
            <ArrowsPointingOutIcon className="w-3 h-3" />
            <span className="hidden sm:inline">
              {minimized ? "Maximize" : "Minimize"}
            </span>
          </button>
          <button
            onClick={endCall}
            className="w-6 h-6 flex items-center justify-center bg-red-600 rounded-full hover:bg-red-700"
          >
            <PhoneXMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <audio ref={outgoingAudioRef} src="/sounds/outgoing-call.mp3" loop />
          <audio ref={incomingAudioRef} src="/sounds/incoming-call.mp3" loop />

          <div className="flex-1 relative overflow-hidden">
            {/* Main screen share (local or remote) */}
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className={
                isScreenSharing || remoteScreenSharing
                  ? "absolute inset-0 w-full h-full object-contain bg-black z-0"
                  : "hidden"
              }
            />

            {/* Remote camera when no screen share */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={
                !isScreenSharing && !remoteScreenSharing
                  ? "w-full h-full object-cover"
                  : "hidden"
              }
            />

            {/* Local PiP (camera only, no mini controls) */}
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 w-24 h-32 sm:w-32 sm:h-40 md:w-40 md:h-52 lg:w-48 lg:h-60 bg-gray-800 rounded-lg overflow-hidden shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Local screen-share banner */}
            {isScreenSharing && (
              <div className="absolute top-16 sm:top-20 left-2 sm:left-4 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 z-20">
                <ComputerDesktopIcon className="w-3 h-3" />
                <span className="hidden sm:inline">
                  You are sharing your screen
                </span>
                <span className="sm:hidden">Sharing</span>
              </div>
            )}

            {/* Remote screen-share banner */}
            {remoteScreenSharing && !isScreenSharing && (
              <div className="absolute top-24 sm:top-28 left-2 sm:left-4 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 z-20">
                <ComputerDesktopIcon className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {remoteScreenSharerName || otherUserName} is sharing the
                  screen
                </span>
                <span className="sm:hidden">Remote sharing</span>
              </div>
            )}

            {/* Call status */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-black bg-opacity-60 px-2 sm:px-4 py-1 sm:py-2 rounded-lg z-20">
              <p className="text-white text-xs sm:text-sm font-medium">
                {callStatus}
              </p>
              <p className="text-gray-300 text-[10px] sm:text-xs">
                {otherUserName}
              </p>
            </div>

            {uploadError && (
              <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-2 rounded shadow text-xs max-w-[90%] sm:max-w-xs z-30">
                {uploadError}
              </div>
            )}

            {/* Incoming call overlay */}
            {isReceivingCall && !isConnected && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30 p-4">
                <div className="bg-gray-900 text-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl">
                  <p className="text-xs sm:text-sm text-gray-300 mb-1">
                    Incoming call
                  </p>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">
                    {otherUserName}
                  </h2>
                  <p className="text-xs text-gray-400 mb-4 sm:mb-6">
                    {callStatus}
                  </p>
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <button
                      onClick={answerCall}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 flex items-center justify-center mb-1 hover:bg-green-600">
                        <VideoCameraIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm">Answer</span>
                    </button>
                    <button
                      onClick={declineCall}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 flex items-center justify-center mb-1 hover:bg-red-600">
                        <PhoneXMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm">Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {showChat && (
              <div className="absolute right-2 sm:right-4 top-16 sm:top-20 bottom-20 sm:bottom-24 w-[90%] sm:w-80 md:w-96 bg-white rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-160px)] sm:max-h-[calc(100vh-200px)] z-30">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                    Chat with {otherUserName}
                  </h3>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-gray-500 text-xs sm:text-sm">
                      No messages yet
                    </p>
                  ) : (
                    chatMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderId === props.currentUserId
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-[70%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                            msg.senderId === props.currentUserId
                              ? "bg-blue-500 text-white"
                              : msg.type === "system"
                              ? "bg-yellow-100 text-gray-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {msg.type === "image" && msg.fileUrl && (
                            <img
                              src={msg.fileUrl}
                              alt="Shared"
                              className="max-w-full rounded mb-1"
                            />
                          )}
                          {msg.type === "file" && msg.fileUrl && (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline break-all"
                            >
                              {msg.fileName || "Download file"}
                            </a>
                          )}
                          {msg.content && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* File preview */}
                {selectedFile && (
                  <div className="border-t p-2 sm:p-3 bg-gray-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 truncate flex-1">
                        Selected: {selectedFile.name}
                      </p>
                      <button
                        onClick={cancelFileUpload}
                        className="text-xs text-red-500 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-24 sm:max-h-32 rounded object-cover"
                      />
                    )}
                    <input
                      type="text"
                      value={fileCaption}
                      onChange={(e) => setFileCaption(e.target.value)}
                      placeholder="Add a caption (optional)"
                      className="text-xs border rounded px-2 py-1"
                    />
                    <button
                      disabled={uploading}
                      onClick={sendFileMessage}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-60"
                    >
                      {uploading ? "Uploading..." : "Send"}
                    </button>
                  </div>
                )}

                {/* Chat input */}
                <div className="border-t p-2 sm:p-3 flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowAttachMenu((v) => !v)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                    >
                      <PhotoIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-9 left-0 bg-white rounded shadow-lg border text-xs z-10">
                        <button
                          className="px-3 py-2 hover:bg-gray-100 w-full text-left whitespace-nowrap"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowAttachMenu(false);
                          }}
                        >
                          Choose from device
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    className="flex-1 border rounded-full px-3 py-1.5 text-xs sm:text-sm"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChatMessage();
                    }}
                  />
                  <button
                    onClick={sendChatMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 flex flex-col items-center gap-2 sm:gap-3 z-20">
              {!isConnected && isCalling && (
                <p className="text-xs text-gray-300 mb-1">
                  Ringing {otherUserName}...
                </p>
              )}

              <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 bg-black bg-opacity-40 rounded-full px-3 sm:px-4 py-2 flex-wrap max-w-[95%] sm:max-w-none">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    isMuted ? "bg-red-600" : "bg-gray-800"
                  } text-white hover:opacity-80`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  <MicrophoneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Video */}
                <button
                  onClick={toggleVideo}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    isVideoOff ? "bg-red-600" : "bg-gray-800"
                  } text-white hover:opacity-80`}
                  title={isVideoOff ? "Turn on video" : "Turn off video"}
                >
                  {isVideoOff ? (
                    <VideoCameraSlashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <VideoCameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                {/* Speaker */}
                <button
                  onClick={toggleSpeaker}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    isSpeakerOff ? "bg-red-600" : "bg-gray-800"
                  } text-white hover:opacity-80`}
                  title={isSpeakerOff ? "Unmute speaker" : "Mute speaker"}
                >
                  {isSpeakerOff ? (
                    <SpeakerXMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                {/* Screen share */}
                <button
                  onClick={toggleScreenShare}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    isScreenSharing ? "bg-blue-600" : "bg-gray-800"
                  } text-white hover:opacity-80`}
                  title={isScreenSharing ? "Stop sharing" : "Share screen"}
                >
                  <ComputerDesktopIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Chat */}
                <button
                  onClick={() => {
                    setShowChat((v) => !v);
                    setUnreadCount(0);
                  }}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gray-800 text-white hover:opacity-80"
                  title="Chat"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Start call (if not already) */}
                {!isConnected && !isCalling && !isReceivingCall && (
                  <button
                    onClick={startCall}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2"
                    title="Start call"
                  >
                    <VideoCameraIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Start Call</span>
                    <span className="sm:hidden">Call</span>
                  </button>
                )}

                {/* End call */}
                <button
                  onClick={endCall}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
                  title="End call"
                >
                  <PhoneXMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
