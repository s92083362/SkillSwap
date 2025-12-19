"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/firebaseConfig";

export interface Skill {
  id?: string;
  title: string;
  description: string;
  category?: string;
  skillCategory?: string;
  image?: string;
  instructor?: string;
  instructorAvatar?: string;
  createdBy?: string;
  creatorId?: string;
  creatorAvatar?: string;
}

interface SkillCardProps {
  skill: Skill;
  onView?: (skill: Skill) => void;
}

type UserDoc = {
  displayName?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  photoUrl?: string;
  avatar?: string;
  profilePicture?: string;
  email?: string;
};

const getAvatarUrl = (userData?: UserDoc | null): string | null => {
  if (!userData) return null;
  return (
    userData.photoURL ||
    userData.photoUrl ||
    userData.avatar ||
    userData.profilePicture ||
    null
  );
};

const getDisplayName = (userData?: UserDoc | null): string => {
  if (!userData) return "Unknown User";
  return (
    userData.displayName ||
    userData.name ||
    userData.username ||
    "Unknown User"
  );
};

const SkillCard: React.FC<SkillCardProps> = ({ skill, onView }) => {
  const router = useRouter();
  const [creatorAvatar, setCreatorAvatar] = useState<string | null>(
    skill.creatorAvatar || null
  );
  const [creatorName, setCreatorName] = useState<string>(
    skill.createdBy || "Unknown User"
  );
  const [loadingCreator, setLoadingCreator] = useState(false);

  useEffect(() => {
    if (skill.creatorId && (!skill.creatorAvatar || !skill.createdBy)) {
      fetchCreatorProfile(skill.creatorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.creatorId]);

  const fetchCreatorProfile = async (creatorId: string) => {
    setLoadingCreator(true);
    try {
      const userRef = doc(db, "users", creatorId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserDoc;
        const avatarUrl = getAvatarUrl(userData);
        const displayName = getDisplayName(userData);

        setCreatorAvatar(avatarUrl);
        setCreatorName(displayName);
      }
    } catch (error) {
      console.error("Error fetching creator profile:", error);
    } finally {
      setLoadingCreator(false);
    }
  };

  const handleViewClick = () => {
    if (onView) {
      onView(skill);
    } else if (skill.id) {
      router.push(`/skills/${skill.id}`);
    }
  };

  const category = skill.skillCategory || skill.category || "General";

  return (
    <div
      className="
        relative flex flex-col h-full
        w-full                      
        rounded-2xl overflow-hidden
        bg-white shadow-md border border-gray-100
      "
    >
      {/* Top image / header area */}
      <div className="w-full h-32 sm:h-36 md:h-40 bg-gray-100">
        {skill.image ? (
          <img
            src={skill.image}
            alt={skill.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[11px] uppercase tracking-[0.25em] text-gray-400">
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 py-3 bg-white">
        <h3 className="text-base sm:text-lg font-semibold mb-2 leading-snug text-gray-900">
          {skill.title}
        </h3>

        {(skill.createdBy || skill.creatorId) && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {loadingCreator ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `<span class="text-white text-xs font-semibold">${creatorName
                        .charAt(0)
                        .toUpperCase()}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {creatorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <p className="text-[12px] text-gray-700 truncate">
              {creatorName}
            </p>
          </div>
        )}

        <p className="text-[12px] sm:text-[13px] text-gray-600 mb-4 line-clamp-2">
          {skill.description}
        </p>

        <button
          className="
            mt-auto w-full
            bg-[#1f7aff] hover:bg-[#1863d1]
            text-white font-semibold
            py-2 rounded-full
            text-[13px] tracking-wide
            shadow-sm transition
          "
          onClick={handleViewClick}
        >
          View Skill
        </button>
      </div>
    </div>
  );
};

export default SkillCard;
