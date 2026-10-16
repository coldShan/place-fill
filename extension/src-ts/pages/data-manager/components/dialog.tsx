import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

export function Dialog(props: {
  title: string;
  description?: string;
  wide?: boolean;
  onClose: () => void;
  footer?: ComponentChildren;
  children?: ComponentChildren;
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(function () {
    const previousFocus = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusTarget = node?.querySelector<HTMLElement>("[data-autofocus]") || node?.querySelector<HTMLElement>("input, button");
    focusTarget?.focus();
    return function () {
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, []);

  return (
    <div
      class="dm-dialog-layer"
      onKeyDown={function (event) {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        props.onClose();
      }}
    >
      <button type="button" class="dm-dialog-backdrop" tabIndex={-1} aria-label="关闭" onClick={props.onClose} />
      <section
        ref={dialogRef}
        class={"dm-dialog" + (props.wide ? " is-wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
      >
        <header class="dm-dialog-head">
          <div>
            <h2 class="dm-dialog-title">{props.title}</h2>
            {props.description ? <p class="dm-dialog-desc">{props.description}</p> : null}
          </div>
        </header>
        {props.children ? <div class="dm-dialog-body">{props.children}</div> : null}
        {props.footer ? <footer class="dm-dialog-foot">{props.footer}</footer> : null}
      </section>
    </div>
  );
}
