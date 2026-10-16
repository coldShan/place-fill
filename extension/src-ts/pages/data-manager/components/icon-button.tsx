import { Icon } from "./icon";

export function IconButton(props: {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: "accent" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      class={"dm-icon-btn" + (props.tone ? " is-" + props.tone : "")}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={function (event) {
        event.stopPropagation();
        props.onClick();
      }}
    >
      <Icon name={props.icon} />
    </button>
  );
}
