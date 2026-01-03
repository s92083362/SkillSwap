"use client";

import React from "react";
import {
  BarChart3,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  PieLabelRenderProps,
  Cell,
} from "recharts";
import RecentActivity, { RecentActivityProps } from "./RecentActivity";

export interface ActivityData {
  date: string;
  logins: number;
  actions: number;
  duration: number;
}

export interface StatsCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export type ActivityLogItem = RecentActivityProps["logs"][number];

interface AnalyticsLayoutProps {
  loading: boolean;
  error: string | null;
  useMockData: boolean;
  totalLogs: number;
  isAdmin: boolean;
  activityData: ActivityData[];
  stats: StatsCard[];
  totalUsers: number | null;
  activeExchanges: number | null;
  newLessons24h: number | null;
  recentLogs: ActivityLogItem[];
  timeRange: "7d" | "30d" | "90d";
  onRefresh: () => void;
  onTimeRangeChange: (range: "7d" | "30d" | "90d") => void;
  generateSmartInsights: () => string[];
}

const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  loading,
  error,
  useMockData,
  totalLogs,
  isAdmin,
  activityData,
  stats,
  totalUsers,
  activeExchanges,
  newLessons24h,
  recentLogs,
  timeRange,
  onRefresh,
  onTimeRangeChange,
  generateSmartInsights, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const getColorClass = (color: string) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      purple: "bg-purple-50 text-purple-600",
      orange: "bg-orange-50 text-orange-600",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const totalLogins = activityData.reduce((sum, d) => sum + d.logins, 0);
  const totalOther = activityData.reduce(
    (sum, d) => sum + d.actions - d.logins,
    0
  );
  const totalAll = totalLogins + totalOther || 1;

  const activityDistribution = [
    {
      name: "Logins",
      fullLabel: "Logins",
      value: totalLogins,
      color: "#3B82F6",
    },
    {
      name: "Other",
      fullLabel: "Other Actions",
      value: totalOther,
      color: "#10B981",
    },
  ];

  const renderPieLabel = ({ name, percent }: PieLabelRenderProps) => {
    if (name && percent !== undefined) {
      return `${name}: ${(percent * 100).toFixed(0)}%`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[16rem] px-3 sm:px-4 md:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 text-xs sm:text-sm md:text-base">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Alert Banner */}
      {(error || useMockData) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-amber-900 mb-1 text-xs sm:text-sm md:text-base">
              {useMockData ? "Demo Mode" : "Notice"}
            </h4>
            <p className="text-xs sm:text-sm text-amber-800 break-words">
              {error ||
                `Displaying ${
                  useMockData ? "sample " : ""
                }analytics data. Activity logs found: ${totalLogs}`}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
        <div className="w-full lg:w-auto">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
            <span className="truncate">Analytics Report</span>
          </h2>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm md:text-base">
            {useMockData
              ? "Sample analytics data"
              : isAdmin
              ? `Tracking ${totalLogs} activities across all users`
              : `Tracking ${totalLogs} of your activities`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex justify-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition items-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="whitespace-nowrap">Refresh</span>
          </button>

          <div className="flex w-full sm:w-auto justify-between sm:justify-start gap-1 sm:gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onTimeRangeChange("7d")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                timeRange === "7d"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => onTimeRangeChange("30d")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                timeRange === "30d"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => onTimeRangeChange("90d")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                timeRange === "90d"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-5">
          <p className="text-xs text-gray-500 mb-1">Total Users</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {totalUsers ?? "—"}
          </p>
          <p className="text-xs text-green-600 mt-1">+12% this month</p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-5">
          <p className="text-xs text-gray-500 mb-1">Active Exchanges</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {activeExchanges ?? "—"}
          </p>
          <p className="text-xs text-green-600 mt-1">+5.4% this week</p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-xs text-gray-500 mb-1">New Lessons (24h)</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {newLessons24h ?? "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Daily Average: —</p>
        </div>
      </div>

      {/* Stats + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 sm:p-3 rounded-lg ${getColorClass(stat.color)}`}>
                    {stat.icon}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                      stat.change.startsWith("+")
                        ? "text-green-600"
                        : stat.change.startsWith("-")
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-600 text-xs sm:text-sm mb-1 truncate">
                  {stat.title}
                </h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[200px]">
          <RecentActivity logs={recentLogs} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* Activity Over Time */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Activity Over Time
          </h3>
          <div className="w-full h-56 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="logins"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Logins"
                />
                <Line
                  type="monotone"
                  dataKey="actions"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Actions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Session Duration */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Session Duration (minutes)
          </h3>
          <div className="w-full h-56 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="duration" fill="#8B5CF6" name="Duration" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Distribution */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Activity Distribution
          </h3>
          <div className="w-full h-56 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius="55%"
                  dataKey="value"
                  labelLine={true}
                  label={renderPieLabel}
                  style={{ fontSize: '12px' }}
                >
                  {activityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-col xs:flex-row gap-2 sm:gap-3 md:gap-6 text-xs sm:text-sm">
            {activityDistribution.map((item) => (
              <div key={item.fullLabel} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700">
                  {item.fullLabel}:{" "}
                  {item.value === 0
                    ? "0%"
                    : `${((item.value / totalAll) * 100).toFixed(0)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Actions Comparison */}
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Daily Actions Comparison
          </h3>
          <div className="w-full h-56 sm:h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="logins" fill="#3B82F6" name="Logins" />
                <Bar dataKey="actions" fill="#10B981" name="Total Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsLayout;