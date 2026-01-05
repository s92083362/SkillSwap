<<<<<<< HEAD:src/components/auth/ForgotPassword.tsx
"use client";

import { useState , useEffect} from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "../../lib/firebase/auth";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
=======
"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
>>>>>>> 9a6ccbef1ff2fca03f33a1759791d6c7d2d17b3f:src/app/components/auth/ForgotPassword.tsx

  const handleResetRequest = () => {
    if (!email) {
<<<<<<< HEAD:src/components/auth/ForgotPassword.tsx
      setError("Please enter your email address");
      setSuccess("");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await resetPassword(email);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
=======
      setError('Please enter your email address');
      return;
    }
    setError('');
    console.log('Password reset requested for:', email);
>>>>>>> 9a6ccbef1ff2fca03f33a1759791d6c7d2d17b3f:src/app/components/auth/ForgotPassword.tsx
  };
  

  const handleBackToLogin = () => {
    router.push("/auth/login-and-signup?tab=login");
  };
   useEffect(() => {
      const prevTitle = document.title;
      document.title = "SkillSwap | ForgotPassword";
  
      return () => {
        document.title = prevTitle;
      };
    }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Image Section */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-6">
<<<<<<< HEAD:src/components/auth/ForgotPassword.tsx
          <img
            src="https://i.ibb.co/prv9CVH7/Welcome-to-Skill-Swap-1-1.png"
            alt="Welcome to SkillSwap"
=======
         {/* Image hosted on ImgBB: https://imgbb.com */}
          <img 
            src="https://i.ibb.co/prv9CVH7/Welcome-to-Skill-Swap-1-1.png" 
            alt="Welcome to SkillSwap" 
>>>>>>> 9a6ccbef1ff2fca03f33a1759791d6c7d2d17b3f:src/app/components/auth/ForgotPassword.tsx
            className="w-full h-full object-contain"
          />
        </div>

        {/* Right Side - Form Section */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">
            Forgot your password
          </h1>
          
          <p className="text-gray-600 text-base lg:text-lg mb-8">
            Please enter the email address you&apos;d like your password reset
            information sent to
          </p>

          <label className="block text-gray-700 text-sm font-medium mb-3">
            Enter email address
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter Your Email"
            className="w-full px-5 py-4 border-2 border-blue-600 rounded-lg text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-6"
          />
<<<<<<< HEAD:src/components/auth/ForgotPassword.tsx
          {error && (
            <p className="text-red-500 text-sm mb-4">
              {error}
            </p>
          )}
          {success && (
            <p className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4 text-center font-semibold">
              {success}
            </p>
          )}
=======

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

>>>>>>> 9a6ccbef1ff2fca03f33a1759791d6c7d2d17b3f:src/app/components/auth/ForgotPassword.tsx
          <button
            onClick={handleResetRequest}
            className="w-full bg-[#1F426E] text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition-colors mb-6"
          >
            Request reset link
          </button>

          <div className="text-center">
            <button
              onClick={handleBackToLogin}
              className="text-blue-600 text-base font-semibold hover:underline"
            >
              Back To Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}