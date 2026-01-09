"use client";

import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from "firebase/firestore";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface SwapRequest {
  id: string;
  requestedLessonTitle: string;
  offeredSkillTitle: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  message?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export default function AcceptedSwapRequests() {
  const [user] = useAuthState(auth as any);
  const [acceptedRequests, setAcceptedRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesterAvatars, setRequesterAvatars] = useState<
    Record<string, string | null>
  >({});
  const router = useRouter();

  // fetch accepted swaps
  useEffect(() => {
    if (!user) return;

    async function fetchAcceptedSwaps(currentUser: NonNullable<typeof user>) {
      try {
        const q = query(
          collection(db, "swapRequests"),
          where("creatorId", "==", currentUser.uid),
          where("status", "==", "accepted")
        );

        const snapshot = await getDocs(q);
        const swaps: SwapRequest[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as DocumentData;

          const createdAt =
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate()
              : undefined;
          const updatedAt =
            data.updatedAt && typeof data.updatedAt.toDate === "function"
              ? data.updatedAt.toDate()
              : undefined;

          return {
            id: docSnap.id,
            requestedLessonTitle: data.requestedLessonTitle ?? "",
            offeredSkillTitle: data.offeredSkillTitle ?? "",
            requesterId: data.requesterId ?? "",
            requesterName: data.requesterName ?? "",
            requesterEmail: data.requesterEmail ?? "",
            message: data.message,
            createdAt,
            updatedAt,
          };
        });

        swaps.sort((a, b) => {
          const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
          const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
          return bTime - aTime;
        });

        setAcceptedRequests(swaps);
      } catch (error) {
        console.error("Error fetching accepted swaps:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAcceptedSwaps(user);
  }, [user]);

  // fetch requester avatars for all unique requesterIds
  useEffect(() => {
    const loadRequesters = async () => {
      const ids = Array.from(
        new Set(acceptedRequests.map((r) => r.requesterId).filter(Boolean))
      ).filter((id) => !(id in requesterAvatars));

      if (ids.length === 0) return;

      const updates: Record<string, string | null> = {};

      for (const requesterId of ids) {
        try {
          const userRef = doc(db, "users", requesterId);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserDoc;
            updates[requesterId] = getAvatarUrl(data);
          } else {
            updates[requesterId] = null;
          }
        } catch (e) {
          console.error("Error fetching requester profile:", e);
          updates[requesterId] = null;
        }
      }

      if (Object.keys(updates).length > 0) {
        setRequesterAvatars((prev) => ({ ...prev, ...updates }));
      }
    };

    if (acceptedRequests.length > 0) {
      loadRequesters();
    }
  }, [acceptedRequests, requesterAvatars]);

  const handleChatClick = (requesterId: string) => {
    router.push(`/chat/${requesterId}`);
  };

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 text-lg">
            Please log in to view accepted swaps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Accepted Skill Swaps
        </h1>
        <p className="text-gray-600">
          Connect with users who are ready to exchange skills with you
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Loading accepted swaps...</p>
        </div>
      ) : acceptedRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Accepted Swaps Yet
            </h3>
            <p className="text-gray-600">
              When you accept skill swap requests, they&apos;ll appear here so you
              can start chatting.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {acceptedRequests.map((request) => {
            const avatar = requesterAvatars[request.requesterId] ?? null;
            const firstLetter =
              request.requesterName?.charAt(0).toUpperCase() || "?";

            return (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <img
                        src="https://api.iconify.design/mdi:book-open-page-variant.svg?color=white"
                        alt="Lesson"
                        className="w-8 h-8"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-1 truncate">
                        {request.requestedLessonTitle}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {request.updatedAt
                          ? `Accepted on ${request.updatedAt.toLocaleDateString()}`
                          : "Accepted"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={request.requesterName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-blue-700 font-semibold text-lg">
                          {firstLetter}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {request.requesterName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {request.requesterEmail}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">
                      They&apos;re offering:
                    </p>
                    <p className="font-semibold text-gray-900">
                      {request.offeredSkillTitle}
                    </p>
                  </div>

                  {request.message && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Message:</p>
                      <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        {request.message}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleChatClick(request.requesterId)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Chat with {request.requesterName.split(" ")[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}