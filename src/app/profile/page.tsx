// src/app/profile/page.tsx
"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import ProfilePageInner from "@/components/Profile/user/ProfilePageInner";
import AdminUserProfileInner from "@/components/Profile/admin/AdminUserProfileInner";

function ProfileContent() {
  const { user, role, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login-and-signup?tab=login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // If admin, show admin profile; otherwise show user profile
  if (role === "admin") {
    return <AdminUserProfileInner />;
  }

  return <ProfilePageInner />;
}

export default function ProfileRoute() {
  return (
    <Suspense fallback={null}>
      <main>
        <ProfileContent />
      </main>
    </Suspense>
  );
}
