"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, RefreshCw, Video, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

// Type for snowflakes
type Flake = {
  update(): unknown;
  x: number;
  y: number;
  r: number;
  a: number;
  aStep: number;
  weight: number;
  alpha: number;
  speed: number;
};

// Type for fireworks
type Firework = {
  x: number;
  y: number;
  targetY: number;
  exploded: boolean;
  particles: Particle[];
  hue: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  hue: number;
};

// Fireworks Effect (Only January 1st)
const FireworksEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Show fireworks only on January 1st (month 0, date 1)
    if (currentMonth !== 0 || currentDate !== 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let windowW = window.innerWidth;
    let windowH = window.innerHeight;
    const fireworks: Firework[] = [];
    let animationId = 0;

    function randomBetween(min: number, max: number): number {
      return Math.random() * (max - min) + min;
    }

    function createFirework() {
      const firework: Firework = {
        x: randomBetween(windowW * 0.2, windowW * 0.8),
        y: windowH,
        targetY: randomBetween(windowH * 0.2, windowH * 0.5),
        exploded: false,
        particles: [],
        hue: randomBetween(0, 360),
      };
      fireworks.push(firework);
    }

    function createParticles(fw: Firework) {
      const particleCount = 100;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = randomBetween(2, 6);
        fw.particles.push({
          x: fw.x,
          y: fw.targetY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          alpha: 1,
          hue: fw.hue + randomBetween(-20, 20),
        });
      }
    }

    function scaleCanvas() {
      if (!canvas) return;
      canvas.width = windowW;
      canvas.height = windowH;
    }

    function loop() {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, windowW, windowH);

      // Random firework launch
      if (Math.random() < 0.03) {
        createFirework();
      }

      // Update and draw fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];

        if (!fw.exploded) {
          // Rising rocket
          fw.y -= 8;

          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${fw.hue}, 100%, 60%)`;
          ctx.fill();

          // Check if reached target
          if (fw.y <= fw.targetY) {
            fw.exploded = true;
            createParticles(fw);
          }
        } else {
          // Draw explosion particles
          for (let j = fw.particles.length - 1; j >= 0; j--) {
            const p = fw.particles[j];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.alpha -= 0.01;

            if (p.alpha <= 0) {
              fw.particles.splice(j, 1);
              continue;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.alpha})`;
            ctx.fill();
          }

          // Remove firework when all particles fade
          if (fw.particles.length === 0) {
            fireworks.splice(i, 1);
          }
        }
      }

      animationId = requestAnimationFrame(loop);
    }

    const handleResize = () => {
      windowW = window.innerWidth;
      windowH = window.innerHeight;
      scaleCanvas();
    };

    window.addEventListener("resize", handleResize);
    scaleCanvas();
    loop();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Show fireworks only on January 1st
  if (currentMonth !== 0 || currentDate !== 1) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

// Snow Effect
const SnowEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Show snow only in December (month 11, dates 1-31)
    if (currentMonth !== 11 || currentDate > 31) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let windowW = window.innerWidth;
    let windowH = window.innerHeight;
    const numFlakes = 200;
    const flakes: Flake[] = [];
    let animationId = 0;

    class FlakeClass implements Flake {
      x: number;
      y: number;
      r: number;
      a: number;
      aStep: number;
      weight: number;
      alpha: number;
      speed: number;

      constructor(x: number, y: number) {
        const maxWeight = 5;
        const maxSpeed = 3;

        this.x = x;
        this.y = y;
        this.r = randomBetween(0, 1);
        this.a = randomBetween(0, Math.PI);
        this.aStep = 0.01;
        this.weight = randomBetween(2, maxWeight);
        this.alpha = this.weight / maxWeight;
        this.speed = (this.weight / maxWeight) * maxSpeed;
      }

      update() {
        this.x += Math.cos(this.a) * this.r;
        this.a += this.aStep;
        this.y += this.speed;
      }
    }

    function randomBetween(min: number, max: number, round?: boolean): number {
      const num = Math.random() * (max - min + 1) + min;
      return round ? Math.floor(num) : num;
    }

    function scaleCanvas() {
      if (!canvas) return;
      canvas.width = windowW;
      canvas.height = windowH;
    }

    function init() {
      for (let i = 0; i < numFlakes; i++) {
        const x = randomBetween(0, windowW, true);
        const y = randomBetween(0, windowH, true);
        flakes.push(new FlakeClass(x, y));
      }
      scaleCanvas();
      loop();
    }

    function loop() {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, windowW, windowH);
      ctx.restore();

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];
        flake.update();

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.weight, 0, 2 * Math.PI, false);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
        ctx.fill();

        if (flake.y >= windowH) {
          flake.y = -flake.weight;
        }
      }

      animationId = requestAnimationFrame(loop);
    }

    const handleResize = () => {
      windowW = window.innerWidth;
      windowH = window.innerHeight;
      scaleCanvas();
    };

    window.addEventListener("resize", handleResize);
    init();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Show snow only in December (month 11, dates 1-31)
  if (currentMonth !== 11 || currentDate > 31) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

// Small reusable components

type HeaderProps = {
  darkMode: boolean;
  selectedTab: "signup" | "login";
  onToggleTheme: () => void;
  onSignUp: () => void;
  onLogin: () => void;
};

const Header: React.FC<HeaderProps> = ({
  darkMode,
  selectedTab,
  onToggleTheme,
  onSignUp,
  onLogin,
}) => {
  const headerBg = darkMode ? "bg-gray-800" : "bg-white";
  const toggleBtn = darkMode
    ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200";
  const authBase = darkMode
    ? "bg-gray-800 text-blue-400 border-blue-400"
    : "bg-white text-blue-500 border-blue-500";

  return (
    <header
      className={`flex flex-wrap items-center justify-between px-4 sm:px-8 py-3 sm:py-4 ${headerBg} transition-colors duration-300`}
    >
      {/* left: logo + smaller theme toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
          alt="SkillSwap Logo"
          className="w-30 h-10"
        />
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-md transition-all duration-200 ${toggleBtn}`}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* right: auth buttons */}
      <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-0 items-center">
        <button
          onClick={onSignUp}
          className={
            selectedTab === "signup"
              ? "px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
              : `px-4 sm:px-6 py-2 ${authBase} rounded-lg font-medium hover:bg-blue-50 border transition-all duration-200`
          }
        >
          Sign Up
        </button>

        <button
          onClick={onLogin}
          className={
            selectedTab === "login"
              ? "px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
              : `px-4 sm:px-6 py-2 ${authBase} rounded-lg font-medium hover:bg-blue-50 border transition-all duration-200`
          }
        >
          Log In
        </button>
      </div>
    </header>
  );
};

type StepCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  darkMode: boolean;
};

const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  darkMode,
}) => (
  <div className="text-center">
    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
      {icon}
    </div>
    <h3
      className={`text-lg sm:text-xl font-bold ${
        darkMode ? "text-white" : "text-gray-900"
      } mb-3 sm:mb-4`}
    >
      {title}
    </h3>
    <p
      className={`${
        darkMode ? "text-gray-400" : "text-gray-600"
      } text-sm sm:text-base`}
    >
      {description}
    </p>
  </div>
);

type SectionWrapperProps = {
  children: React.ReactNode;
  className?: string;
};

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  className = "",
}) => (
  <section className={`py-12 sm:py-20 px-4 sm:px-8 ${className}`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

// Main page component

export default function SkillSwapLanding() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<"signup" | "login">("signup");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("skillswap-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("skillswap-theme", next ? "dark" : "light");
      return next;
    });
  };

  const handleSignUp = () => {
    setSelectedTab("signup");
    // Use replace so user cannot go "back" to landing after navigating to auth
    router.replace("/auth/login-and-signup?tab=signup");
  };

  const handleLogin = () => {
    setSelectedTab("login");
    router.replace("/auth/login-and-signup?tab=login");
  };

  const pageBg = darkMode ? "bg-gray-900" : "bg-white";

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      <SnowEffect />
      <FireworksEffect />

      <Header
        darkMode={darkMode}
        selectedTab={selectedTab}
        onToggleTheme={toggleTheme}
        onSignUp={handleSignUp}
        onLogin={handleLogin}
      />

      {/* Hero */}
      <section className="relative w-full h-[70vh] overflow-hidden flex items-center justify-center bg-black">
        <video
          src="https://res.cloudinary.com/drw4jufk2/video/upload/Lpage_remtex.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-10"
        />
        <div className="absolute inset-0 w-full h-full bg-black/50 z-20" />
        <div className="relative z-30 max-w-4xl mx-auto text-center text-white px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Trade Skills, Master Code
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8">
            A peer-to-peer learning platform for developers.
            <br className="hidden sm:block" />
            Exchange your expertise, learn new technologies, and grow together.
          </p>
          <button
            onClick={handleSignUp}
            className="px-6 sm:px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
          >
            Start Swapping Skills
          </button>
        </div>
      </section>

      {/* How It Works */}
      <SectionWrapper className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
        <div className="text-center">
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            } mb-4`}
          >
            How It Works
          </h2>
          <p
            className={`${
              darkMode ? "text-gray-400" : "text-gray-600"
            } mb-8 sm:mb-16`}
          >
            A seamless path to collaborative learning.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <StepCard
            darkMode={darkMode}
            icon={<Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
            title="1. Build Your Profile"
            description="Record a short intro video showcasing your programming skill. Let others know what you can teach."
          />
          <StepCard
            darkMode={darkMode}
            icon={<RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
            title="2. Propose a Swap"
            description="Browse developer profiles, find a skill you want to learn, and propose an exchange of video lessons."
          />
          <StepCard
            darkMode={darkMode}
            icon={<Video className="w-6 h-6 sm:w-8 sm:h-8 text-white" />}
            title="3. Learn & Collaborate"
            description="Once accepted, unlock full video lessons and use the chat to deepen your understanding together."
          />
        </div>
      </SectionWrapper>

      {/* Learn from Your Peers */}
      <SectionWrapper className={darkMode ? "bg-gray-900" : "bg-blue-200"}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="bg-green-900 rounded-lg overflow-hidden aspect-video">
              <iframe
                src="https://player.cloudinary.com/embed/?cloud_name=drw4jufk2&public_id=video_1_ixg9cy&profile=cld-default&controls=playpause,fullscreen&showLogo=false&hideContextMenu=true"
                title="Cloudinary Video"
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
            <div
              className={`absolute -bottom-4 sm:-bottom-6 right-4 sm:right-6 ${
                darkMode ? "bg-gray-800" : "bg-white"
              } rounded-lg shadow-lg p-3 sm:p-4 flex items-center gap-3`}
            >
              <div className="w-8 h-8 sm:w-10 bg-gray-300 rounded-full" />
              <div>
                <p
                  className={`font-bold text-xs sm:text-sm ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Sophia Clark
                </p>
                <p
                  className={`text-xs ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Learned: Python Backend
                </p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2
              className={`text-2xl sm:text-3xl md:text-4xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              } mb-4 sm:mb-6`}
            >
              Learn from Your Peers
            </h2>
            <p
              className={`${
                darkMode ? "text-gray-300" : "text-gray-700"
              } mb-4 text-sm sm:text-base`}
            >
              &quot;SkillSwap transformed my career. I learned Python in just a
              few weeks from an expert and landed a new job! The one-on-one
              interaction is something you can&apos;t get anywhere else.&quot;
            </p>
            <p
              className={`text-xs sm:text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <strong>Sophia Clark</strong>, Software Engineer
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper className={darkMode ? "bg-gray-800" : "bg-white"}>
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            } mb-4`}
          >
            Ready to Elevate Your Dev Skills?
          </h2>
          <p
            className={`${
              darkMode ? "text-gray-400" : "text-gray-600"
            } mb-6 sm:mb-8 text-sm sm:text-base`}
          >
            Join a vibrant community of developers and IT professionals
            dedicated to mutual growth.
          </p>
          <button
            onClick={handleSignUp}
            className="px-6 sm:px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
          >
            Sign Up Now &amp; Start Learning
          </button>
        </div>
      </SectionWrapper>

      {/* Footer */}
      <footer
        className={`${
          darkMode ? "bg-black text-gray-400" : "bg-gray-900 text-gray-400"
        } py-8 sm:py-12 px-4 sm:px-8 transition-colors duration-300`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-8 sm:gap-0">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png"
                  alt="SkillSwap Logo"
                  className="w-30 h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-16 w-full sm:w-auto">
              <div>
                <h3 className="text-white font-bold mb-4">Platform</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      How It Works
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      Login
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/about"
                      className="hover:text-white transition-colors"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      Contact
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      Careers
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div
            className={`border-t ${
              darkMode ? "border-gray-900" : "border-gray-800"
            } pt-6 sm:pt-8 text-sm text-center`}
          >
            © 2025 SkillSwap. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}