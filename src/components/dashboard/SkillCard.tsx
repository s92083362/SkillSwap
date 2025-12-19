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
    // Fetch creator profile if creatorId exists but no avatar/name provided
    if (skill.creatorId && (!skill.creatorAvatar || !skill.createdBy)) {
      fetchCreatorProfile(skill.creatorId);
    }
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
        bg-white 
        rounded-lg 
        shadow 
        transition-shadow 
        flex flex-col 
        h-full 
        border border-gray-100 
        w-[240px] min-w-[180px] max-w-[260px] 
      "
    >
      {/* Thumbnail or Category Header */}
      {skill.image ? (
        <div className="w-full h-[68px] rounded-t-lg overflow-hidden">
          <img
            src={skill.image}
            alt={skill.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white rounded-t-lg">
          <span className="text-xs text-blue-500 font-semibold tracking-wide">
            {category}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-3">
        <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
          {skill.title}
        </h3>

        {/* Lesson Creator */}
        {(skill.createdBy || skill.creatorId) && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden flex items-center justify-center flex-shrink-0">
              {loadingCreator ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `<span class="text-white text-xs font-semibold">${creatorName.charAt(0).toUpperCase()}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {creatorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">{creatorName}</p>
          </div>
        )}

        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {skill.description}
        </p>
        <button
          className="
            mt-auto w-full 
            bg-blue-500 hover:bg-blue-600 
            text-white font-semibold 
            py-2 rounded-lg 
            transition-colors 
            text-xs
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