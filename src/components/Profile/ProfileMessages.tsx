"use client";
import React from "react";

// Example message data. Replace with real data or API/fetch as needed.
const messages = [
  {
    id: 1,
    sender: "Alex",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Hi Sophia, I'm really enjoying your React…",
    time: "5m ago"
  },
  {
    id: 2,
    sender: "Jordan",
    avatar: "https://randomuser.me/api/portraits/men/76.jpg",
    text: "Hey Sophia, your SQL lessons are fantastic! …",
    time: "1d ago"
  }
];

export default function ProfileMessages() {
  return (
    <section>
      <h2 className="font-bold text-xl mb-3">Recent Messages</h2>
      <ul className="space-y-3">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className="bg-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <img
              src={msg.avatar}
              alt={msg.sender}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-base sm:text-lg truncate">{msg.sender}</p>
              <p className="text-gray-500 text-sm sm:text-base truncate">{msg.text}</p>
            </div>
            <span className="text-xs text-gray-400 mt-1 sm:ml-2 whitespace-nowrap self-end sm:self-start">{msg.time}</span>
          </li>
        ))}
      </ul>
      {/* Footer timestamp (optional) */}
      <p className="text-right text-gray-400 text-xs mt-8">2h ago</p>
    </section>
  );
}
