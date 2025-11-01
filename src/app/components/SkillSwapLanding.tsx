"use client"
import React, { useState } from 'react';
import { Users, RefreshCw, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SkillSwapLanding() {
  const router = useRouter();
  // State to track which button is selected
  const [selectedTab, setSelectedTab] = useState('signup');

  // Handler functions
  const handleSignUp = () => {
    setSelectedTab('signup');
    router.push('/auth/login-and-signup');
  };

  const handleLogin = () => {
    setSelectedTab('login');
    router.push('/auth/login-and-signup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-4 sm:px-8 py-3 sm:py-4 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo as image */}
          <img 
            src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png" 
            alt="SkillSwap Logo" 
            className="w-30 h-10 " 
            style={{ background: 'transparent' }}
          />
        </div>
        {/* Tab buttons with selection logic */}
        <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-0">
          {/* Sign Up button */}
          <button
            onClick={handleSignUp}
            className={
              selectedTab === 'signup'
                ? 'px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200'
                : 'px-4 sm:px-6 py-2 bg-white text-blue-500 rounded-lg font-medium hover:bg-blue-50 border border-blue-500 transition-all duration-200'
            }
          >
            Sign Up
          </button>
          {/* Log In button */}
          <button
            onClick={handleLogin}
            className={
              selectedTab === 'login'
                ? 'px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200'
                : 'px-4 sm:px-6 py-2 bg-white text-blue-500 rounded-lg font-medium hover:bg-blue-50 border border-blue-500 transition-all duration-200'
            }
          >
            Log In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-black text-white py-16 sm:py-32 px-4 sm:px-8">
        <div className="absolute inset-0 opacity-50">
          <img src="https://i.ibb.co/kVsPLPWS/20251027-2110-image.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-2xl sm:max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">Trade Skills, Master Code</h1>
          <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
            A peer-to-peer learning platform for developers. Exchange your expertise, learn<br className="hidden sm:block" />
            new technologies, and grow together.
          </p>
          <button 
            onClick={() => router.push('/auth/loginandsignup')}
            className="px-6 sm:px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
          >
            Start Swapping Skills
          </button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-4xl sm:max-w-6xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-gray-600 mb-8 sm:mb-16">A seamless path to collaborative learning.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">1. Build Your Profile</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Record a short intro video showcasing your programming skill. Let others know what you can teach.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">2. Propose a Swap</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Browse developer profiles, find a skill you want to learn, and propose an exchange of video lessons.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Video className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">3. Learn & Collaborate</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Once accepted, unlock full video lessons and use the chat to deepen your understanding together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learn from Your Peers Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-8 bg-blue-200">
        <div className="max-w-3xl sm:max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="bg-green-900 rounded-lg p-6 sm:p-8 aspect-video">
              <img src="https://i.ibb.co/jZWrSynf/Container-Picsart-Ai-Image-Enhancer.png" alt="" className="w-full h-full object-cover rounded" />
            </div>
            <div className="absolute -bottom-4 sm:-bottom-6 right-4 sm:right-6 bg-white rounded-lg shadow-lg p-3 sm:p-4 flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full"></div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-gray-900">Sophia Clark</p>
                <p className="text-xs text-gray-600">Learned: Python Backend</p>
              </div>
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">Learn from Your Peers</h2>
            <p className="text-gray-700 mb-4 text-sm sm:text-base">
              "SkillSwap transformed my career. I learned Python in just a few weeks from an expert and landed a new job! The one-on-one interaction is something you can't get anywhere else."
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              <strong>Sophia Clark</strong>, Software Engineer
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-8 bg-white">
        <div className="max-w-xl sm:max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ready to Elevate Your Dev Skills?</h2>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
            Join a vibrant community of developers and IT professionals dedicated to mutual growth.
          </p>
          <button 
            onClick={() => router.push('/auth/loginandsignup')}
            className="px-6 sm:px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200"
          >
            Sign Up Now & Start Learning
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-3xl sm:max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:mb-8 gap-8 sm:gap-0">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center gap-2 mb-4">
                {/* Logo as image */}
                <img 
                  src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png" 
                  alt="SkillSwap Logo" 
                  className="w-30 h-10 " 
                />
            
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-16 w-full sm:w-auto">
              <div>
                <h3 className="text-white font-bold mb-4">Platform</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Login</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-bold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-bold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-sm text-center">
            © 2025 SkillSwap. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
