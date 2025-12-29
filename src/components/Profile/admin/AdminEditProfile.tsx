"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

type AdminProfile = {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  department?: string | null;
  role?: string | null;
  permissions?: string | null;
  photoUrl?: string | null;
};

export default function AdminEditProfile() {
  const [user] = useAuthState(auth as any);
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [roleTitle, setRoleTitle] = useState("System Administrator");
  const [permissions, setPermissions] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY as
    | string
    | undefined;

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data() as AdminProfile;
          setProfile(d);
          setName(user.displayName || d.name || "");
          setPhotoUrl(user.photoURL || d.photoUrl || null);
          setUsername(d.username || "");
          setBio(d.bio || "");
          setDepartment(d.department || "");
          setRoleTitle(d.role || "System Administrator");
          setPermissions(d.permissions || "");
        } else {
          setProfile(null);
          setName(user.displayName || "");
          setPhotoUrl(user.photoURL || null);
          setUsername("");
          setBio("");
          setDepartment("");
          setRoleTitle("System Administrator");
          setPermissions("");
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      }
      setLoading(false);
    }

    if (user) {
      fetchProfile();
    }
  }, [user, editMode]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !IMGBB_API_KEY) {
      window.alert("Image upload service not configured");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      if (data && data.success && data.data?.url) {
        const url: string = data.data.url;
        setPhotoUrl(url);
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: url });
          await setDoc(
            doc(db, "users", auth.currentUser.uid),
            { photoUrl: url },
            { merge: true }
          );
        }
      } else {
        window.alert("Failed to upload photo.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      window.alert("Failed to upload photo.");
    }
    setUploading(false);
  };

  const handleRemovePhoto = async () => {
    setPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: "" });
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { photoUrl: "" },
        { merge: true }
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      // Update Firebase Auth profile
      const authUpdateData: { displayName: string; photoURL?: string } = {
        displayName: name,
      };
      if (photoUrl) {
        authUpdateData.photoURL = photoUrl;
      }
      await updateProfile(auth.currentUser, authUpdateData);

      // Prepare Firestore data, excluding undefined values
      const firestoreData: any = {
        name,
        isAdmin: true,
      };

      // Only add fields if they have values
      if (username) firestoreData.username = username;
      if (bio) firestoreData.bio = bio;
      if (department) firestoreData.department = department;
      if (roleTitle) firestoreData.role = roleTitle;
      if (permissions) firestoreData.permissions = permissions;
      if (photoUrl) firestoreData.photoUrl = photoUrl;

      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        firestoreData,
        { merge: true }
      );
      window.alert("Admin profile updated successfully!");
      setEditMode(false);
    } catch (error) {
      console.error("Save error:", error);
      window.alert("Failed to update profile.");
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (profile && user) {
      setName(user.displayName || profile.name || "");
      setPhotoUrl(user.photoURL || profile.photoUrl || null);
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setDepartment(profile.department || "");
      setRoleTitle(profile.role || "System Administrator");
      setPermissions(profile.permissions || "");
    }
  };
  useEffect(() => {
              const prevTitle = document.title;
              document.title = "SkillSwap | Edit Profile";
          
              return () => {
                document.title = prevTitle;
              };
            }, []);
    

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <p className="text-lg text-gray-700">
            Please log in to view your admin profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {!editMode ? (
          <>
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-700">Loading admin profile...</p>
              </div>
            ) : (
              <>
                {/* Header Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative">
                      <img
                        src={
                          photoUrl ||
                          user.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            name || "Admin"
                          )}&background=4F46E5&color=fff&bold=true&size=120`
                        }
                        alt="Admin Profile"
                        className="w-32 h-32 rounded-full object-cover ring-4 ring-blue-100"
                      />
                      <div className="absolute bottom-1 right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">
                          {name || "Admin User"}
                        </h1>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          ADMIN
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">
                        @{username || "admin"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {roleTitle || "System Administrator"}
                      </p>
                      {department && (
                        <p className="text-sm text-gray-500 mt-1">
                          Department: {department}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* About Section */}
                <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      About
                    </h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {bio || "No bio added yet."}
                  </p>
                </div>

                {/* Permissions Section */}
                {permissions && (
                  <div className="bg-white rounded-3xl shadow-xl p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Permissions
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {permissions
                        .split(",")
                        .filter((p) => p.trim())
                        .map((permission, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium border border-purple-200"
                          >
                            {permission.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Admin Profile
              </h2>
              <p className="text-gray-600">
                Update your administrative information
              </p>
            </div>

            <div className="space-y-8">
              {/* Photo Section */}
              <div className="pb-8 border-b border-gray-200">
                <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                  Profile Photo
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ring-4 ring-gray-100">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Profile"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
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
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Upload New Photo"}
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        className="px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        onClick={handleRemovePhoto}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., System Administrator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., IT, Operations"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Permissions (comma separated)
                </label>
                <input
                  type="text"
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g., User Management, System Config, Reports"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg"
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}