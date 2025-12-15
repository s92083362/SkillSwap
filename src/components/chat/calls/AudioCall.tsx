"use client";

import React from "react";
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { useAudioCall, AudioCallProps } from "@/hooks/audio/useAudioCall";

export default function AudioCall(props: AudioCallProps) {
  const {
    currentUserId,
    otherUserName,
  } = props;

  const {
    // state
    callStatus,
    isCalling,
    isReceivingCall,
    isConnected,
    isMuted,
    isSpeakerOff,
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

    // refs
    incomingAudioRef,
    outgoingAudioRef,
    remoteAudioRef,
    chatEndRef,
    fileInputRef,

    // setters / actions
    setShowChat,
    setChatInput,
    setShowAttachMenu,
    setFileCaption,
    setUnreadCount,

    // call controls
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,

    // chat / file
    sendChatMessage,
    handleFileSelect,
    cancelFileUpload,
    sendFileMessage,
  } = useAudioCall(props);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <audio ref={incomingAudioRef} src="/sounds/incoming-call.mp3" loop />
      <audio ref={outgoingAudioRef} src="/sounds/outgoing-call.mp3" loop />
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative flex flex-col lg:flex-row gap-2 sm:gap-4 items-stretch lg:items-start w-full max-w-6xl h-full lg:h-auto">
        {/* Main call interface */}
        <div className="bg-gray-900 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full lg:max-w-sm flex flex-col items-center gap-3 sm:gap-4 shadow-2xl flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-300 text-center">
            {isConnected ? "Connected" : callStatus}
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-center">
            {otherUserName}
          </h2>

          {!isConnected && isCalling && (
            <p className="text-xs text-gray-400">Ringing...</p>
          )}
          {!isConnected && isReceivingCall && (
            <p className="text-xs text-gray-400">Incoming audio call...</p>
          )}

          {uploadError && (
            <div className="bg-red-500 text-white px-3 py-2 rounded text-xs max-w-xs text-center">
              {uploadError}
            </div>
          )}

          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4 lg:gap-6 flex-wrap">
            <button
              onClick={toggleMute}
              disabled={!isConnected}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? "bg-red-600" : "bg-gray-700"
              } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={toggleSpeaker}
              disabled={!isConnected}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${
                isSpeakerOff ? "bg-red-600" : "bg-gray-700"
              } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSpeakerOff ? (
                <SpeakerXMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            <button
              onClick={() => setShowChat((v) => !v)}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gray-700 transition-colors"
            >
              <ChatBubbleLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={endCall}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {isReceivingCall && !isConnected && (
            <div className="mt-4 sm:mt-6 flex gap-6 sm:gap-8">
              <button
                onClick={declineCall}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <PhoneXMarkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={answerCall}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <PhoneIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          )}

          {!isCalling && !isReceivingCall && !isConnected && (
            <button
              onClick={startCall}
              className="mt-4 px-4 sm:px-6 py-2 rounded-full bg-green-600 hover:bg-green-700 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Start Audio Call
            </button>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full lg:w-96 flex flex-col flex-1 lg:flex-initial lg:h-[600px] min-h-0">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                Chat with {otherUserName}
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-0">
              {chatMessages.length === 0 ? (
                <p className="text-center text-gray-500 text-xs sm:text-sm">
                  No messages yet
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${
                        msg.senderId === currentUserId
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.type === "image" && msg.fileUrl && (
                        <img
                          src={msg.fileUrl}
                          alt="Shared image"
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
                      {msg.type === "audio-call" && (
                        <p className="text-xs sm:text-sm italic">
                          {msg.callStatus === "completed" && "Audio call"}
                          {msg.callStatus === "missed" &&
                            "Missed audio call"}
                          {msg.callStatus === "rejected" &&
                            "Rejected audio call"}
                          {msg.callStatus === "cancelled" &&
                            "Cancelled audio call"}
                          {typeof msg.callDuration === "number" &&
                            msg.callDuration > 0 &&
                            ` • ${Math.floor(
                              msg.callDuration / 60
                            )}m ${msg.callDuration % 60}s`}
                        </p>
                      )}
                      {msg.content && msg.type !== "audio-call" && (
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
              <div className="border-t p-2 sm:p-3 bg-gray-50 flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-600 truncate flex-1">
                    Selected: {selectedFile.name}
                  </p>
                  <button
                    onClick={cancelFileUpload}
                    className="text-xs text-red-500 flex-shrink-0"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded px-3 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? "Sending..." : "Send file"}
                </button>
              </div>
            )}

            {/* Chat input */}
            <div className="border-t p-2 sm:p-3 flex items-center gap-2 flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <PhotoIcon className="w-4 h-4 text-gray-600" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-10 left-0 bg-white border rounded shadow-lg text-xs sm:text-sm z-10">
                    <button
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-2 hover:bg-gray-100 w-full text-left"
                    >
                      Upload photo or file
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message"
                className="flex-1 text-xs sm:text-sm border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />

              <button
                onClick={sendChatMessage}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
