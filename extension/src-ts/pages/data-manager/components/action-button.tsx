import { Icon } from "./icon";

export function ActionButton(props: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      class={"dm-table-btn" + (props.danger ? " is-danger" : "")}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={function (event) {
        event.stopPropagation();
        props.onClick();
      }}
    >
      <Icon name={props.icon} class="dm-action-icon" />
      <span class="dm-action-label">{props.label}</span>
    </button>
  );
}
