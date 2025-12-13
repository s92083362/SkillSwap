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

export default function LoginAndSignup() {
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

  // Initialize tab from URL (?tab=login or ?tab=signup)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login" || tab === "signup") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Google Login - UPDATED to save user data with createdAt
  const handleGoogleLogin = async () => {
    setError("");
    try {
      const user = await googleLogin(); // Returns User object

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

      setSuccess("You are logged in successfully");
      setTimeout(() => {
        setSuccess("");
        router.push("/dash-board");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Facebook Login - UPDATED to save user data with createdAt
  const handleFacebookLogin = async () => {
    setError("");
    try {
      const user = await facebookLogin(); // Returns User object

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

      setSuccess("You are logged in successfully");
      setTimeout(() => {
        setSuccess("");
        router.push("/dash-board");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Sign Up - UPDATED to save user data with createdAt
  const handleSignUp = async () => {
    if (
      !signupData.username ||
      !signupData.email ||
      !signupData.password ||
      !signupData.confirmPassword
    ) {
      setError("Please fill all the fields");
      return;
    }
    if (!agreed) {
      setError("Please agree to the terms and conditions");
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
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

      setSuccess("You are registered successfully");
      setTimeout(() => {
        setSuccess("");
        setActiveTab("login");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Login - UPDATED to update lastLogin timestamp
  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setError("Please fill all the fields");
      return;
    }
    setError("");
    try {
      const user = await login(loginData.email, loginData.password);

      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccess("You are logged in successfully");
      setTimeout(() => {
        setSuccess("");
        router.push("/dash-board");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Forgot Password
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
        <div className="w-full lg:w-1/2 p-6 lg:p-10">
          {/* Tabs */}
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

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-2 text-center font-semibold">
              {success}
            </div>
          )}
          {error && (
            <p className="text-red-500 text-sm mb-2">
              {error}
            </p>
          )}

          {/* SignUp Form */}
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
                className="w-full bg-[#1F426E] text-white py-3 lg:py-4 rounded-[17px] text-lg lg:text-xl font-semibold hover:bg-blue-800 transition-colors"
              >
                SignUp
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
                  className="hover:scale-110 transition-transform"
                  type="button"
                  onClick={handleGoogleLogin}
                >
                  {/* Google SVG unchanged */}
                  <svg
                    className="w-10 h-10 lg:w-12 lg:h-12"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l-.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                </button>
                <button
                  className="hover:scale-110 transition-transform"
                  type="button"
                  onClick={handleFacebookLogin}
                >
                  {/* Facebook SVG unchanged */}
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

          {/* Login Form */}
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
                className="w-full bg-[#1F426E] text-white py-3 lg:py-4 rounded-[17px] text-lg lg:text-xl font-semibold hover:bg-blue-800 transition-colors"
              >
                Login
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
                  className="hover:scale-110 transition-transform"
                  type="button"
                  onClick={handleGoogleLogin}
                >
                  {/* Google SVG unchanged */}
                  <svg
                    className="w-10 h-10 lg:w-12 lg:h-12"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l-.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                </button>
                <button
                  className="hover:scale-110 transition-transform"
                  type="button"
                  onClick={handleFacebookLogin}
                >
                  {/* Facebook SVG unchanged */}
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
