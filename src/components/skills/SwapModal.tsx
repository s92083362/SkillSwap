
'use client';

import React from 'react';

type SwapModalProps = {
  show: boolean;
  offeredSkillTitle: string;
  swapMessage: string;
  agreed: boolean;
  sending: boolean;
  onClose: () => void;
  onChangeOffered: (v: string) => void;
  onChangeMessage: (v: string) => void;
  onChangeAgreed: (v: boolean) => void;
  onSubmit: () => Promise<void>;
};

export function SwapModal({
  show,
  offeredSkillTitle,
  swapMessage,
  agreed,
  sending,
  onClose,
  onChangeOffered,
  onChangeMessage,
  onChangeAgreed,
  onSubmit,
}: SwapModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-blue-600 font-bold"
          type="button"
        >
          ×
        </button>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          Request an Exchange
        </h2>
        <p className="text-gray-600 mb-8">
          You are one step away from learning a new skill!
        </p>
        <div className="mb-6">
          <label className="block font-semibold text-gray-800 mb-2">
            Skill to offer in return
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-gray-900"
            placeholder="e.g. Web Development, Graphic Design..."
            value={offeredSkillTitle}
            onChange={(e) => onChangeOffered(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block font-semibold text-gray-800 mb-2">
            Add a message{' '}
            <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[80px] text-gray-900"
            placeholder="Hi! I'd love to exchange my skills for your course."
            value={swapMessage}
            onChange={(e) => onChangeMessage(e.target.value)}
          />
        </div>
        <div className="flex items-center mb-8">
          <input
            type="checkbox"
            id="agree"
            className="mr-2"
            checked={agreed}
            onChange={(e) => onChangeAgreed(e.target.checked)}
          />
          <label htmlFor="agree" className="text-gray-700 text-sm">
            I agree to the SkillSwap{' '}
            <a className="text-blue-600 underline" href="#">
              Terms
            </a>{' '}
            and{' '}
            <a className="text-blue-600 underline" href="#">
              Conditions
            </a>
            .
          </label>
        </div>
        <button
          className="w-full bg-blue-900 hover:bg-blue-800 text-white text-lg font-semibold rounded py-3 mt-2 transition disabled:opacity-60"
          disabled={sending || !offeredSkillTitle.trim() || !agreed}
          onClick={onSubmit}
          type="button"
        >
          {sending ? 'Sending...' : 'Skill Exchange Request'}
        </button>
      </div>
    </div>
  );
}
