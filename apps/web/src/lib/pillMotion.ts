import gsap from "gsap";

export interface PillEdges {
  t: number;
  r: number;
  b: number;
  l: number;
}

const pillStateByFill = new WeakMap<HTMLElement, PillEdges>();

export function getEdges(container: HTMLElement, btn: HTMLElement): PillEdges {
  return {
    t: btn.offsetTop,
    l: btn.offsetLeft,
    r: Math.max(0, container.offsetWidth - (btn.offsetLeft + btn.offsetWidth)),
    b: Math.max(0, container.offsetHeight - (btn.offsetTop + btn.offsetHeight)),
  };
}

/**
 * Dual-timing clip-path pill animation matching AgriSense Fusion header motion:
 * leading edge stretches ahead smoothly while the trailing edge catches up.
 */
export function slideFill(
  fill: HTMLElement | null,
  to: PillEdges | null,
  immediate = false,
  axis: "horizontal" | "vertical" = "horizontal",
  radius = "9999px"
): void {
  if (!fill || !to) return;

  const clip = (e: PillEdges) => `inset(${e.t}px ${e.r}px ${e.b}px ${e.l}px round ${radius})`;
  let state = pillStateByFill.get(fill);

  if (!state || immediate) {
    if (state) gsap.killTweensOf(state);
    state = { ...to };
    pillStateByFill.set(fill, state);
    gsap.set(fill, { clipPath: clip(state) });
    return;
  }

  const paint = () => {
    if (state) gsap.set(fill, { clipPath: clip(state) });
  };
  gsap.killTweensOf(state);

  if (axis === "vertical") {
    const down = to.t > state.t;
    const [lead, trail] = down ? (["b", "t"] as const) : (["t", "b"] as const);
    gsap.to(state, { [lead]: to[lead], duration: 0.32, ease: "power3.out", onUpdate: paint });
    gsap.to(state, { [trail]: to[trail], duration: 0.52, ease: "power2.inOut", onUpdate: paint });
    gsap.to(state, { l: to.l, r: to.r, duration: 0.32, ease: "power2.out", onUpdate: paint });
    return;
  }

  const fwd = to.l > state.l;
  const [lead, trail] = fwd ? (["r", "l"] as const) : (["l", "r"] as const);
  gsap.to(state, { [lead]: to[lead], duration: 0.34, ease: "power3.out", onUpdate: paint });
  gsap.to(state, { [trail]: to[trail], duration: 0.54, ease: "power2.inOut", onUpdate: paint });
  gsap.to(state, { t: to.t, b: to.b, duration: 0.34, ease: "power2.out", onUpdate: paint });
}
