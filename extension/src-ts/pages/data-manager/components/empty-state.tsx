import type { ComponentChildren } from "preact";
import { Icon } from "./icon";

export function EmptyState(props: { icon: string; title: string; description: string; children?: ComponentChildren }) {
  return (
    <section class="dm-empty-state">
      <span class="dm-empty-icon">
        <Icon name={props.icon} />
      </span>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
      {props.children}
    </section>
  );
}
