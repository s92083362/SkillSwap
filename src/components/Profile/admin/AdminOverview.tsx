"use client";

import React, { useState, useEffect } from "react";
import {
 collection,
 query,
 where,
 getDocs,
 orderBy,
 limit,
 Timestamp,
 onSnapshot,
 doc,
 getDoc,
 DocumentData,
 QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../../lib/firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import {
 TrendingUp,
 Activity,
 Users,
 BookOpen,
 Mail,
 Bell,
 Calendar,
 ArrowUpRight,
 ArrowDownRight,
 Clock,
 MessageSquare,
} from "lucide-react";

type FirestoreTimestamp = {
 toDate: () => Date;
};

type Message = {
 id: string;
 senderId?: string;
 senderName?: string;
 senderAvatar?: string | null;
 senderEmail?: string;
 receiverId?: string;
 content?: string;
 text?: string;
 subject?: string;
 message?: string;
 timestamp?: FirestoreTimestamp | Timestamp | Date | number | null;
 read?: boolean;
 [key: string]: any;
};

type UserDoc = {
 displayName?: string;
 name?: string;
 username?: string;
 photoURL?: string;
 photoUrl?: string;
 avatar?: string;
 profilePicture?: string;
 email?: string;
};

type Update = {
 id: string;
 title: string;
 description: string;
 type: "info" | "warning" | "success";
 timestamp: Date;
};

export default function AdminOverview() {
 const [user] = useAuthState(auth as any);
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 
 // Analytics Stats
 const [totalUsers, setTotalUsers] = useState<number>(0);
 const [activeExchanges, setActiveExchanges] = useState<number>(0);
 const [totalLessons, setTotalLessons] = useState<number>(0);
 const [todayActivity, setTodayActivity] = useState<number>(0);
 
 // Growth percentages (calculated from real data)
 const [userGrowth, setUserGrowth] = useState(0);
 const [exchangeGrowth, setExchangeGrowth] = useState(0);
 const [lessonGrowth, setLessonGrowth] = useState(0);
 const [activityGrowth, setActivityGrowth] = useState(0);
 
 // Unread Messages
 const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
 const [totalUnreadCount, setTotalUnreadCount] = useState(0);
 const [messagesLoading, setMessagesLoading] = useState(true);
 
 // Important Updates
 const [updates, setUpdates] = useState<Update[]>([]);

 useEffect(() => {
 if (user?.uid) {
 loadOverviewData();
 }
 }, [user]);

 const loadOverviewData = async () => {
 try {
 setLoading(true);

 // Load Analytics Stats
 await loadAnalyticsStats();

 // Load Unread Messages
 loadUnreadMessages();

 // Load Important Updates
 loadImportantUpdates();

 setLoading(false);
 } catch (error) {
 console.error("Error loading overview data:", error);
 setLoading(false);
 }
 };

 const loadAnalyticsStats = async () => {
 try {
 const now = new Date();
 const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
 const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

 // Total Users (current)
 const usersSnap = await getDocs(
 query(collection(db, "users"), limit(5000))
 );
 const currentUsers = usersSnap.size;
 setTotalUsers(currentUsers);

 // Users from last week (for growth calculation)
 try {
 const usersLastWeekSnap = await getDocs(
 query(
 collection(db, "users"),
 where("createdAt", "<=", lastWeek),
 limit(5000)
 )
 );
 const usersLastWeek = usersLastWeekSnap.size;
 const userGrowthCalc = usersLastWeek > 0 
 ? ((currentUsers - usersLastWeek) / usersLastWeek) * 100 
 : 0;
 setUserGrowth(parseFloat(userGrowthCalc.toFixed(1)));
 } catch (error) {
 console.error("Error calculating user growth:", error);
 setUserGrowth(0);
 }

 // Active Exchanges (current)
 const exchangesSnap = await getDocs(
 query(
 collection(db, "swapRequests"),
 where("status", "==", "accepted"),
 limit(5000)
 )
 );
 const currentExchanges = exchangesSnap.size;
 setActiveExchanges(currentExchanges);

 // Exchanges from last week
 try {
 const exchangesLastWeekSnap = await getDocs(
 query(
 collection(db, "swapRequests"),
 where("status", "==", "accepted"),
 where("acceptedAt", "<=", lastWeek),
 limit(5000)
 )
 );
 const exchangesLastWeek = exchangesLastWeekSnap.size;
 const exchangeGrowthCalc = exchangesLastWeek > 0 
 ? ((currentExchanges - exchangesLastWeek) / exchangesLastWeek) * 100 
 : 0;
 setExchangeGrowth(parseFloat(exchangeGrowthCalc.toFixed(1)));
 } catch (error) {
 console.error("Error calculating exchange growth:", error);
 setExchangeGrowth(0);
 }

 // Total Lessons (current)
 const lessonsSnap = await getDocs(
 query(collection(db, "lessons"), limit(5000))
 );
 const currentLessons = lessonsSnap.size;
 setTotalLessons(currentLessons);

 // Lessons from last week
 try {
 const lessonsLastWeekSnap = await getDocs(
 query(
 collection(db, "lessons"),
 where("createdAt", "<=", lastWeek),
 limit(5000)
 )
 );
 const lessonsLastWeek = lessonsLastWeekSnap.size;
 const lessonGrowthCalc = lessonsLastWeek > 0 
 ? ((currentLessons - lessonsLastWeek) / lessonsLastWeek) * 100 
 : 0;
 setLessonGrowth(parseFloat(lessonGrowthCalc.toFixed(1)));
 } catch (error) {
 console.error("Error calculating lesson growth:", error);
 setLessonGrowth(0);
 }

 // Today's Activity (last 24 hours)
 const activityTodaySnap = await getDocs(
 query(
 collection(db, "activityLogs"),
 where("timestamp", ">=", yesterday),
 limit(5000)
 )
 );
 const activityToday = activityTodaySnap.size;
 setTodayActivity(activityToday);

 // Activity from previous 24 hours (for comparison)
 try {
 const activityYesterdaySnap = await getDocs(
 query(
 collection(db, "activityLogs"),
 where("timestamp", ">=", twoWeeksAgo),
 where("timestamp", "<", yesterday),
 limit(5000)
 )
 );
 const activityYesterday = activityYesterdaySnap.size;
 const activityGrowthCalc = activityYesterday > 0 
 ? ((activityToday - activityYesterday) / activityYesterday) * 100 
 : 0;
 setActivityGrowth(parseFloat(activityGrowthCalc.toFixed(1)));
 } catch (error) {
 console.error("Error calculating activity growth:", error);
 setActivityGrowth(0);
 }

 } catch (error) {
 console.error("Error loading analytics stats:", error);
 }
 };

 const loadUnreadMessages = () => {
 try {
 if (!user?.uid) {
 setUnreadMessages([]);
 setMessagesLoading(false);
 return;
 }

 setMessagesLoading(true);

 // Query for UNREAD messages only with real-time listener
 const messagesQuery = query(
 collection(db, "messages"),
 where("receiverId", "==", user.uid),
 where("read", "==", false),
 orderBy("timestamp", "desc"),
 limit(5)
 );

 // Set up real-time listener
 const unsubscribe = onSnapshot(
 messagesQuery,
 async (snapshot) => {
 const msgs: Message[] = [];

 for (const docSnap of snapshot.docs as QueryDocumentSnapshot<DocumentData>[]) {
 const raw = docSnap.data() as DocumentData;
 
 // Double-check that the message is still unread
 if (raw.read === true) {
 continue;
 }

 const msgData: Message = {
 id: docSnap.id,
 ...raw,
 };

 // Fetch sender information
 if (msgData.senderId) {
 try {
 const senderRef = doc(db, "users", msgData.senderId);
 const senderSnap = await getDoc(senderRef);

 if (senderSnap.exists()) {
 const senderData = senderSnap.data() as UserDoc;
 msgData.senderAvatar = getAvatarUrl(senderData);
 msgData.senderName = getDisplayName(senderData);
 msgData.senderEmail = senderData.email || "";
 }
 } catch (error) {
 console.error("Error fetching sender profile:", error);
 if (!msgData.senderName) msgData.senderName = "Unknown User";
 }
 } else {
 if (!msgData.senderName) msgData.senderName = "Unknown User";
 }

 msgs.push(msgData);
 }

 setUnreadMessages(msgs);
 setTotalUnreadCount(msgs.length);
 setMessagesLoading(false);
 },
 (error) => {
 console.error("Error loading unread messages:", error);
 setUnreadMessages([]);
 setMessagesLoading(false);
 }
 );

 // Cleanup function will be called when component unmounts
 return () => {
 unsubscribe();
 };
 } catch (error) {
 console.error("Error setting up messages listener:", error);
 setUnreadMessages([]);
 setMessagesLoading(false);
 }
 };

 // Helper to get avatar URL
 const getAvatarUrl = (userData?: UserDoc | null): string | null => {
 if (!userData) return null;
 return (
 userData.photoURL ||
 userData.photoUrl ||
 userData.avatar ||
 userData.profilePicture ||
 null
 );
 };

 // Helper to get display name
 const getDisplayName = (userData?: UserDoc | null): string => {
 if (!userData) return "Unknown User";
 return (
 userData.displayName ||
 userData.name ||
 userData.username ||
 "Unknown User"
 );
 };

 const loadImportantUpdates = () => {
 // Mock updates - replace with actual data from your database
 const mockUpdates: Update[] = [
 {
 id: "1",
 title: "System Maintenance Scheduled",
 description: "Planned maintenance on Jan 15, 2026 from 2-4 AM EST",
 type: "info",
 timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
 },
 {
 id: "2",
 title: "New Users Spike Detected",
 description: "50+ new user registrations in the last 24 hours",
 type: "success",
 timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
 },
 {
 id: "3",
 title: "Action Required: Pending Reports",
 description: "5 user reports awaiting admin review",
 type: "warning",
 timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
 },
 ];

 setUpdates(mockUpdates);
 };

 const formatTimestamp = (timestamp: Message["timestamp"]) => {
 if (!timestamp) return "";
 
 let date: Date;
 try {
 if (timestamp instanceof Timestamp) {
 date = timestamp.toDate();
 } else if (typeof (timestamp as FirestoreTimestamp).toDate === "function") {
 date = (timestamp as FirestoreTimestamp).toDate();
 } else {
 date = new Date(timestamp as any);
 }
 } catch {
 date = new Date(timestamp as any);
 }

 const now = new Date();
 const diff = now.getTime() - date.getTime();
 const minutes = Math.floor(diff / 60000);
 const hours = Math.floor(diff / 3600000);
 const days = Math.floor(diff / 86400000);

 if (minutes < 1) return "Just now";
 if (minutes < 60) return `${minutes}m ago`;
 if (hours < 24) return `${hours}h ago`;
 if (days < 7) return `${days}d ago`;
 return date.toLocaleDateString();
 };

 const handleViewAllMessages = () => {
 router.push("/chat/messages");
 };

 const handleMessageClick = (msg: Message) => {
 if (msg.senderId) {
 router.push(`/chat/messages?user=${msg.senderId}`);
 } else {
 router.push("/chat/messages");
 }
 };

 const handleGoToChats = () => {
 router.push("/chat/messages");
 };

 const getUpdateIcon = (type: Update["type"]) => {
 switch (type) {
 case "warning":
 return <Bell className="w-5 h-5 text-amber-600" />;
 case "success":
 return <TrendingUp className="w-5 h-5 text-green-600" />;
 default:
 return <Calendar className="w-5 h-5 text-blue-600" />;
 }
 };

 const getUpdateBgColor = (type: Update["type"]) => {
 switch (type) {
 case "warning":
 return "bg-amber-50 border-amber-200";
 case "success":
 return "bg-green-50 border-green-200";
 default:
 return "bg-blue-50 border-blue-200";
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
 <p className="text-gray-600">Loading overview...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Welcome Section */}
 <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
 <h1 className="text-2xl md:text-3xl font-bold mb-2">
 Welcome back, {user?.displayName || "Admin"}! 👋
 </h1>
 <p className="text-blue-100">
 Here's what's happening with your platform today
 </p>
 </div>

 {/* Analytics Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="p-3 bg-blue-100 rounded-lg">
 <Users className="w-6 h-6 text-blue-600" />
 </div>
 <div className={`flex items-center gap-1 text-sm font-medium ${userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {userGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
 {Math.abs(userGrowth)}%
 </div>
 </div>
 <h3 className="text-gray-600 text-sm mb-1">Total Users</h3>
 <p className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="p-3 bg-green-100 rounded-lg">
 <Activity className="w-6 h-6 text-green-600" />
 </div>
 <div className={`flex items-center gap-1 text-sm font-medium ${exchangeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {exchangeGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
 {Math.abs(exchangeGrowth)}%
 </div>
 </div>
 <h3 className="text-gray-600 text-sm mb-1">Active Exchanges</h3>
 <p className="text-2xl font-bold text-gray-900">{activeExchanges.toLocaleString()}</p>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="p-3 bg-purple-100 rounded-lg">
 <BookOpen className="w-6 h-6 text-purple-600" />
 </div>
 <div className={`flex items-center gap-1 text-sm font-medium ${lessonGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {lessonGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
 {Math.abs(lessonGrowth)}%
 </div>
 </div>
 <h3 className="text-gray-600 text-sm mb-1">Total Lessons</h3>
 <p className="text-2xl font-bold text-gray-900">{totalLessons.toLocaleString()}</p>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
 <div className="flex items-center justify-between mb-3">
 <div className="p-3 bg-amber-100 rounded-lg">
 <Clock className="w-6 h-6 text-amber-600" />
 </div>
 <div className={`flex items-center gap-1 text-sm font-medium ${activityGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {activityGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
 {Math.abs(activityGrowth)}%
 </div>
 </div>
 <h3 className="text-gray-600 text-sm mb-1">Today's Activity</h3>
 <p className="text-2xl font-bold text-gray-900">{todayActivity.toLocaleString()}</p>
 </div>
 </div>

 {/* Important Updates Section */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
 <Bell className="w-6 h-6 text-blue-600" />
 Important Updates
 </h2>
 <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
 View All
 </button>
 </div>

 {updates.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No updates at the moment</p>
 ) : (
 <div className="space-y-3">
 {updates.map((update) => (
 <div
 key={update.id}
 className={`border rounded-lg p-4 ${getUpdateBgColor(update.type)}`}
 >
 <div className="flex items-start gap-3">
 <div className="flex-shrink-0 mt-0.5">
 {getUpdateIcon(update.type)}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-gray-900 mb-1">
 {update.title}
 </h3>
 <p className="text-sm text-gray-600 mb-2">
 {update.description}
 </p>
 <p className="text-xs text-gray-500">
 {formatTimestamp(update.timestamp)}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Recent Unread Messages Section */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
 <MessageSquare className="w-6 h-6 text-blue-600" />
 Recent Unread Messages
 {totalUnreadCount > 0 && (
 <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
 {totalUnreadCount}
 </span>
 )}
 </h2>
 <button 
 onClick={handleViewAllMessages}
 className="text-blue-600 text-sm font-medium hover:text-blue-700"
 >
 View All →
 </button>
 </div>

 {/* Go to Chats Button */}
 <div className="flex justify-end mb-4">
 <button
 onClick={handleGoToChats}
 className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-100 hover:border-blue-600 transition-all duration-200 font-semibold text-sm"
 >
 <svg
 className="w-5 h-5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 xmlns="http://www.w3.org/2000/svg"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
 />
 </svg>
 Go to Chats
 </button>
 </div>

 {messagesLoading ? (
 <div className="flex justify-center items-center py-12">
 <div className="relative flex justify-center items-center">
 <div className="w-12 h-12 relative">
 <div className="absolute inset-0 flex justify-center items-center">
 <div
 className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
 style={{
 top: "0%",
 left: "50%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-600 rounded-full absolute animate-pulse"
 style={{
 top: "14.6%",
 left: "85.4%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.1s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-500 rounded-full absolute animate-pulse"
 style={{
 top: "50%",
 left: "100%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.2s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-400 rounded-full absolute animate-pulse"
 style={{
 top: "85.4%",
 left: "85.4%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.3s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
 style={{
 top: "100%",
 left: "50%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.4s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
 style={{
 top: "85.4%",
 left: "14.6%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.5s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-200 rounded-full absolute animate-pulse"
 style={{
 top: "50%",
 left: "0%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.6s",
 }}
 ></div>
 <div
 className="w-2.5 h-2.5 bg-blue-300 rounded-full absolute animate-pulse"
 style={{
 top: "14.6%",
 left: "14.6%",
 transform: "translate(-50%, -50%)",
 animationDelay: "0.7s",
 }}
 ></div>
 </div>
 </div>
 </div>
 </div>
 ) : unreadMessages.length === 0 ? (
 <div className="text-center py-8">
 <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500">No unread messages</p>
 </div>
 ) : (
 <>
 <div className="space-y-3">
 {unreadMessages.map((message) => (
 <div
 key={message.id}
 onClick={() => handleMessageClick(message)}
 className="bg-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer hover:bg-blue-50 hover:shadow-md transition-all duration-200 border-l-4 border-blue-500 border border-gray-200"
 >
 <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
 {message.senderAvatar ? (
 <img
 src={message.senderAvatar}
 alt={message.senderName || "User"}
 className="w-full h-full object-cover"
 onError={(e) => {
 const target = e.currentTarget;
 target.style.display = "none";
 if (target.parentElement) {
 target.parentElement.innerHTML = `<span class="text-sm font-semibold text-blue-700">${(
 message.senderName || "?"
 )
 .charAt(0)
 .toUpperCase()}</span>`;
 }
 }}
 />
 ) : (
 <span className="text-sm font-semibold text-blue-700">
 {(message.senderName || "?").charAt(0).toUpperCase()}
 </span>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-bold text-gray-800 text-base sm:text-lg truncate">
 {message.senderName || "Unknown User"}
 </p>
 <p className="font-semibold text-gray-700 text-sm sm:text-base truncate">
 {message.content || message.text || message.message || ""}
 </p>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="text-xs text-gray-400 whitespace-nowrap">
 {formatTimestamp(message.timestamp)}
 </span>
 <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
 </div>
 </div>
 ))}
 </div>

 <div className="mt-4 text-center">
 <button
 onClick={handleViewAllMessages}
 className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline transition-colors"
 >
 View All Messages in Chat
 </button>
 </div>
 {unreadMessages.length > 0 && (
 <p className="text-right text-gray-400 text-xs mt-4">
 Last updated: {formatTimestamp(unreadMessages[0].timestamp)}
 </p>
 )}
 </>
 )}
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <button className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-center group">
 <Users className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium text-gray-900">Manage Users</p>
 </button>
 <button className="bg-white border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-md transition-all text-center group">
 <Activity className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium text-gray-900">View Analytics</p>
 </button>
 <button className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all text-center group">
 <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium text-gray-900">Manage Lessons</p>
 </button>
 <button className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all text-center group">
 <Mail className="w-8 h-8 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium text-gray-900">Send Message</p>
 </button>
 </div>
 </div>
 );
}