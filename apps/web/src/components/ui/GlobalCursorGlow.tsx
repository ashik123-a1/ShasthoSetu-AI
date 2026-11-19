import { useEffect, useRef, useState } from "react";
import { usePreferences } from "../../lib/preferences";

const CARD_SELECTOR = ".ss-sapphire-card, .ss-card, .ss-glow-card, [data-glow-card]";
const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], [role="tab"], input, select, textarea, summary, .ss-sapphire-card, .ss-card, .ss-glow-card, [data-glow-card]';
const NO_TILT_SELECTOR = '[data-no-tilt], [role="dialog"], [role="alert"], [data-testid="ui-data-table"]';

const AURORA_HALF = 230; // 460px / 2
const CORE_HALF = 90; // 180px / 2

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function resetCardTilt(card: HTMLElement | null) {
  if (!card) return;
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
}

/**
 * Global zero-rerender cursor spotlight and delegated card spotlight / micro-tilt tracker.
 * Automatically disables on touch devices (`pointer: coarse`) and when motion is paused or reduced.
 */
export function GlobalCursorGlow() {
  const { motionPaused, theme } = usePreferences();
  const [pointerEligible, setPointerEligible] = useState(false);

  const auroraRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setPointerEligible(false);
      return;
    }

    const fineMq = window.matchMedia("(any-pointer: fine)");

    const update = () => {
      setPointerEligible(fineMq.matches && !motionPaused);
    };
    update();

    fineMq.addEventListener("change", update);
    return () => {
      fineMq.removeEventListener("change", update);
    };
  }, [motionPaused]);

  useEffect(() => {
    if (!pointerEligible || typeof document === "undefined") {
      return;
    }

    const auroraEl = auroraRef.current;
    const coreEl = coreRef.current;
    const root = document.documentElement;

    let rafId = 0;
    let visible = false;
    let targetX = -999;
    let targetY = -999;
    let outerX = -999;
    let outerY = -999;
    let innerX = -999;
    let innerY = -999;
    let currentScale = 1;
    let targetScale = 1;

    let scrollTimer = 0;
    let lastScreenX = -1;
    let lastScreenY = -1;
    let activeCard: HTMLElement | null = null;
    let cardRaf = 0;
    let pendingCardMove: { el: HTMLElement; clientX: number; clientY: number } | null = null;

    const applyDarkSurfaceClass = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      const onSapphireAlways =
        Boolean(el?.closest(".ss-sapphire-always")) || Boolean(document.querySelector(".ss-sapphire-always"));
      const isDark = theme === "dark" || onSapphireAlways;
      auroraEl?.classList.toggle("ss-cursor-on-dark", isDark);
      coreEl?.classList.toggle("ss-cursor-on-dark", isDark);
    };

    applyDarkSurfaceClass(null);

    const setVisibility = (nextVisible: boolean) => {
      if (visible === nextVisible) return;
      visible = nextVisible;
      if (auroraEl) auroraEl.style.opacity = nextVisible ? "1" : "0";
      if (coreEl) coreEl.style.opacity = nextVisible ? "1" : "0";
    };

    const tickGlow = () => {
      rafId = 0;
      if (!visible) return;

      outerX += (targetX - outerX) * 0.13;
      outerY += (targetY - outerY) * 0.13;
      innerX += (targetX - innerX) * 0.30;
      innerY += (targetY - innerY) * 0.30;
      currentScale += (targetScale - currentScale) * 0.18;

      if (auroraEl) {
        auroraEl.style.transform = `translate3d(${(outerX - AURORA_HALF).toFixed(1)}px, ${(outerY - AURORA_HALF).toFixed(1)}px, 0)`;
      }
      if (coreEl) {
        coreEl.style.transform = `translate3d(${(innerX - CORE_HALF).toFixed(1)}px, ${(innerY - CORE_HALF).toFixed(1)}px, 0) scale(${currentScale.toFixed(3)})`;
      }

      const deltaOuter = Math.abs(targetX - outerX) + Math.abs(targetY - outerY);
      const deltaInner = Math.abs(targetX - innerX) + Math.abs(targetY - innerY);
      const deltaScale = Math.abs(targetScale - currentScale);

      if (deltaOuter > 0.4 || deltaInner > 0.4 || deltaScale > 0.01) {
        rafId = window.requestAnimationFrame(tickGlow);
      }
    };

    const scheduleGlowFrame = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(tickGlow);
      }
    };

    const clearScrollFlag = () => {
      window.clearTimeout(scrollTimer);
      root.classList.remove("is-scrolling");
    };

    const onScroll = () => {
      if (!root.classList.contains("is-scrolling")) {
        root.classList.add("is-scrolling");
      }
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(clearScrollFlag, 80);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;

      if (
        Math.abs(e.screenX - lastScreenX) + Math.abs(e.screenY - lastScreenY) > 2 &&
        root.classList.contains("is-scrolling")
      ) {
        clearScrollFlag();
      }
      lastScreenX = e.screenX;
      lastScreenY = e.screenY;

      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        outerX = targetX;
        outerY = targetY;
        innerX = targetX;
        innerY = targetY;
      }

      applyDarkSurfaceClass(e.target);

      const targetEl = e.target instanceof Element ? e.target : null;
      targetScale = targetEl?.closest(INTERACTIVE_SELECTOR) ? 1.24 : 1;

      setVisibility(true);
      scheduleGlowFrame();

      const cardEl = (targetEl?.closest(CARD_SELECTOR) as HTMLElement | null) ?? null;
      if (activeCard && activeCard !== cardEl) {
        resetCardTilt(activeCard);
      }
      activeCard = cardEl;

      if (!cardEl) return;

      pendingCardMove = { el: cardEl, clientX: e.clientX, clientY: e.clientY };
      if (!cardRaf) {
        cardRaf = window.requestAnimationFrame(() => {
          cardRaf = 0;
          const job = pendingCardMove;
          pendingCardMove = null;
          if (!job) return;

          const { el, clientX, clientY } = job;
          const rect = el.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          el.style.setProperty("--mx", `${x.toFixed(1)}px`);
          el.style.setProperty("--my", `${y.toFixed(1)}px`);

          const allowTilt =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.width <= 760 &&
            rect.height <= 680 &&
            !el.matches(NO_TILT_SELECTOR);

          if (allowTilt) {
            const nx = clampUnit((x - rect.width / 2) / Math.max(1, rect.width / 2));
            const ny = clampUnit((y - rect.height / 2) / Math.max(1, rect.height / 2));
            el.style.setProperty("--rx", `${(-ny * 2.8).toFixed(2)}deg`);
            el.style.setProperty("--ry", `${(nx * 2.8).toFixed(2)}deg`);
          } else {
            resetCardTilt(el);
          }
        });
      }
    };

    const onPointerOut = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const targetEl = e.target instanceof Element ? e.target : null;
      const cardEl = (targetEl?.closest(CARD_SELECTOR) as HTMLElement | null) ?? null;
      if (!cardEl) return;

      const nextTarget = e.relatedTarget instanceof Node ? e.relatedTarget : null;
      if (!cardEl.contains(nextTarget)) {
        resetCardTilt(cardEl);
        if (activeCard === cardEl) {
          activeCard = null;
        }
      }
    };

    const onLeaveViewport = () => {
      setVisibility(false);
      resetCardTilt(activeCard);
      activeCard = null;
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("mouseleave", onLeaveViewport);
    window.addEventListener("blur", onLeaveViewport);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("mouseleave", onLeaveViewport);
      window.removeEventListener("blur", onLeaveViewport);
      window.removeEventListener("scroll", onScroll);
      clearScrollFlag();
      resetCardTilt(activeCard);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (cardRaf) window.cancelAnimationFrame(cardRaf);
    };
  }, [pointerEligible, theme]);

  if (!pointerEligible) {
    return null;
  }

  return (
    <>
      <div
        ref={auroraRef}
        aria-hidden="true"
        className={`ss-cursor-aurora ${theme === "dark" ? "ss-cursor-on-dark" : ""}`}
      />
      <div
        ref={coreRef}
        aria-hidden="true"
        className={`ss-cursor-core ${theme === "dark" ? "ss-cursor-on-dark" : ""}`}
      />
    </>
  );
}
