/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";

export default function App() {
  const [visibleCount, setVisibleCount] = useState(22);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    idea: "",
    submitted: false
  });
  const [trail, setTrail] = useState<{
    id: number;
    x: number;
    y: number;
    rotation: number;
    type: "trail_sticker1" | "trail_sticker2" | "trail_sticker3" | "trail_sticker4" | "trail_sticker5";
  }[]>([]);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const manifestoRef = useRef<HTMLDivElement>(null);

  // Sticker mouse trail tracker
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let idCounter = 0;
    let typeCounter = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const distance = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      // Spawn a new sticker if cursor moved past threshold for clean trail pacing
      if (distance > 150) {
        lastX = e.clientX;
        lastY = e.clientY;

        const types: ("trail_sticker1" | "trail_sticker2" | "trail_sticker3" | "trail_sticker4" | "trail_sticker5")[] = [
          "trail_sticker1",
          "trail_sticker2",
          "trail_sticker3",
          "trail_sticker4",
          "trail_sticker5",
        ];
        // Cycle sequentially to perfectly alternate types
        const chosenType = types[typeCounter % 5];
        typeCounter++;

        const newSticker = {
          id: idCounter++,
          x: e.clientX,
          y: e.clientY,
          rotation: Math.random() * 40 - 20, // -20 to +20 degrees
          type: chosenType,
        };

        // Keep maximum of 4 stickers in the trail array at all times
        setTrail((prev) => [...prev.slice(-3), newSticker]);

        // Auto cleanse to match slower 2.2s fade-out timeline
        setTimeout(() => {
          setTrail((prev) => prev.filter((item) => item.id !== newSticker.id));
        }, 2200);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Serve both pre-downloaded Google Drive videos statically from our proxy filesystem.
  // This completely eliminates cross-origin iframe issues, download limit flags, and browser autoplay blockages.
  const videoUrl1 = "/video.mp4";
  const videoUrl2 = "/video2.mp4";

  // Warm up metadata for both videos
  useEffect(() => {
    const v1 = videoRef1.current;
    const v2 = videoRef2.current;

    const setupVideo = (v: HTMLVideoElement | null) => {
      if (!v) return;
      v.load();

      const handleLoadedMetadata = () => {
        v.play().then(() => {
          v.pause();
        }).catch(() => {
          // Fallback if browser prevents auto playback triggers
        });
      };

      v.addEventListener("loadedmetadata", handleLoadedMetadata);
      if (v.readyState >= 1) {
        handleLoadedMetadata();
      }
    };

    setupVideo(v1);
    setupVideo(v2);

    return () => {
      v1?.removeEventListener("loadedmetadata", () => {});
      v2?.removeEventListener("loadedmetadata", () => {});
    };
  }, []);

  // Multi-video scroll scrub controllers
  useEffect(() => {
    const v1 = videoRef1.current;
    const v2 = videoRef2.current;
    if (!v1 || !v2) return;

    let requestId: number;
    let targetTime1 = 0;
    let currentTime1 = 0;
    let targetTime2 = 0;
    let currentTime2 = 0;

    const tick = () => {
      // Lerp smooth scrubbing for Video 1
      const diff1 = targetTime1 - currentTime1;
      if (Math.abs(diff1) > 0.001) {
        if (!v1.seeking) {
          const isScrollStart = window.scrollY <= 10;
          if (isScrollStart) {
            currentTime1 = targetTime1;
          } else {
            currentTime1 += diff1 * 0.3;
          }
          if (currentTime1 < 0) currentTime1 = 0;
          if (currentTime1 > v1.duration) currentTime1 = v1.duration;
          v1.currentTime = currentTime1;
        }
      }

      // Lerp smooth scrubbing for Video 2
      const diff2 = targetTime2 - currentTime2;
      if (Math.abs(diff2) > 0.001) {
        if (!v2.seeking) {
          const isScrollEnd = window.scrollY >= (document.documentElement.scrollHeight - window.innerHeight - 10);
          if (isScrollEnd) {
            currentTime2 = targetTime2;
          } else {
            currentTime2 += diff2 * 0.3;
          }
          if (currentTime2 < 0) currentTime2 = 0;
          if (currentTime2 > v2.duration) currentTime2 = v2.duration;
          v2.currentTime = currentTime2;
        }
      }

      requestId = requestAnimationFrame(tick);
    };

    const updatePlayheads = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;

      if (maxScroll <= 0) return;

      const progress = scrollY / maxScroll; // overall progress [0, 1]

      // Set the feedback form visibility based on progress of the scroll/video
      const isEnd = progress >= 0.95;
      setShowFeedbackForm((prev) => (prev !== isEnd ? isEnd : prev));

      // Standard typewriter deletion effect as we scroll from progress 0.0 to 0.25 (character by character)
      const shrinkRange = 0.25;
      const activeProgress = Math.min(progress, shrinkRange) / shrinkRange; // from 0 to 1
      const totalChars = 22; // 7 + 4 letters of WITH + 2 stickers + 9 letters of CREATIVE?
      const newVisibleCount = Math.max(0, Math.min(totalChars, Math.round((1 - activeProgress) * totalChars)));
      setVisibleCount((prev) => (prev !== newVisibleCount ? newVisibleCount : prev));

      // Standard rolling credits style manifesto translation starting after a 200px delay to sync with character typing on laptop
      const delayProgress = 200 / maxScroll;
      const manifestoStartProgress = shrinkRange + delayProgress;

      if (progress < manifestoStartProgress) {
        if (manifestoRef.current) {
          manifestoRef.current.style.transform = "translateY(100vh)";
          manifestoRef.current.style.opacity = "0";
        }
      } else {
        const alpha = (progress - manifestoStartProgress) / (1 - manifestoStartProgress); // 0 to 1
        const opacity = Math.min(1, alpha / 0.05); // fast fade-in when scrolling starts
        // Scroll from 100vh to -350vh so it goes completely off-screen at the very end
        const translateY = 100 - (alpha * 450);
        if (manifestoRef.current) {
          manifestoRef.current.style.transform = `translateY(${translateY}vh)`;
          manifestoRef.current.style.opacity = `${opacity}`;
        }
      }

      // Segment 1: Video 1 plays from progress 0.0 to 0.5
      // Segment 2: Video 2 plays from progress 0.5 to 1.0
      // We also update opacities dynamically via DOM style properties for max performance.
      if (progress <= 0.5) {
        // Range [0, 0.5] map to [0, 1] for video 1
        const segmentProgress = progress / 0.5;
        if (v1.duration) {
          targetTime1 = segmentProgress * v1.duration;
        }
        targetTime2 = 0; // Hold Video 2 at first frame

        // Fade transition between Video 1 & Video 2 at the boundaries (e.g. 0.45 to 0.5)
        if (progress > 0.45) {
          const fadeFactor = (0.5 - progress) / 0.05; // 1 to 0
          v1.style.opacity = `${fadeFactor}`;
          v2.style.opacity = `${1 - fadeFactor}`;
        } else {
          v1.style.opacity = "1";
          v2.style.opacity = "0";
        }
      } else {
        // Range [0.5, 1.0] map to [0, 1] for video 2
        const segmentProgress = (progress - 0.5) / 0.5;
        if (v2.duration) {
          targetTime2 = segmentProgress * v2.duration;
        }
        if (v1.duration) {
          targetTime1 = v1.duration; // Keep Video 1 at last frame when finished
        }

        // Fade transition between Video 1 & Video 2 at the boundaries (e.g. 0.5 to 0.55)
        if (progress < 0.55) {
          const fadeFactor = (progress - 0.5) / 0.05; // 0 to 1
          v1.style.opacity = `${1 - fadeFactor}`;
          v2.style.opacity = `${fadeFactor}`;
        } else {
          v1.style.opacity = "0";
          v2.style.opacity = "1";
        }
      }
    };

    const onScroll = () => {
      updatePlayheads();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    requestId = requestAnimationFrame(tick);

    const delayTimer = setTimeout(() => {
      updatePlayheads();
    }, 200);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(requestId);
      clearTimeout(delayTimer);
    };
  }, []);

  const line1 = ["P", "R", "O", "B", "L", "E", "M"];
  const line3 = ["C", "R", "E", "A", "T", "I", "V", "E", "?"];

  const renderCursor = () => (
    <span className="inline-block w-[0.14em] h-[0.8em] bg-[#85D743] ml-1 select-none animate-pulse align-middle" />
  );

  return (
    <div className="relative w-full bg-slate-950 min-h-[1200vh] select-none">
      {/* Video 1 Container pinned to viewport */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef1}
          src={videoUrl1}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          muted
          playsInline
          autoPlay={false}
          preload="auto"
          style={{ opacity: 1 }}
        />
        <video
          ref={videoRef2}
          src={videoUrl2}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
          muted
          playsInline
          autoPlay={false}
          preload="auto"
          style={{ opacity: 0 }}
        />
      </div>

      {/* Top Left Diagonal Scrolling Marquee (WARNING!) */}
      <div className="fixed top-14 left-[-170px] w-[650px] -rotate-[30deg] z-50 bg-[#0033FF] py-[18px] overflow-hidden select-none pointer-events-none shadow-2xl">
        <div className="animate-marquee flex whitespace-nowrap">
          <span className="font-press-start text-[16px] text-[#85D743] tracking-widest px-4">
            WARNING! WARNING! WARNING! WARNING! WARNING! WARNING! WARNING! WARNING!&nbsp;
          </span>
          <span className="font-press-start text-[16px] text-[#85D743] tracking-widest px-4">
            WARNING! WARNING! WARNING! WARNING! WARNING! WARNING! WARNING! WARNING!&nbsp;
          </span>
        </div>
      </div>

      {/* Floating Google Drive Sticker */}
      <div 
        className="fixed z-40 select-none pointer-events-none transition-transform duration-300"
        style={{
          top: "232px", 
          left: "120px",
          transform: "rotate(32deg)",
        }}
      >
        <img 
          src="/sticker1.png" 
          alt="Sticker" 
          className="w-[100px] h-auto object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            console.log("Sticker image still loading on backend...");
          }}
        />
      </div>

      {/* Floating Bottom Right Sticker */}
      <div 
        className="fixed bottom-8 right-8 z-40 select-none pointer-events-none transition-transform duration-300"
      >
        <img 
          src="/sticker2.png" 
          alt="Bottom Right Sticker" 
          className="w-[110px] sm:w-[150px] h-auto object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            console.log("Sticker 2 image still loading on backend...");
          }}
        />
      </div>

      {/* Menu / Navigation Items - Top Right */}
      <header className="fixed top-10 right-8 md:right-16 z-50 flex gap-6 md:gap-10 font-press-start text-[10px] sm:text-xs md:text-sm text-white select-auto">
        <a href="#projects" className="hover:text-[#85D743] transition-colors duration-200">
          Projects
        </a>
        <a href="#expertise" className="hover:text-[#85D743] transition-colors duration-200">
          Expertise
        </a>
        <a href="#about" className="hover:text-[#85D743] transition-colors duration-200">
          About
        </a>
        <a 
          href="#contact" 
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth"
            });
          }}
          className="hover:text-[#85D743] transition-colors duration-200"
        >
          Contact
        </a>
      </header>

      {/* Hero Header Content (Scrolling natural overlay) - Fixed viewport behavior so it stays pinned like the video */}
      <div className="fixed top-0 left-0 w-full h-screen z-30 pointer-events-none flex flex-col justify-end p-8 md:p-16 pb-16 sm:pb-24">
        <h1 className="font-press-start text-[#85D743] text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.2] tracking-tight uppercase select-none max-w-5xl">
          {/* Line 1: PROBLEM */}
          {line1.map((char, i) => {
            const idx = i + 1;
            if (visibleCount < idx) return null;
            return (
              <span key={`l1-${i}`} className="inline-block relative">
                {char}
                {visibleCount === idx && renderCursor()}
              </span>
            );
          })}
          <br />

          {/* Line 2: WITH + Stickers */}
          <span className="inline-flex items-center gap-3 sm:gap-5 md:gap-7 align-middle">
            {/* Letters of WITH grouped in a tight flex container for minimal spacing between characters */}
            <span className="inline-flex items-center gap-[0.06em] sm:gap-[0.08em] md:gap-[0.1em]">
              {["W", "I", "T", "H"].map((char, i) => {
                const idx = 7 + i + 1; // 8, 9, 10, 11
                if (visibleCount < idx) return null;
                return (
                  <span key={`l2-${i}`} className="inline-block relative">
                    {char}
                    {visibleCount === idx && renderCursor()}
                  </span>
                );
              })}
            </span>
            
            {visibleCount >= 12 && (
              <span className="inline-block relative">
                <img 
                  src="/sticker4.png" 
                  alt="Sticker 4" 
                  className="h-[0.85em] w-auto object-contain inline-block select-none pointer-events-none" 
                  style={{ transform: "rotate(-8deg)" }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.log("Sticker 4 image still loading on backend...");
                  }}
                />
                {visibleCount === 12 && renderCursor()}
              </span>
            )}

            {visibleCount >= 13 && (
              <span className="inline-block relative">
                <img 
                  src="/sticker3.png" 
                  alt="Sticker 3" 
                  className="h-[0.85em] w-auto object-contain inline-block select-none pointer-events-none" 
                  style={{ transform: "rotate(6deg)" }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.log("Sticker 3 image still loading on backend...");
                  }}
                />
                {visibleCount === 13 && renderCursor()}
              </span>
            )}
          </span>
          <br />

          {/* Line 3: CREATIVE? */}
          {line3.map((char, i) => {
            const idx = 13 + i + 1; // 14 to 22
            if (visibleCount < idx) return null;
            return (
              <span key={`l3-${i}`} className="inline-block relative">
                {char}
                {visibleCount === idx && renderCursor()}
              </span>
            );
          })}
        </h1>
      </div>

      {/* Manifesto Scrolling Narrative */}
      <div 
        ref={manifestoRef}
        className="fixed top-0 left-0 w-full md:w-[70%] h-screen z-25 pointer-events-none flex flex-col justify-start p-8 md:p-16 pt-[12vh] pb-16 select-none"
        style={{
          opacity: 0,
          transform: "translateY(100vh)"
        }}
      >
        <div className="font-press-start text-[#85D743] text-[20px] sm:text-[26px] md:text-[32px] leading-[1.35] tracking-tight uppercase text-left whitespace-pre-line select-none">
          LIMITLESS INPUTS OR{"\n"}
          STANDARD LAYOUT{"\n"}
          TEMPLATE{"\n"}
          CONSUMERS. THIS IS{"\n"}
          A HIGHLY SELECTIVE{"\n"}
          ENVIRONMENT{"\n"}
          ENGINEERED FOR{"\n"}
          HYPER-PRODUCTIVE{"\n"}
          CREATORS, UI/UX{"\n"}
          VISIONARIES, AND{"\n"}
          AI PROMPT{"\n"}
          ARCHITECTS WHO{"\n"}
          OPERATE AT THE{"\n"}
          ABSOLUTE LIMITS OF{"\n"}
          DIGITAL PRODUCT{"\n"}
          CREATION. OUR{"\n"}
          FRAMEWORK IS{"\n"}
          {"\n"}
          ---{"\n"}
          {"\n"}
          WHY CHOOSE US?{"\n"}
          1. ZERO MOCKUPS,{"\n"}
             ONLY REAL CODE.{"\n"}
          2. SPEED RUNS -{"\n"}
             ZERO WASTED TIME.{"\n"}
          3. DIGITAL EDGE -{"\n"}
             AESTHETIC{"\n"}
             DOMINANCE.{"\n"}
          4. SYSTEM STATE -{"\n"}
             INTELLIGENT{"\n"}
             INTERACTION.{"\n"}
          {"\n"}
          ---{"\n"}
          {"\n"}
          WE REJECT{"\n"}
          THE BORING.{"\n"}
          WE REJECT{"\n"}
          THE STANDARD.{"\n"}
          {"\n"}
          CHOOSE ABSOLUTE{"\n"}
          CREATIVE EDGE.{"\n"}
          {"\n"}
          THE FUTURE IS{"\n"}
          NOW SECURED.
        </div>
      </div>

      {/* Interactive Cursor Mouse Sticker Trail */}
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
        {trail.map((item) => (
          <div
            key={item.id}
            className="absolute select-none pointer-events-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{
              left: item.x,
              top: item.y,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              ["--rot" as any]: `${item.rotation}deg`,
              animation: "sticker-fade-out 2.2s forwards cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {item.type === "trail_sticker1" && (
              <img
                src="/trail_sticker1.png"
                alt="trail-sticker"
                className="w-[110px] sm:w-[150px] md:w-[180px] h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            )}
            {item.type === "trail_sticker2" && (
              <img
                src="/trail_sticker2.png"
                alt="trail-sticker"
                className="w-[110px] sm:w-[150px] md:w-[180px] h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            )}
            {item.type === "trail_sticker3" && (
              <img
                src="/trail_sticker3.png"
                alt="trail-sticker"
                className="w-[110px] sm:w-[150px] md:w-[180px] h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            )}
            {item.type === "trail_sticker4" && (
              <img
                src="/trail_sticker4.png"
                alt="trail-sticker"
                className="w-[110px] sm:w-[150px] md:w-[180px] h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            )}
            {item.type === "trail_sticker5" && (
              <img
                src="/trail_sticker5.png"
                alt="trail-sticker"
                className="w-[110px] sm:w-[150px] md:w-[180px] h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        ))}
      </div>

      {/* Scroll-triggered Feedback Form (Slide up & decelerate animation in our style) */}
      <div 
        className="fixed left-1/2 z-[55] w-[92%] max-w-[460px] p-6 sm:p-8 bg-slate-950/95 border-4 border-[#0033FF] shadow-[10px_10px_0px_#85D743] select-auto transition-all duration-[900ms] pointer-events-auto"
        style={{
          bottom: "50%",
          transform: showFeedbackForm
            ? "translate(-50%, 50%) rotate(0deg)"
            : "translate(-50%, 150vh) rotate(15deg)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Decorative close button */}
        <button 
          onClick={() => setShowFeedbackForm(false)}
          className="absolute top-4 right-4 font-press-start text-[14px] text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 transition-all cursor-pointer select-none border-none bg-transparent"
          title="Dismiss"
        >
          [X]
        </button>

        {formState.submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <span className="font-press-start text-[32px] text-[#85D743] mb-4 animate-bounce">✦</span>
            <h3 className="font-press-start text-xs sm:text-sm text-[#85D743] mb-3 tracking-widest uppercase">
              TRANSMISSION SUCCESS
            </h3>
            <p className="font-mono text-[10px] sm:text-xs text-slate-400 max-w-sm mb-6 uppercase leading-relaxed">
              Your feedback is secured in our neural network database.
            </p>
            <button
              onClick={() => setFormState(prev => ({ ...prev, submitted: false }))}
              className="font-press-start text-[8px] sm:text-[10px] text-black bg-[#85D743] hover:bg-[#9eff5c] border-2 border-black py-2.5 px-5 font-bold uppercase tracking-wider shadow-[3px_3px_0px_#0033FF] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              [ NEW TRANSMISSION ]
            </button>
          </div>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setFormState((prev) => ({ ...prev, submitted: true }));
            }}
            className="flex flex-col gap-4 sm:gap-5"
          >
            <div>
              <h2 className="font-press-start text-xs sm:text-sm text-[#85D743] tracking-widest uppercase text-center mb-1">
                FEEDBACK SYSTEM
              </h2>
            </div>

            <div className="flex flex-col">
              <input 
                type="text"
                required
                placeholder="YOUR NAME"
                value={formState.name}
                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                className="font-mono text-xs text-white bg-slate-900 border-2 border-slate-700 focus:border-[#85D743] hover:border-slate-500 focus:outline-none p-2.5 w-full uppercase transition-all placeholder-slate-600"
              />
            </div>

            <div className="flex flex-col">
              <input 
                type="email"
                required
                placeholder="NAME@DOMAIN.COM"
                value={formState.email}
                onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                className="font-mono text-xs text-white bg-slate-900 border-2 border-slate-700 focus:border-[#85D743] hover:border-slate-500 focus:outline-none p-2.5 w-full transition-all placeholder-slate-600"
              />
            </div>

            <div className="flex flex-col">
              <textarea 
                required
                rows={3}
                placeholder="FEEDBACK / ARCHITECTURE IDEAS..."
                value={formState.idea}
                onChange={(e) => setFormState(prev => ({ ...prev, idea: e.target.value }))}
                className="font-mono text-xs text-white bg-slate-900 border-2 border-slate-700 focus:border-[#85D743] hover:border-slate-500 focus:outline-none p-2.5 w-full transition-all placeholder-slate-600 resize-none"
              />
            </div>

            <button 
              type="submit"
              className="font-press-start text-[8px] sm:text-[9px] text-black bg-[#85D743] hover:bg-[#9bfb4e] active:translate-y-0.5 active:shadow-none border-2 border-black py-3 px-6 shadow-[4px_4px_0px_#0033FF] w-full font-bold uppercase tracking-widest cursor-pointer select-none transition-all mt-1"
            >
              LAUNCH TRANSMISSION
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
