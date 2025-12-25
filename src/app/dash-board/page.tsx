// src/app/dashboard/page.tsx
"use client";

import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import UserDashboard from "@/components/dashboard/user/UserDashboard";

export default function DashboardPage() {
  const { user, role, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e7e9f0]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show different dashboard based on role
  if (role === "admin") {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}