import { useEffect, useId, useRef, useState } from "react";
import { usePreferences } from "../../lib/preferences";

export function MedicalAiChatbotOrb({
  size = "docked",
  isSpeaking = false,
  isListening = false,
  eyeOffset: propEyeOffset,
}: {
  size?: "mini" | "docked" | "intro" | "hero";
  isSpeaking?: boolean;
  isListening?: boolean;
  eyeOffset?: { x: number; y: number };
}) {
  const { motionPaused } = usePreferences();
  const uid = useId().replace(/:/g, "");
  const gradId = `g-med-gyro-${uid}`;
  const [internalEyeOffset, setInternalEyeOffset] = useState({ x: 0, y: 0 });
  const orbWrapRef = useRef<HTMLSpanElement>(null);
  const ring1Ref = useRef<SVGGElement>(null);
  const ring2Ref = useRef<SVGGElement>(null);

  // High-performance, bulletproof 60fps Gyro Ring Rotation
  // Uses direct SVG DOM transform to guarantee smooth rotation around (50, 50)
  // regardless of browser quirks, CSS inheritance, or Windows OS accessibility settings.
  useEffect(() => {
    if (motionPaused) return;

    let animId: number;
    let start: number | null = null;
    const dur1 = 9000; // 9s clockwise (Exact AgriSense spec)
    const dur2 = 7000; // 7s counter-clockwise (Exact AgriSense spec)

    const step = (time: number) => {
      if (start === null) start = time;
      const elapsed = time - start;

      const angle1 = ((elapsed % dur1) / dur1) * 360;
      const angle2 = 360 - (((elapsed % dur2) / dur2) * 360);

      if (ring1Ref.current) {
        ring1Ref.current.setAttribute("transform", `rotate(${angle1.toFixed(2)} 50 50)`);
      }
      if (ring2Ref.current) {
        ring2Ref.current.setAttribute("transform", `rotate(${angle2.toFixed(2)} 50 50)`);
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [motionPaused]);

  // Mouse tracking and autonomous idle glance for eyes
  useEffect(() => {
    if (propEyeOffset) return;
    let isMoving = false;
    let idleTimer: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      isMoving = true;
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        isMoving = false;
      }, 1600);

      if (!orbWrapRef.current) return;
      const rect = orbWrapRef.current.getBoundingClientRect();
      const orbCenterX = rect.left + rect.width / 2;
      const orbCenterY = rect.top + rect.height / 2;
      const dx = e.clientX - orbCenterX;
      const dy = e.clientY - orbCenterY;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = size === "intro" ? 4.5 : 3.2;
      const factor = Math.min(dist / 260, 1);
      setInternalEyeOffset({
        x: (dx / dist) * maxOffset * factor,
        y: (dy / dist) * maxOffset * factor,
      });
    };

    // Autonomous playful glances when mouse is resting (AgriSense Fusion alive effect)
    const idleInterval = window.setInterval(() => {
      if (isMoving) return;
      const glances = [
        { x: 0, y: 0 },
        { x: -2.8, y: -0.8 },
        { x: 2.8, y: -0.8 },
        { x: 0, y: 1.4 },
        { x: -1.8, y: 1.2 },
        { x: 1.8, y: 1.2 },
        { x: 0, y: 0 },
      ];
      const next = glances[Math.floor(Math.random() * glances.length)];
      setInternalEyeOffset(next);
    }, 1900);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.clearInterval(idleInterval);
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, [propEyeOffset, size]);

  const activeOffset = propEyeOffset || internalEyeOffset;

  return (
    <span ref={orbWrapRef} className="ai-orb-hop-wrapper" aria-hidden="true">
      <span className={`ai-gyro-orb-wrap size-${size}`}>
        {/* Outer audio reactive aura */}
        {(isSpeaking || isListening) && (
          <span
            className={`absolute -inset-2 rounded-full border pointer-events-none ${
              isSpeaking
                ? "border-cyan-400/80 animate-ping"
                : "border-emerald-400/80 animate-pulse"
            }`}
          />
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="ai-gyro-svg"
        >
          <defs>
            <radialGradient id={gradId} cx="34%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="38%" stopColor="#38bdf8" />
              <stop offset="72%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#022c44" />
            </radialGradient>
          </defs>

          {/* Gyro Ring 1 - Spinning Clockwise (Continuous 60FPS SVG Animation) */}
          <g ref={ring1Ref} transform="rotate(0 50 50)">
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              transform="rotate(32 50 50)"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeOpacity="0.88"
            />
            <circle cx="88" cy="72" r="3.2" fill="#38bdf8" />
          </g>

          {/* Gyro Ring 2 - Spinning Counter-Clockwise (Continuous 60FPS SVG Animation) */}
          <g ref={ring2Ref} transform="rotate(0 50 50)">
            <ellipse
              cx="50"
              cy="50"
              rx="44"
              ry="18"
              transform="rotate(-32 50 50)"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2.2"
              strokeOpacity="0.88"
            />
            <circle cx="12" cy="72" r="3.2" fill="#5eead4" />
          </g>

          {/* Central Holographic Cyan-Teal Medical Core */}
          <circle
            cx="50"
            cy="50"
            r="28"
            fill={`url(#${gradId})`}
            stroke="#7dd3fc"
            strokeWidth="1.2"
          />

          {/* Specular Light Reflection Glint */}
          <ellipse
            cx="41"
            cy="36"
            rx="10"
            ry="5.5"
            transform="rotate(-25 41 36)"
            fill="#ffffff"
            fillOpacity="0.5"
          />

          {/* Cursor-Tracking, Blinking & Happy Eyes (^ ^) */}
          <g
            className="bot-eyes-track"
            style={{
              transform: `translate(${Number(activeOffset.x).toFixed(1)}px, ${Number(activeOffset.y).toFixed(1)}px)`,
            }}
          >
            {/* Normal Eye Pills with Natural Blink Animation */}
            <rect className="eye-pill" x="40.5" y="43" width="4.8" height="13.5" rx="2.4" fill="#ffffff" />
            <rect className="eye-pill" x="54.7" y="43" width="4.8" height="13.5" rx="2.4" fill="#ffffff" />

            {/* Happy Eyes (^ ^) on Hover / Intro */}
            <path
              className="eye-happy"
              d="M 38.5 51 Q 42.9 44 47.3 51"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="eye-happy"
              d="M 52.7 51 Q 57.1 44 61.5 51"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Speaking Cheerful Mouth Smile */}
            {isSpeaking && (
              <path
                d="M 44 57 Q 50 63 56 57"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            )}
          </g>
        </svg>
      </span>
    </span>
  );
}
