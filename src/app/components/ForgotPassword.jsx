"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleResetRequest = () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    console.log('Password reset requested for:', email);
  };

  const handleBackToLogin = () => {
    router.push('/');
  };

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
            Forgot your password
          </h1>
          
          <p className="text-gray-600 text-base lg:text-lg mb-8">
            Please enter the email address you'd like your password reset information sent to
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

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

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