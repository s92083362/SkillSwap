
'use client';

import React from 'react';

type EnrollButtonProps = {
  isEnrolled: boolean;
  loading: boolean;
  onToggle: () => Promise<void>;
};

export function EnrollButton({
  isEnrolled,
  loading,
  onToggle,
}: EnrollButtonProps) {
  return (
    <div className="mt-8 flex justify-center">
      <button
        className={`px-5 py-2 rounded font-semibold transition-colors ${
          isEnrolled
            ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
        } ${loading ? 'opacity-70 cursor-wait' : ''}`}
        onClick={onToggle}
        disabled={loading}
        type="button"
      >
        {loading
          ? isEnrolled
            ? 'Unenrolling...'
            : 'Enrolling...'
          : isEnrolled
          ? 'Unenroll'
          : 'Enroll'}
      </button>
    </div>
  );
}
