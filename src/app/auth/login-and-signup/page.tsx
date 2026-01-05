<<<<<<< HEAD
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
=======
import LoginandSignup from "../../components/auth/LoginandSignup";
export default function LoginSignupPage() {
    return <LoginandSignup />;
  }
>>>>>>> 9a6ccbef1ff2fca03f33a1759791d6c7d2d17b3f
