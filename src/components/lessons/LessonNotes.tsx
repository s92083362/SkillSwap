"use client";

import React, { useState, useEffect, useRef } from "react";
import { saveUserNote, loadUserNote } from "../../lib/firebase/saveNotes";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase/firebaseConfig";

type LessonNotesProps = {
  skillId: string;
  sectionId: string;
};

export default function LessonNotes({ skillId, sectionId }: LessonNotesProps) {
  const [user] = useAuthState(auth);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load note from Firebase
  useEffect(() => {
    if (!user) return;
    loadUserNote(user.uid, skillId, sectionId).then((savedNote) => {
      if (savedNote) {
        setNote(savedNote);
        setSaved(true); 
      }
    });
  }, [user, skillId, sectionId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [note, saved]);

  // Save note
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await saveUserNote(user.uid, skillId, sectionId, note);
    setSaving(false);
    setSaved(true);
  };

  // Enable editing again
  const handleEdit = () => {
    if (saved) setSaved(false);
  };

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onClick={saved ? handleEdit : undefined} 
        readOnly={saved} 
        placeholder="Write your notes here..."
        className={`w-full p-2 rounded border border-gray-300 text-gray-900
          ${saved ? "bg-gray-100 cursor-pointer" : "bg-white"}`}
        style={{ minHeight: "3rem", maxHeight: "12rem", overflow: "hidden" }}
      />

      {!saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 bg-blue-900 text-white rounded px-4 py-2 hover:bg-blue-600"
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      )}
    </div>
  );
}
