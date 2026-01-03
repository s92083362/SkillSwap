"use client";

import React from "react";

type ActivityLogItem = {
  id: string;
  description: string;
  timestamp: any;        // Firestore Timestamp
  type?: string;         // "user" | "exchange" | "lesson" | etc.
};

export interface RecentActivityProps {
  logs: ActivityLogItem[];
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function dotColor(type?: string) {
  if (type === "user") return "bg-green-500";
  if (type === "exchange") return "bg-blue-500";
  if (type === "lesson") return "bg-purple-500";
  return "bg-gray-400";
}

const RecentActivity: React.FC<RecentActivityProps> = ({ logs }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-gray-900">
        Recent Activity
      </h3>
    </div>

    <div className="space-y-4">
      {logs.slice(0, 5).map((log) => {
        const date = log.timestamp?.toDate?.() || new Date(log.timestamp);
        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`h-3 w-3 rounded-full ${dotColor(
                  log.type
                )} border-2 border-white shadow`}
              />
              <span className="flex-1 w-px bg-gray-200 mt-1" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">
                {timeAgo(date)}
              </p>
              <p className="text-sm text-gray-800">{log.description}</p>
            </div>
          </div>
        );
      })}

      {logs.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-3">
          No recent activity yet.
        </p>
      )}
    </div>

    <button
      type="button"
      className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      View All Logs
    </button>
  </div>
);

export default RecentActivity;
