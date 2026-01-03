"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../../../lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
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
  Cell,
} from "recharts";
import RecentActivity, { RecentActivityProps } from "./RecentActivity";
import {
  processActivityData,
  calculateStatsData,
  generateMockData,
  generateMockStatsData,
  generateSmartInsights,
  getColorClass,
  ActivityData,
  StatsCard,
} from "@/utils/analytics/analyticsUtils";

type ActivityLogItem = RecentActivityProps["logs"][number];

export default function AnalyticsReport() {
  const [user] = useAuthState(auth as any);

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentLogs, setRecentLogs] = useState<ActivityLogItem[]>([]);

  // KPI cards
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeExchanges, setActiveExchanges] = useState<number | null>(null);
  const [newLessons24h, setNewLessons24h] = useState<number | null>(null);

  // Load admin flag then analytics
  useEffect(() => {
    const init = async () => {
      try {
        if (!user?.uid) {
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const adminFlag =
          userSnap.exists() && userSnap.data().isAdmin === true;
        setIsAdmin(adminFlag);

        await fetchAnalyticsData(adminFlag);
      } catch (err: any) {
        console.error("❌ Error loading user role:", err);
        setError("Failed to load user role: " + err.message);
        setUseMockData(true);
        const mockData = generateMockData(timeRange);
        setActivityData(mockData);
        const mockStatsData = generateMockStatsData(mockData);
        setStats([
          { ...mockStatsData.totalLogins, icon: <Activity className="w-5 h-5" /> },
          { ...mockStatsData.totalActions, icon: <TrendingUp className="w-5 h-5" /> },
          { ...mockStatsData.avgSession, icon: <Clock className="w-5 h-5" /> },
          { ...mockStatsData.totalTime, icon: <Calendar className="w-5 h-5" /> },
        ]);
        setLoading(false);
      }
    };

    init();
  }, [user, timeRange]);

  // Load KPI summary cards
  useEffect(() => {
    const loadKpis = async () => {
      try {
        // Total users
        const usersSnap = await getDocs(
          query(collection(db, "users"), limit(5000))
        );
        setTotalUsers(usersSnap.size);

        // Active exchanges = accepted swap requests
        const exchangesSnap = await getDocs(
          query(
            collection(db, "swapRequests"),
            where("status", "==", "accepted"),
            limit(5000)
          )
        );
        setActiveExchanges(exchangesSnap.size);

        // New lessons in last 24h
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const lessonsSnap = await getDocs(
          query(
            collection(db, "lessons"),
            where("createdAt", ">=", since),
            limit(5000)
          )
        );
        setNewLessons24h(lessonsSnap.size);
      } catch (e: any) {
        console.error("❌ Error loading KPI cards:", e);
      }
    };

    loadKpis();
  }, []);

  const fetchAnalyticsData = async (adminFlag: boolean) => {
    try {
      if (!user?.uid) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const now = new Date();
      const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );

      let activityQuery;

      if (adminFlag) {
        // Admin: all users' logs in range
        activityQuery = query(
          collection(db, "activityLogs"),
          where("timestamp", ">=", startDate),
          orderBy("timestamp", "desc"),
          limit(1000)
        );
      } else {
        // Normal user: only own logs
        activityQuery = query(
          collection(db, "activityLogs"),
          where("userId", "==", user.uid),
          where("timestamp", ">=", startDate),
          orderBy("timestamp", "desc"),
          limit(1000)
        );
      }

      const snapshot = await getDocs(activityQuery);
      setTotalLogs(snapshot.size);

      if (snapshot.empty) {
        setUseMockData(true);
        const mockData = generateMockData(timeRange);
        setActivityData(mockData);
        const mockStatsData = generateMockStatsData(mockData);
        setStats([
          { ...mockStatsData.totalLogins, icon: <Activity className="w-5 h-5" /> },
          { ...mockStatsData.totalActions, icon: <TrendingUp className="w-5 h-5" /> },
          { ...mockStatsData.avgSession, icon: <Clock className="w-5 h-5" /> },
          { ...mockStatsData.totalTime, icon: <Calendar className="w-5 h-5" /> },
        ]);
        setError(
          adminFlag
            ? "No activity data yet for any user."
            : "No activity data yet. Start using the app to see real analytics!"
        );
        setLoading(false);
        return;
      }

      const logs = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as ActivityLogItem[];

      // charts + stats
      const processedData = processActivityData(logs, daysAgo);
      setActivityData(processedData);

      const statsData = calculateStatsData(logs, processedData);
      setStats([
        { ...statsData.totalLogins, icon: <Activity className="w-5 h-5" /> },
        { ...statsData.totalActions, icon: <TrendingUp className="w-5 h-5" /> },
        { ...statsData.avgSession, icon: <Clock className="w-5 h-5" /> },
        { ...statsData.totalTime, icon: <Calendar className="w-5 h-5" /> },
      ]);

      // Recent Activity timeline (sorted newest first)
      const sorted = [...logs].sort(
        (a: any, b: any) =>
          (b.timestamp?.toMillis?.() || 0) -
          (a.timestamp?.toMillis?.() || 0)
      );
      setRecentLogs(sorted);

      setUseMockData(false);
      setError(null);
      setLoading(false);
    } catch (error: any) {
      console.error("❌ Error fetching analytics:", error);
      setError("An error occurred while loading analytics: " + error.message);
      const mockData = generateMockData(timeRange);
      setActivityData(mockData);
      const mockStatsData = generateMockStatsData(mockData);
      setStats([
        { ...mockStatsData.totalLogins, icon: <Activity className="w-5 h-5" /> },
        { ...mockStatsData.totalActions, icon: <TrendingUp className="w-5 h-5" /> },
        { ...mockStatsData.avgSession, icon: <Clock className="w-5 h-5" /> },
        { ...mockStatsData.totalTime, icon: <Calendar className="w-5 h-5" /> },
      ]);
      setUseMockData(true);
      setLoading(false);
    }
  };

  const totalLogins = activityData.reduce((sum, d) => sum + d.logins, 0);
  const totalOther = activityData.reduce((sum, d) => sum + d.actions - d.logins, 0);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[16rem] px-3 sm:px-4 md:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6">
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
            onClick={() => fetchAnalyticsData(isAdmin)}
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
              onClick={() => setTimeRange("7d")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                timeRange === "7d"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                timeRange === "30d"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("90d")}
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

      {/* KPI cards */}
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
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
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
}