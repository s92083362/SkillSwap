"use client";

import { Suspense } from "react";
import LoginAndSignupInner from "@/components/auth/LoginandSignupInner";


export default function LoginAndSignupPage() {
  return (
    <Suspense fallback={null}>
      <LoginAndSignupInner />
    </Suspense>
  );
}
