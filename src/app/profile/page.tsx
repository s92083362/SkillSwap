"use client";

import { Suspense } from "react";
import ProfilePageInner from "../../components/Profile/ProfilePageInner";

export default function ProfileRoute() {
  return (
    <Suspense fallback={null}>
      <main>
        <ProfilePageInner />
      </main>
    </Suspense>
  );
}
