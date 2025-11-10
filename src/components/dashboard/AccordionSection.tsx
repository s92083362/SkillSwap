"use client";

import React, { useState } from "react";

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 text-2xl font-bold w-full text-left py-4 px-2 bg-transparent focus:outline-none text-black"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && (
        <div className="bg-blue-100 px-4 py-4 rounded-md border-t border-blue-200 text-base">
          {children}
        </div>
      )}
    </div>
  );
};
export default AccordionSection;