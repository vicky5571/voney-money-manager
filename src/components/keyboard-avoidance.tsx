"use client";

import { useEffect } from "react";

const KEYBOARD_THRESHOLD = 80;
const FOCUS_PADDING = 16;

function findScrollParent(start: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY);
    if (canScroll && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

function findFixedAncestor(start: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node && node !== document.body) {
    if (getComputedStyle(node).position === "fixed") return node;
    node = node.parentElement;
  }
  return null;
}

export function KeyboardAvoidance() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;
    let shiftedOverlay: HTMLElement | null = null;
    let savedTransform = "";

    const restoreShift = () => {
      if (shiftedOverlay) {
        shiftedOverlay.style.transform = savedTransform;
        shiftedOverlay = null;
        savedTransform = "";
      }
    };

    const ensureVisible = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const keyboardHeight = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop,
        );

        document.documentElement.style.setProperty(
          "--kb-height",
          `${Math.round(keyboardHeight)}px`,
        );
        document.documentElement.dataset.keyboard =
          keyboardHeight > KEYBOARD_THRESHOLD ? "open" : "closed";

        if (keyboardHeight <= KEYBOARD_THRESHOLD) {
          restoreShift();
          return;
        }

        const active = document.activeElement;
        const isField =
          active instanceof HTMLElement &&
          active.matches(
            "input, textarea, select, [contenteditable='true']",
          );

        if (!isField || !(active instanceof HTMLElement)) {
          restoreShift();
          return;
        }

        // Start from unshifted geometry so measurements reflect the
        // natural layout, not the previous frame's adjustment.
        restoreShift();

        const field = active as HTMLElement;
        let rect = field.getBoundingClientRect();
        const visibleBottom = vv.height + vv.offsetTop - FOCUS_PADDING;

        // Step 1: if covered, scroll the nearest scrollable ancestor
        // (covers page scroll via <main> and bottom-sheet inner scroll).
        if (rect.bottom > visibleBottom) {
          const scroller = findScrollParent(field);
          if (scroller) {
            const delta = rect.bottom - visibleBottom;
            // Clamp to available scroll range.
            scroller.scrollTop = Math.min(
              scroller.scrollHeight - scroller.clientHeight,
              scroller.scrollTop + delta,
            );
            // Re-measure after scrolling — may now be visible.
            rect = field.getBoundingClientRect();
          } else if (
            document.scrollingElement &&
            document.scrollingElement.scrollHeight >
              document.scrollingElement.clientHeight
          ) {
            // Fallback for page-level scroll when no overflow: auto ancestor
            // is found (rare for this app, but handles auth pages).
            const delta = rect.bottom - visibleBottom;
            window.scrollBy({ top: delta, behavior: "auto" });
            rect = field.getBoundingClientRect();
          }
        }

        // Step 2: still covered → the field is inside a fixed overlay
        // (every modal/sheet in this app uses `fixed inset-0`). Shift
        // the whole overlay up so the field clears the keyboard.
        if (rect.bottom > visibleBottom) {
          const overlay = findFixedAncestor(field);
          if (overlay) {
            const delta = rect.bottom - visibleBottom;
            savedTransform = overlay.style.transform;
            // Preserve any existing transform (framer-motion animates the
            // *card* child, not the overlay, so the overlay normally has
            // no inline transform — safe to replace).
            overlay.style.transform = savedTransform
              ? `${savedTransform} translateY(${-delta}px)`
              : `translateY(${-delta}px)`;
            shiftedOverlay = overlay;
          }
        }
      });
    };

    vv.addEventListener("resize", ensureVisible);
    vv.addEventListener("scroll", ensureVisible);
    window.addEventListener("focusin", ensureVisible);

    // Also run once on mount in case keyboard is already open
    // (e.g., re-focus after navigation).
    ensureVisible();

    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", ensureVisible);
      vv.removeEventListener("scroll", ensureVisible);
      window.removeEventListener("focusin", ensureVisible);
      restoreShift();
      document.documentElement.style.removeProperty("--kb-height");
      delete document.documentElement.dataset.keyboard;
    };
  }, []);

  return null;
}
