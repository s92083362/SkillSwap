// app/user/[id]/page.tsx
"use client";

import { Suspense } from "react";
import UserPublicProfile from "@/components/Profile/user/UserPublicProfile";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <UserPublicProfile />
    </Suspense>
  );
}
