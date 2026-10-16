import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

type Position = { top: number; left: number };

const VIEWPORT_MARGIN = 8;

export function Popover(props: {
  label: string;
  trigger: ComponentChildren;
  triggerClass?: string;
  children: (close: () => void) => ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(function () {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const top = spaceBelow < panelRect.height + VIEWPORT_MARGIN && triggerRect.top > panelRect.height + VIEWPORT_MARGIN
      ? triggerRect.top - panelRect.height - 6
      : triggerRect.bottom + 6;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(triggerRect.right - panelRect.width, window.innerWidth - panelRect.width - VIEWPORT_MARGIN));
    setPosition({ top, left });
  }, [open]);

  useEffect(function () {
    if (!open) return;
    function handlePointerDown(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleViewportChange(event: Event): void {
      if (panelRef.current && event.target instanceof Node && panelRef.current.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);
    return function () {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      class="dm-popover-root"
      onClick={function (event) { event.stopPropagation(); }}
      onKeyDown={function (event) {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        class={props.triggerClass || "dm-ghost-btn"}
        aria-label={props.label}
        title={props.label}
        aria-expanded={open}
        onClick={function () { setOpen(!open); }}
      >
        {props.trigger}
      </button>
      {open ? (
        <div
          ref={panelRef}
          class="dm-popover"
          style={position ? { top: position.top + "px", left: position.left + "px" } : { visibility: "hidden" }}
        >
          {props.children(close)}
        </div>
      ) : null}
    </div>
  );
}
