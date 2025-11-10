"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const sampleNotifications = [
  {
    id: 1,
    message: "You have a skill swap request from Alice.",
    actions: ["Approve", "Reject"]
  },
  {
    id: 2,
    message: "Bob approved your teach request.",
    actions: []
  }
];

const Header: React.FC<HeaderProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <img 
              src="https://i.ibb.co/FkBjK1WD/logo-removebg-preview.png" 
              alt="Company Logo" 
              className="w-20 h-10 sm:w-25 sm:h-10"
            />
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">My Skills</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Learn</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Teach</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-label="Show notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-xl p-4 border z-50">
                  <h3 className="font-bold mb-2">Notifications</h3>
                  <ul className="space-y-3">
                    {sampleNotifications.length === 0 && (
                      <li className="text-gray-500">No notifications</li>
                    )}
                    {sampleNotifications.map((notif) => (
                      <li key={notif.id} className="bg-gray-50 rounded p-3 text-gray-700">
                        <div>{notif.message}</div>
                        <div className="mt-2 flex gap-2">
                          {notif.actions.map(action => (
                            <button
                              key={action}
                              className={`px-2 py-1 rounded text-xs font-semibold border ${action === 'Approve' ? 'text-green-800 border-green-200 bg-green-50' : 'text-red-700 border-red-200 bg-red-50'}`}
                              onClick={() => alert(action + " clicked!")}
                            >{action}</button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full mt-4 text-blue-600 underline"
                    onClick={() => setNotificationsOpen(false)}
                  >Close</button>
                </div>
              )}
            </div>
            {/* Profile Button: routes to /profile */}
            <button
              onClick={() => router.push("/profile")}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 cursor-pointer hover:ring-2 hover:ring-orange-400 transition flex items-center justify-center"
              aria-label="Go to Profile"
              title="Profile"
              type="button"
            />
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden flex flex-col gap-4 mt-4 pb-4 border-t border-gray-200 pt-4">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">My Skills</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Learn</a>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Teach</a>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
