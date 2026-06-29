"use client";

import { useEffect } from "react";

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Udskyd luk-lytterne ét tick, så det højreklik der ÅBNEDE menuen ikke
    // selv lukker den igen med det samme.
    const t = setTimeout(() => {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      window.addEventListener("scroll", close, true);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-50 min-w-[190px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => {
            onClose();
            it.onClick();
          }}
          className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
            it.danger ? "text-red-600" : "text-neutral-700"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
