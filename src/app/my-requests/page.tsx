"use client";

import { Suspense } from "react";
import MyRequestsPage from "@/components/requests/MyRequestsPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading requests...</div>}>
      <MyRequestsPage />
    </Suspense>
  );
}
