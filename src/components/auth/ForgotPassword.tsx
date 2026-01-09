"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "../../lib/firebase/auth";


const getFirebaseErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = error.message.toLowerCase();
  const errorCode = errorMessage.match(/auth\/([a-z-]+)/)?.[1];

  const errorMessages: Record<string, string> = {
    "user-not-found": "No account found with this email address.",
    "invalid-email": "Please enter a valid email address.",
    "missing-email": "Please enter your email address.",
    "too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "network-request-failed": "Network error. Please check your internet connection and try again.",
    "user-disabled": "This account has been disabled. Please contact support.",
  };

  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  if (errorMessage.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (errorMessage.includes("network")) {
    return "Network error. Please check your internet connection.";
  }

  return "Unable to send reset email. Please try again.";
};


export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");

    // Validation
    if (!email) {
      setError("Please enter your email address to continue.");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess("Password reset email sent! Please check your inbox and spam folder.");
      // Clear email field after successful submission
      setTimeout(() => {
        setEmail("");
      }, 2000);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push("/auth/login-and-signup?tab=login");
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SkillSwap | Forgot Password";

    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleResetRequest();
    }
  };

  const Spinner = (
    <span className="inline-block w-6 h-6 rounded-full border-[3px] border-gray-300 border-t-white animate-spin" />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Image Section */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-6">
          <img
            src="https://i.ibb.co/prv9CVH7/Welcome-to-Skill-Swap-1-1.png"
            alt="Welcome to SkillSwap"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Right Side - Form Section */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">
            Forgot your password?
          </h1>
          <p className="text-gray-600 text-base lg:text-lg mb-8">
            No worries! Enter your email address below and we&apos;ll send you instructions to reset your password.
          </p>

          {/* Enhanced Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded mb-6 flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold mb-1">Email sent successfully!</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Enhanced Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-6 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <label className="block text-gray-700 text-sm font-medium mb-3">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Clear errors when user starts typing
              if (error) setError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter your email"
            disabled={loading}
            className="w-full px-5 py-4 border-2 border-blue-600 rounded-lg text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-6 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          />

          <button
            onClick={handleResetRequest}
            disabled={loading}
            className="w-full bg-[#1F426E] text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition-colors mb-6 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                {Spinner}
                <span>Sending...</span>
              </>
            ) : (
              "Send reset link"
            )}
          </button>

          <div className="text-center">
            <button
              onClick={handleBackToLogin}
              disabled={loading}
              className="text-blue-600 text-base font-semibold hover:underline disabled:opacity-60 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </button>
          </div>

          {/* Additional Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  if (email && !loading) {
                    handleResetRequest();
                  }
                }}
                disabled={!email || loading}
                className="text-blue-600 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}