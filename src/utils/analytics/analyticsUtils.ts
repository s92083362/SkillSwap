// analyticsUtils.ts

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
  
  export const processActivityData = (logs: any[], days: number): ActivityData[] => {
    const dataMap = new Map<string, ActivityData>();
    const now = new Date();
  
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dataMap.set(dateStr, {
        date: dateStr,
        logins: 0,
        actions: 0,
        duration: 0,
      });
    }
  
    logs.forEach((log) => {
      const date =
        log.timestamp?.toDate?.() || new Date(log.createdAt || Date.now());
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
  
      if (dataMap.has(dateStr)) {
        const current = dataMap.get(dateStr)!;
        if (log.action === "login") current.logins++;
        current.actions++;
        current.duration += log.duration || 0;
      }
    });
  
    return Array.from(dataMap.values());
  };
  
  export const calculatePreviousPeriodStats = (
    logs: any[],
    currentDays: number
  ) => {
    const now = new Date();
    const startDate = new Date(
      now.getTime() - currentDays * 2 * 24 * 60 * 60 * 1000
    );
    const midDate = new Date(
      now.getTime() - currentDays * 24 * 60 * 60 * 1000
    );
  
    const previousLogs = logs.filter((log) => {
      const date =
        log.timestamp?.toDate?.() || new Date(log.createdAt || Date.now());
      return date >= startDate && date < midDate;
    });
  
    const logins = previousLogs.filter((log) => log.action === "login").length;
    const actions = previousLogs.length;
    const duration = previousLogs.reduce(
      (sum, log) => sum + (log.duration || 0),
      0
    );
    const daysWithActivity = new Set(
      previousLogs.map((log) => {
        const date =
          log.timestamp?.toDate?.() || new Date(log.createdAt || Date.now());
        return date.toLocaleDateString();
      })
    ).size;
    const avgDuration =
      daysWithActivity > 0 ? duration / daysWithActivity : 0;
  
    return { logins, actions, duration, avgDuration };
  };
  
  export const calculateChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${Math.round(change)}%`;
  };
  
  export const calculateStatsData = (
    logs: any[],
    processedData: ActivityData[]
  ) => {
    const totalLogins = processedData.reduce(
      (sum, day) => sum + day.logins,
      0
    );
    const totalActions = processedData.reduce(
      (sum, day) => sum + day.actions,
      0
    );
    const totalDuration = processedData.reduce(
      (sum, day) => sum + day.duration,
      0
    );
    const daysWithActivity = processedData.filter((d) => d.actions > 0).length;
    const avgDuration =
      daysWithActivity > 0 ? totalDuration / daysWithActivity : 0;
  
    const previousPeriodStats = calculatePreviousPeriodStats(
      logs,
      processedData.length
    );
  
    return {
      totalLogins: {
        title: "Total Logins",
        value: totalLogins.toString(),
        change: calculateChange(totalLogins, previousPeriodStats.logins),
        color: "blue",
      },
      totalActions: {
        title: "Total Actions",
        value: totalActions.toString(),
        change: calculateChange(totalActions, previousPeriodStats.actions),
        color: "green",
      },
      avgSession: {
        title: "Avg. Session",
        value: `${Math.round(avgDuration)}m`,
        change: calculateChange(avgDuration, previousPeriodStats.avgDuration),
        color: "purple",
      },
      totalTime: {
        title: "Total Time",
        value: `${Math.round(totalDuration / 60)}h`,
        change: calculateChange(totalDuration, previousPeriodStats.duration),
        color: "orange",
      },
    };
  };
  
  export const generateMockData = (range: string): ActivityData[] => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const mockData: ActivityData[] = [];
    const now = new Date();
  
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      mockData.push({
        date: dateStr,
        logins: Math.floor(Math.random() * 5) + 1,
        actions: Math.floor(Math.random() * 20) + 5,
        duration: Math.floor(Math.random() * 60) + 15,
      });
    }
  
    return mockData;
  };
  
  export const generateMockStatsData = (mockData: ActivityData[]) => {
    const totalLogins = mockData.reduce((sum, d) => sum + d.logins, 0);
    const totalActions = mockData.reduce((sum, d) => sum + d.actions, 0);
    const avgDuration =
      mockData.reduce((sum, d) => sum + d.duration, 0) / mockData.length;
    const totalDuration = mockData.reduce((sum, d) => sum + d.duration, 0);
  
    return {
      totalLogins: {
        title: "Total Logins",
        value: totalLogins.toString(),
        change: "+12%",
        color: "blue",
      },
      totalActions: {
        title: "Total Actions",
        value: totalActions.toString(),
        change: "+8%",
        color: "green",
      },
      avgSession: {
        title: "Avg. Session",
        value: `${Math.round(avgDuration)}m`,
        change: "+5%",
        color: "purple",
      },
      totalTime: {
        title: "Total Time",
        value: `${Math.round(totalDuration / 60)}h`,
        change: "+15%",
        color: "orange",
      },
    };
  };
  
  export const generateSmartInsights = (
    activityData: ActivityData[],
    useMockData: boolean
  ): string[] => {
    if (useMockData || activityData.length === 0) {
      return [
        "Start using the app to generate personalized insights",
        "Login regularly to build a complete activity history",
        "Your analytics will become more accurate over time",
      ];
    }
  
    const insights: string[] = [];
    const totalLogins = activityData.reduce((sum, day) => sum + day.logins, 0);
    const totalActions = activityData.reduce((sum, day) => sum + day.actions, 0);
    const avgActionsPerDay = totalActions / activityData.length;
    const avgDuration =
      activityData.reduce((sum, day) => sum + day.duration, 0) /
        activityData.filter((d) => d.duration > 0).length || 0;
    const totalDuration = activityData.reduce((sum, day) => sum + day.duration, 0);
  
    const daysWithLogins = activityData.filter((d) => d.logins > 0).length;
    const loginRate = (daysWithLogins / activityData.length) * 100;
  
    if (loginRate >= 80) {
      insights.push(
        `Excellent consistency! You've logged in ${daysWithLogins} out of ${activityData.length} days (${loginRate.toFixed(0)}%)`
      );
    } else if (loginRate >= 50) {
      insights.push(
        `Good activity! You've been active ${daysWithLogins} days in the last ${activityData.length} days`
      );
    } else if (loginRate > 0) {
      insights.push(
        `Try logging in more regularly to get the most out of SkillSwap - currently ${daysWithLogins} active days`
      );
    } else {
      insights.push("No login activity detected in this period");
    }
  
    if (avgActionsPerDay >= 20) {
      insights.push(
        `High engagement detected! You average ${avgActionsPerDay.toFixed(0)} actions per day`
      );
    } else if (avgActionsPerDay >= 10) {
      insights.push(
        `Moderate engagement with ${avgActionsPerDay.toFixed(0)} actions per day on average`
      );
    } else if (avgActionsPerDay > 0) {
      insights.push(
        "Light usage detected - consider exploring more features to enhance your experience"
      );
    }
  
    if (avgDuration >= 30) {
      insights.push(
        `Great session length! You spend an average of ${avgDuration.toFixed(0)} minutes per session`
      );
    } else if (avgDuration >= 15) {
      insights.push(
        `Average session duration is ${avgDuration.toFixed(0)} minutes - good engagement level`
      );
    } else if (avgDuration > 0) {
      insights.push(
        `Quick sessions detected (${avgDuration.toFixed(0)}min avg) - try spending more time to explore features`
      );
    }
  
    const mostActiveDay = activityData.reduce(
      (max, day) => (day.actions > max.actions ? day : max),
      activityData[0]
    );
  
    if (mostActiveDay && mostActiveDay.actions > 0) {
      insights.push(
        `Your most active day was ${mostActiveDay.date} with ${mostActiveDay.actions} actions`
      );
    }
  
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
  
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].actions > 0) {
        tempStreak++;
        if (i === activityData.length - 1) currentStreak = tempStreak;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
  
    if (currentStreak >= 3) {
      insights.push(`🔥 You're on a ${currentStreak}-day streak! Keep it up!`);
    } else if (longestStreak >= 5) {
      insights.push(
        `Your longest streak was ${longestStreak} days - can you beat it?`
      );
    }
  
    if (totalDuration >= 300) {
      insights.push(
        `Impressive! You've spent ${(totalDuration / 60).toFixed(1)} hours learning and connecting`
      );
    } else if (totalDuration >= 120) {
      insights.push(
        `You've invested ${(totalDuration / 60).toFixed(1)} hours in skill development`
      );
    }
  
    const firstHalf = activityData.slice(0, Math.floor(activityData.length / 2));
    const secondHalf = activityData.slice(Math.floor(activityData.length / 2));
    const firstHalfAvg =
      firstHalf.reduce((sum, d) => sum + d.actions, 0) / firstHalf.length || 0;
    const secondHalfAvg =
      secondHalf.reduce((sum, d) => sum + d.actions, 0) / secondHalf.length || 0;
  
    if (secondHalfAvg > firstHalfAvg * 1.2) {
      insights.push("📈 Your activity is trending upward - great momentum!");
    } else if (firstHalfAvg > secondHalfAvg * 1.2) {
      insights.push(
        "📉 Activity has decreased recently - consider re-engaging with the platform"
      );
    }
  
    return insights.slice(0, 5);
  };
  
  export const getColorClass = (color: string) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      purple: "bg-purple-50 text-purple-600",
      orange: "bg-orange-50 text-orange-600",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };