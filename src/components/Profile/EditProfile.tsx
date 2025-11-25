"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Upload } from "lucide-react";

export default function ProfilePage() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("Available for new swaps");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setProfile(d);
        setName(user.displayName || d.name || "");
        setPhotoUrl(user.photoURL || d.photoUrl || null);
        setUsername(d.username || "");
        setBio(d.bio || "");
        setSkills(d.skills || "");
        setAvailability(d.availability || "Available for new swaps");
      } else {
        setProfile(null);
        setName(user.displayName || "");
        setPhotoUrl(user.photoURL || null);
        setUsername("");
        setBio("");
        setSkills("");
        setAvailability("Available for new swaps");
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user, editMode]);

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
        if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: data.data.url });
        if (user) await setDoc(doc(db, "users", user.uid), { photoUrl: data.data.url }, { merge: true });
      } else {
        alert("Failed to upload photo.");
      }
    } catch {
      alert("Failed to upload photo.");
    }
    setUploading(false);
  };

  const handleRemovePhoto = async () => {
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: "" });
    if (user) await setDoc(doc(db, "users", user.uid), { photoUrl: "" }, { merge: true });
  };

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
      setEditMode(false);
    } catch (e) {
      alert("Failed to update profile.");
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (profile) {
      setName(user.displayName || profile.name || "");
      setPhotoUrl(user.photoURL || profile.photoUrl || null);
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setSkills(profile.skills || "");
      setAvailability(profile.availability || "Available for new swaps");
    }
  };

  if (!user) return <div className="text-center py-16">Please log in</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 py-8">
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-10">
          {!editMode ? (
            <div>
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
              ) : (
                <>
                  <div className="flex gap-6 items-center mb-7">
                    <img
                      src={user.photoURL || profile?.photoUrl || "https://ui-avatars.com/api/?background=F8D5CB&color=555"}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border shadow"
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{name || "No Name"}</h2>
                      <div className="text-gray-500 text-base mb-1">{profile?.username || "No username"}</div>
                      <div className="text-blue-500 text-xs mb-1">{profile?.availability}</div>
                      <div className="text-gray-700 text-base">{profile?.bio || "No bio yet."}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="font-semibold text-gray-700 mb-2">Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {(profile?.skills || "")
                        .split(',')
                        .map((skill) =>
                          <span key={skill} className="px-3 py-1 bg-blue-50 rounded text-sm text-blue-700">{skill.trim()}</span>
                        )}
                    </div>
                  </div>
                  <button
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveProfile();
              }}
            >
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
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Skills</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <p className="text-sm text-gray-500 mt-2">Separate skills with commas.</p>
              </div>
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option>Available for new swaps</option>
                  <option>Not available</option>
                  <option>Available soon</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
