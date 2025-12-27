
"use client";

import { Suspense } from "react";
import SwapRequestsPage from "@/components/requests/SwapRequestsPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading swap requests...</div>}>
      <SwapRequestsPage />
    </Suspense>
  );
}
