"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  login,
  register,
  googleLogin,
  facebookLogin,
} from "../../lib/firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/firebaseConfig";

const getFirebaseErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  const errorMessage = error.message.toLowerCase();
  const errorCode = errorMessage.match(/auth\/([a-z-]+)/)?.[1];

  const errorMessages: Record<string, string> = {
    "email-already-in-use": "This email is already registered. Please login instead.",
    "invalid-email": "Please enter a valid email address.",
    "user-not-found": "No account found with this email. Please sign up first.",
    "wrong-password": "Incorrect password. Please try again or reset your password.",
    "invalid-credential": "Invalid email or password. Please check your credentials.",
    "invalid-login-credentials": "Invalid email or password. Please try again.",
    "weak-password": "Password is too weak. Please use at least 6 characters.",
    "password-does-not-meet-requirements": "Password must be at least 6 characters long.",
    "user-disabled": "This account has been disabled. Please contact support.",
    "account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
    "network-request-failed": "Network error. Please check your internet connection.",
    "too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
    "popup-closed-by-user": "Sign-in cancelled. Please try again.",
    "popup-blocked": "Pop-up blocked. Please allow pop-ups for this site.",
    "cancelled-popup-request": "Sign-in cancelled. Please try again.",
    "operation-not-allowed": "This sign-in method is not enabled. Please contact support.",
    "requires-recent-login": "Please log in again to complete this action.",
  };

  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  if (errorMessage.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (errorMessage.includes("password")) {
    return "Password must be at least 6 characters long.";
  }
  if (errorMessage.includes("network")) {
    return "Network error. Please check your internet connection.";
  }

  return "Something went wrong. Please try again.";
};

const getSuccessMessage = (action: "login" | "signup" | "social"): string => {
  const messages = {
    login: "Login successful!",
    signup: "Account created successfully!",
    social: "Login successful!",
  };
  return messages[action];
};


export default function LoginAndSignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const redirectUrl = searchParams.get("redirect");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login" || tab === "signup") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const base = "SkillSwap |  ";
    if (activeTab === "login") {
      document.title = `${base}Login`;
    } else {
      document.title = `${base}SignUp`;
    }
  }, [activeTab]); 

  const handlePostLoginRedirect = () => {
    if (redirectUrl) {
      router.replace(redirectUrl);
    } else {
      router.replace("/dash-board");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoadingSocial(true);
    try {
      const user = await googleLogin();

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          username: user.displayName || "Google User",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          tourCompleted: false,
          lastLogin: serverTimestamp(),
          authProvider: "google",
        },
        { merge: true }
      );

      setSuccess(getSuccessMessage("social"));
      setTimeout(() => {
        setSuccess("");
        handlePostLoginRedirect();
      }, 1500);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError("");
    setLoadingSocial(true);
    try {
      const user = await facebookLogin();

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          username: user.displayName || "Facebook User",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          tourCompleted: false,
          lastLogin: serverTimestamp(),
          authProvider: "facebook",
        },
        { merge: true }
      );

      setSuccess(getSuccessMessage("social"));
      setTimeout(() => {
        setSuccess("");
        handlePostLoginRedirect();
      }, 1500);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleSignUp = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");

    // Validation with user-friendly messages
    if (
      !signupData.username ||
      !signupData.email ||
      !signupData.password ||
      !signupData.confirmPassword
    ) {
      setError("Please fill in all the fields to continue.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Use and Privacy Policy to continue.");
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match. Please make sure both passwords are the same.");
      return;
    }
    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoadingSignup(true);

    try {
      const user = await register(
        signupData.email,
        signupData.password,
        signupData.username
      );

      await setDoc(doc(db, "users", user.uid), {
        email: signupData.email,
        username: signupData.username,
        createdAt: serverTimestamp(),
        tourCompleted: false,
        authProvider: "email",
        photoURL: "",
      });

      setSuccess(getSuccessMessage("signup"));

      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupData.email,
          name: signupData.username || signupData.email.split("@")[0],
        }),
      }).catch((err) => {
        console.error("Welcome email error:", err);
      });

      setTimeout(() => {
        setSuccess("");
        if (redirectUrl) {
          handlePostLoginRedirect();
        } else {
          setActiveTab("login");
        }
      }, 1500);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleLogin = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");

    if (!loginData.email || !loginData.password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoadingLogin(true);
    try {
      const user = await login(loginData.email, loginData.password);

      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess(getSuccessMessage("login"));
      setTimeout(() => {
        setSuccess("");
        handlePostLoginRedirect();
      }, 1500);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  const EyeIcon = (
    <svg
      className="w-5 h-5 text-blue-900"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );

  const GoogleIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="w-10 h-10 lg:w-12 lg:h-12"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.1 29.2 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29 35.1 26.6 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.7-3.9 4.9l.1.1 6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );

  const Spinner = (
    <span className="inline-block w-6 h-6 rounded-full border-[3px] border-gray-300 border-t-white animate-spin" />
  );

  const anyAuthLoading = loadingLogin || loadingSignup || loadingSocial;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center p-6">
          <img
            src="https://i.ibb.co/prv9CVH7/Welcome-to-Skill-Swap-1-1.png"
            alt="Welcome to SkillSwap"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="w-full lg:w-1/2 p-6 lg:p-10">
          {redirectUrl && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded mb-4 text-sm text-center">
              Please log in to view your profile
            </div>
          )}

          <div className="flex mb-6">
            <button
              onClick={() => {
                setActiveTab("login");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 text-xl lg:text-2xl font-bold pb-3 transition-colors ${
                activeTab === "login"
                  ? "text-blue-900 border-b-4 border-blue-900"
                  : "text-gray-400"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 text-xl lg:text-2xl font-bold pb-3 transition-colors ${
                activeTab === "signup"
                  ? "text-blue-900 border-b-4 border-blue-900"
                  : "text-gray-400"
              }`}
            >
              SignUp
            </button>
          </div>

          {/* Enhanced Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Enhanced Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-4 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {activeTab === "signup" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="User Name"
                value={signupData.username}
                onChange={(e) =>
                  setSignupData({ ...signupData, username: e.target.value })
                }
                className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none text-black focus:ring-2 focus:ring-blue-900"
              />
              <input
                type="email"
                placeholder="Email"
                value={signupData.email}
                onChange={(e) =>
                  setSignupData({ ...signupData, email: e.target.value })
                }
                className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none text-black focus:ring-2 focus:ring-blue-900"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData({ ...signupData, password: e.target.value })
                  }
                  className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none text-black focus:ring-2 focus:ring-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2"
                >
                  {EyeIcon}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={signupData.confirmPassword}
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none focus:ring-2 text-black focus:ring-blue-900"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-5 top-1/2 transform -translate-y-1/2"
                >
                  {EyeIcon}
                </button>
              </div>
              <div className="flex items-start space-x-2 py-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 lg:w-5 lg:h-5 rounded border-2 border-gray-300 mt-1"
                />
                <label className="text-gray-700 text-xs lg:text-sm">
                  I agree to the{" "}
                  <span className="text-blue-900 font-semibold">
                    Terms of use
                  </span>{" "}
                  and{" "}
                  <span className="text-blue-900 font-semibold">
                    Privacy Policy
                  </span>
                </label>
              </div>
              <button
                onClick={handleSignUp}
                disabled={anyAuthLoading}
                className="w-full bg-[#1F426E] text-white py-3 lg:py-4 rounded-[17px] text-lg lg:text-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingSignup ? Spinner : "SignUp"}
              </button>
              <p className="text-center text-gray-700 text-sm lg:text-base">
                Already got an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  Login
                </button>
              </p>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t-2 border-gray-300" />
                <span className="px-3 lg:px-4 text-gray-700 text-base lg:text-lg font-semibold">
                  OR
                </span>
                <div className="flex-1 border-t-2 border-gray-300" />
              </div>
              <p className="text-center text-gray-700 text-sm lg:text-base mb-3">
                Sign in with
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  className="hover:scale-110 transition-transform disabled:opacity-60"
                  type="button"
                  onClick={handleGoogleLogin}
                  aria-label="Sign in with Google"
                  disabled={anyAuthLoading}
                >
                  {GoogleIcon}
                </button>
                <button
                  className="hover:scale-110 transition-transform disabled:opacity-60"
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={anyAuthLoading}
                >
                  <svg
                    className="w-10 h-10 lg:w-12 lg:h-12"
                    viewBox="0 0 48 48"
                  >
                    <circle cx="24" cy="24" r="20" fill="#3B5998" />
                    <path
                      fill="#FFF"
                      d="M29.5 16.5h-3c-1.4 0-2.5 1.1-2.5 2.5v3h5.5l-1 5H24v12h-5V27h-3v-5h3v-3c0-4.1 3.4-7.5 7.5-7.5h3v5z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {activeTab === "login" && (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none text-black focus:ring-2 focus:ring-blue-900"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full px-5 py-3 lg:py-4 bg-gray-100 rounded-full text-sm lg:text-base placeholder-gray-400 focus:outline-none text-black focus:ring-2 focus:ring-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2"
                >
                  {EyeIcon}
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-blue-900 text-xs lg:text-sm hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button
                onClick={handleLogin}
                disabled={anyAuthLoading}
                className="w-full bg-[#1F426E] text-white py-3 lg:py-4 rounded-[17px] text-lg lg:text-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingLogin || loadingSocial ? Spinner : "Login"}
              </button>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t-2 border-gray-300" />
                <span className="px-3 lg:px-4 text-gray-700 text-base lg:text-lg font-semibold">
                  OR
                </span>
                <div className="flex-1 border-t-2 border-gray-300" />
              </div>
              <div className="flex justify-center space-x-4 mb-4">
                <button
                  className="hover:scale-110 transition-transform disabled:opacity-60"
                  type="button"
                  onClick={handleGoogleLogin}
                  aria-label="Sign in with Google"
                  disabled={anyAuthLoading}
                >
                  {GoogleIcon}
                </button>
                <button
                  className="hover:scale-110 transition-transform disabled:opacity-60"
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={anyAuthLoading}
                >
                  <svg
                    className="w-10 h-10 lg:w-12 lg:h-12"
                    viewBox="0 0 48 48"
                  >
                    <circle cx="24" cy="24" r="20" fill="#3B5998" />
                    <path
                      fill="#FFF"
                      d="M29.5 16.5h-3c-1.4 0-2.5 1.1-2.5 2.5v3h5.5l-1 5H24v12h-5V27h-3v-5h3v-3c0-4.1 3.4-7.5 7.5-7.5h3v5z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-center text-gray-700 text-sm lg:text-base">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-blue-900 font-semibold hover:underline"
                >
                  SignUp
                </button>
              </p>
              <div className="flex justify-center space-x-4 lg:space-x-6 pt-3">
                <button className="text-blue-900 text-xs lg:text-sm hover:underline">
                  Terms &amp; Conditions
                </button>
                <button className="text-blue-900 text-xs lg:text-sm hover:underline">
                  Support
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}