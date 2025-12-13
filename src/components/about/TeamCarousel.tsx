"use client"

import React, { useState, useCallback, useEffect } from "react";

interface Member {
  name: string;
  role: string;
  img: string;
}

const members: Member[] = [
  { name: "R.M.B.P.B. Weerakoon", role: "Lead Engineer / Fullstack", img: "https://ik.imagekit.io/gopichakradhar/luffy/o1.jpeg?updatedAt=1754289569411" },
  { name: "R.M.Y.C.K. Rathnayake", role: "UI/UX Designer", img: "https://ik.imagekit.io/gopichakradhar/luffy/o2.jpeg?updatedAt=1754289569307" },
  { name: "D.M.S. Eswarage", role: "Backend Developer", img: "https://ik.imagekit.io/gopichakradhar/luffy/o4.jpeg?updatedAt=1754289569398" },
  { name: "P.V.V.R. Paranavitharana", role: "Frontend Developer", img: "https://ik.imagekit.io/gopichakradhar/luffy/o3.jpeg?updatedAt=1754289569422" },
  { name: "W.K. Amila Sandaruwan", role: "QA Engineer", img: "https://ik.imagekit.io/gopichakradhar/luffy/o5.jpeg?updatedAt=1754289569406" }
];

type Position = "center" | "down-1" | "down-2" | "up-1" | "up-2" | "hidden";

function getPosition(idx: number, current: number, length: number): Position {
  const offset = (idx - current + length) % length;
  if (offset === 0) return "center";
  if (offset === 1) return "down-1";
  if (offset === 2) return "down-2";
  if (offset === length - 1) return "up-1";
  if (offset === length - 2) return "up-2";
  return "hidden";
}

export default function TeamCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nameOpacity, setNameOpacity] = useState(1);
  const length = members.length;

  const goTo = useCallback((idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setNameOpacity(0);
    
    setTimeout(() => {
      setCurrent((idx + length) % length);
      setNameOpacity(1);
    }, 300);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 800);
  }, [length, isAnimating]);

  const prev = useCallback(() => goTo(current - 1), [goTo, current]);
  const next = useCallback(() => goTo(current + 1), [goTo, current]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") prev();
      if (e.key === "ArrowDown") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Swipe navigation for mobile
  useEffect(() => {
    let touchStart: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchStart = e.changedTouches[0].screenY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStart !== null) {
        const diff = touchStart - e.changedTouches[0].screenY;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
        touchStart = null;
      }
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 w-full items-center justify-center py-8">
      {/* Carousel Section */}
      <div className="relative flex flex-col items-center">
        {/* Top Arrow - Desktop hidden, Mobile visible */}
        <button
          aria-label="Previous member"
          className="lg:hidden mb-6 hover:scale-110 transition-transform bg-transparent border-0 p-0"
          onClick={prev}
          disabled={isAnimating}
        >
          <svg width="50" height="50" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#082A7B">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"></path>
          </svg>
        </button>
        
        {/* Carousel Track */}
        <div 
          className="relative w-[350px] md:w-[450px] h-[500px] md:h-[600px]" 
          style={{perspective: '1000px'}}
        >
          {members.map((m, idx) => {
            const pos = getPosition(idx, current, length);
            return (
              <div
                key={m.name}
                className={`card ${pos} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[180px] md:w-[400px] md:h-[225px] rounded-[20px] overflow-hidden cursor-pointer transition-all duration-[800ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-[0_20px_40px_rgba(0,0,0,0.15)]`}
                style={{
                  transformStyle: 'preserve-3d',
                }}
                onClick={() => goTo(idx)}
              >
                <img 
                  src={m.img} 
                  alt={m.name} 
                  className={`w-full h-full object-cover transition-all duration-[800ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                    pos !== "center" ? "grayscale" : ""
                  }`}
                />
              </div>
            );
          })}
        </div>
        
        {/* Bottom Arrow - Desktop hidden, Mobile visible */}
        <button
          aria-label="Next member"
          className="lg:hidden mt-6 hover:scale-110 transition-transform bg-transparent border-0 p-0"
          onClick={next}
          disabled={isAnimating}
        >
          <svg width="50" height="50" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#082A7B">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
      
      {/* Controls Section */}
      <div className="flex flex-col items-center justify-center gap-10 min-w-[280px]">
        {/* Desktop Navigation Arrows */}
        <div className="hidden lg:flex flex-row gap-8 items-center">
          <button
            aria-label="Previous member"
            className="hover:scale-125 transition-transform bg-transparent border-0 p-0"
            onClick={prev}
            disabled={isAnimating}
          >
            <svg width="60" height="60" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#082A7B">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"></path>
            </svg>
          </button>
          <button
            aria-label="Next member"
            className="hover:scale-125 transition-transform bg-transparent border-0 p-0"
            onClick={next}
            disabled={isAnimating}
          >
            <svg width="60" height="60" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#082A7B">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
        
        {/* Member Info */}
        <div className="text-center">
          <h2 
            className="text-3xl md:text-4xl font-bold text-[#082A7B] mb-3 relative inline-block transition-opacity duration-300"
            style={{opacity: nameOpacity}}
          >
            {members[current].name}
            <span className="absolute left-[-100px] md:left-[-120px] top-full w-[80px] md:w-[100px] h-[2px] bg-[#082A7B]"></span>
            <span className="absolute right-[-100px] md:right-[-120px] top-full w-[80px] md:w-[100px] h-[2px] bg-[#082A7B]"></span>
          </h2>
          <div 
            className="text-sm md:text-base uppercase text-gray-500 tracking-[0.1em] font-medium transition-opacity duration-300"
            style={{opacity: nameOpacity}}
          >
            {members[current].role}
          </div>
        </div>
        
        {/* Dots */}
        <div className="flex gap-3 justify-center">
          {members.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to ${members[idx].name}`}
              className={`w-3 h-3 rounded-full transition-all duration-300 border-0 p-0 ${
                idx === current ? "bg-[#082A7B] scale-125" : "bg-[#082A7B]/20 hover:bg-[#082A7B]/40"
              }`}
              onClick={() => goTo(idx)}
              disabled={isAnimating}
            />
          ))}
        </div>
      </div>
    </div>
  );
}