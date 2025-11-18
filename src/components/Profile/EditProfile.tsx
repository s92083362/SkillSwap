"use client";
import React, { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../lib/firebase/firebaseConfig";

export default function EditProfile() {
  const [user] = useAuthState(auth);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("Available for new swaps");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // imgbb API - Get free API key from https://api.imgbb.com/
  
  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  // Sync local photoUrl with user's current Auth photoURL (on login, refresh, or logout)
  useEffect(() => {
    if (user?.photoURL) {
      setPhotoUrl(user.photoURL);
    } else {
      setPhotoUrl(null);
    }
    if (user?.displayName) {
      setName(user.displayName);
    }
  }, [user]);

  // Photo upload handler
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: "POST",
          body: formData
        }
      );
      const data = await response.json();
      if (data.success) {
        setPhotoUrl(data.data.url);
        // Update Auth so reloads/logouts always show latest photo
        if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: data.data.url });
        // (Optional) update Firestore for user lists, etc
        if (user) await setDoc(doc(db, "users", user.uid), { photoUrl: data.data.url }, { merge: true });
      } else {
        alert("Failed to upload photo.");
      }
    } catch {
      alert("Failed to upload photo.");
    }
    setUploading(false);
  };

  // Remove photo: update both Auth and Firestore
  const handleRemovePhoto = async () => {
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: "" });
    if (user) await setDoc(doc(db, "users", user.uid), { photoUrl: "" }, { merge: true });
  };

  // Save profile: update displayName in Auth, save username/bio/etc in Firestore
  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl || undefined
      });
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        username,
        bio,
        skills,
        availability,
        photoUrl: photoUrl || undefined
      }, { merge: true });
      alert("Profile updated!");
    } catch (e) {
      alert("Failed to update profile.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-2 py-4 sm:px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 px-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Edit Profile</h1>
          <p className="text-gray-600 text-sm sm:text-base">Update your profile information and preferences.</p>
        </div>
        <div className="bg-white rounded-md md:rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 md:p-8">
          {/* Profile Photo */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-4">Profile Photo</label>
            <div className="flex items-center gap-4 flex-col sm:flex-row">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-end justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="45" r="18" fill="#8B7355"/>
                      <path d="M 30 100 Q 30 65 50 65 Q 70 65 70 100" fill="#D4A574"/>
                      <circle cx="50" cy="35" r="15" fill="#F4D4A8"/>
                      <path d="M 35 30 Q 35 20 50 22 Q 65 20 65 30" fill="#3B3B3B"/>
                      <circle cx="45" cy="35" r="2" fill="#2C2C2C"/>
                      <circle cx="55" cy="35" r="2" fill="#2C2C2C"/>
                      <path d="M 46 42 Q 50 44 54 42" stroke="#D4A574" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Change"}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name and Username */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Skills */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Skills</label>
            <div className="relative">
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mt-2">Separate skills with commas.</p>
          </div>

          {/* Intro Video - Not Implemented */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Intro Video</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-12 text-center">
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="text-blue-600 font-medium cursor-pointer hover:text-blue-700">Upload a file</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">MP4, MOV, AVI up to 50MB</p>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Availability</label>
            <div className="relative">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option>Available for new swaps</option>
                <option>Not available</option>
                <option>Available soon</option>
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
