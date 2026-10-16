import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export function Popover(props: {
  label: string;
  trigger: ComponentChildren;
  triggerClass?: string;
  align?: "start" | "end";
  children: (close: () => void) => ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(function () {
    if (!open) return;
    function handlePointerDown(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return function () {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function close(): void {
    setOpen(false);
    rootRef.current?.querySelector<HTMLElement>(".dm-popover-trigger")?.focus();
  }

  return (
    <div
      ref={rootRef}
      class="dm-popover-root"
      onKeyDown={function (event) {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        type="button"
        class={"dm-popover-trigger " + (props.triggerClass || "dm-ghost-btn")}
        aria-label={props.label}
        title={props.label}
        aria-expanded={open}
        onClick={function (event) {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        {props.trigger}
      </button>
      {open ? (
        <div class={"dm-popover" + (props.align === "start" ? " is-start" : "")}>
          {props.children(close)}
        </div>
      ) : null}
    </div>
  );
}
