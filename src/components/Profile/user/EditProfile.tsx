"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";

type UserProfile = {
  name?: string | null;
  username?: string | null;
  bio?: string | null;
  skills?: string | null;
  skillsToLearn?: string | null;
  availability?: string | null;
  photoUrl?: string | null;
};

export default function ProfilePage() {
  // react-firebase-hooks auth state
  const [user, authLoading] = useAuthState(auth as any);
  const router = useRouter();

  // Firestore profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [skillsToLearn, setSkillsToLearn] = useState("");
  const [availability, setAvailability] = useState("Available for new swaps");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY as
    | string
    | undefined;

  // DEBUG: log auth + profile states
  useEffect(() => {
    console.log("auth user:", user?.uid, "displayName:", user?.displayName);
    console.log("profile state:", profile);
  }, [user, profile]);

  const getSkillLogo = (skill: string) => {
    const skillLower = skill.toLowerCase().trim();
    const logos: { [key: string]: string } = {
      java: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
      python:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
      javascript:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
      js: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
      typescript:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
      ts: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
      react:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
      "react js":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
      reactjs:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
      node: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
      nodejs:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
      "node.js":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
      angular:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg",
      vue: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg",
      "vue.js":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg",
      html: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
      html5:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
      css: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
      css3:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
      php: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
      "c++":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
      cpp: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
      "c#": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
      csharp:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
      c: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg",
      go: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
      golang:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
      rust: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg",
      ruby: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg",
      swift:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg",
      kotlin:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
      dart: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dart/dart-original.svg",
      flutter:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg",
      spring:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg",
      "spring boot":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg",
      django:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg",
      flask:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg",
      express:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg",
      "express.js":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg",
      mongodb:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
      mysql:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
      postgresql:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
      postgres:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
      redis:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg",
      docker:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
      kubernetes:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg",
      aws: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
      git: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
      github:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
      gitlab:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg",
      linux:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg",
      ubuntu:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-plain.svg",
      tailwind:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg",
      tailwindcss:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg",
      bootstrap:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg",
      sass: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg",
      firebase:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg",
      graphql:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/graphql/graphql-plain.svg",
      nextjs:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg",
      "next.js":
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg",
      svelte:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg",
      figma:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
      photoshop:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg",
      illustrator:
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg",
      xd: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/xd/xd-plain.svg",
      sql: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
    };
    return logos[skillLower] || null;
  };

  // Load Firestore profile when auth user is ready
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    async function fetchProfile(currentUser: User) {
      setProfileLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const d = snap.data() as UserProfile;
          setProfile(d);
          setName(currentUser.displayName || d.name || "");
          setPhotoUrl(currentUser.photoURL || d.photoUrl || null);
          setUsername(d.username || "");
          setBio(d.bio || "");
          setSkills(d.skills || "");
          setSkillsToLearn(d.skillsToLearn || "");
          setAvailability(d.availability || "Available for new swaps");
        } else {
          setProfile(null);
          setName(currentUser.displayName || "");
          setPhotoUrl(currentUser.photoURL || null);
          setUsername("");
          setBio("");
          setSkills("");
          setSkillsToLearn("");
          setAvailability("Available for new swaps");
        }
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile(user);
  }, [user, editMode]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !IMGBB_API_KEY) return;
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
    } catch {
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
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl || undefined,
      });
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          username,
          bio,
          skills,
          skillsToLearn,
          availability,
          photoUrl: photoUrl || undefined,
        },
        { merge: true }
      );
      window.alert("Profile updated!");
      setEditMode(false);
    } catch {
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
      setSkills(profile.skills || "");
      setSkillsToLearn(profile.skillsToLearn || "");
      setAvailability(profile.availability || "Available for new swaps");
    }
  };
   useEffect(() => {
            const prevTitle = document.title;
            document.title = "SkillSwap | Edit Profile";
        
            return () => {
              document.title = prevTitle;
            };
          }, []);
  

  // Global loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen  flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, ask to log in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 flex items-center justify-center p-4">
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
            Please log in to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-5xl mx-auto">
        {!editMode ? (
          <>
            {/* Header Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <img
                    src={
                      user.photoURL ||
                      profile?.photoUrl ||
                      "https://ui-avatars.com/api/?background=4F46E5&color=fff&bold=true&size=120"
                    }
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover ring-4 ring-gray-100"
                  />
                  <div className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-lg">@</span>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {name || "No Name"}
                    </h1>
                    <svg
                      className="w-6 h-6 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {profile?.username &&
                    profile.username.trim().length > 0
                      ? profile.username
                      : "No username"}
                  </p>

                  <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>
                        {profile?.availability || "Available for new swaps"}
                      </span>
                    </div>
                  </div>
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

            {/* About Me Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">About Me</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {profile?.bio || "No bio yet. Tell us about yourself!"}
              </p>
            </div>

            {/* Skills Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Skills I Teach
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(profile?.skills || "")
                    .split(",")
                    .filter((skill) => skill.trim().length > 0)
                    .map((skill, idx) => {
                      const logo = getSkillLogo(skill);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={skill.trim()}
                              className="w-5 h-5 object-contain"
                            />
                          ) : (
                            <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                          )}
                          <span className="text-sm font-medium text-gray-800">
                            {skill.trim()}
                          </span>
                        </div>
                      );
                    })}
                  {!(profile?.skills || "").trim() && (
                    <p className="text-gray-500 italic">No skills added yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
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
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Skills I Want to Learn
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(profile?.skillsToLearn || "")
                    .split(",")
                    .filter((skill) => skill.trim().length > 0)
                    .map((skill, idx) => {
                      const logo = getSkillLogo(skill);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200 hover:border-purple-300 hover:bg-purple-100 transition-all"
                        >
                          {logo ? (
                            <img
                              src={logo}
                              alt={skill.trim()}
                              className="w-5 h-5 object-contain"
                            />
                          ) : (
                            <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                          )}
                          <span className="text-sm font-medium text-purple-800">
                            {skill.trim()}
                          </span>
                        </div>
                      );
                    })}
                  {!(profile?.skillsToLearn || "").trim() && (
                    <p className="text-gray-500 italic">
                      No skills to learn added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Your Profile
              </h2>
              <p className="text-gray-600">
                Update your information and preferences
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
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Skills I Teach (comma separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full px-5 py-4 text-base border-2 border-blue-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Java, Spring Boot, React"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Skills I Want to Learn (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsToLearn}
                  onChange={(e) => setSkillsToLearn(e.target.value)}
                  className="w-full px-5 py-4 text-base border-2 border-purple-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="e.g. Python, Machine Learning, AWS"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Availability Status
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all cursor-pointer"
                >
                  <option>Available for new swaps</option>
                  <option>Not available</option>
                  <option>Available soon</option>
                </select>
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
