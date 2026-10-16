import { Icon } from "./icon";
import { Popover } from "./popover";

export type MenuItem = { icon: string; label: string; danger?: boolean; onSelect: () => void };

export function MoreMenu(props: { label: string; items: MenuItem[] }) {
  return (
    <Popover label={props.label} triggerClass="dm-icon-btn" trigger={<Icon name="ellipsis" />}>
      {function (close) {
        return (
          <div class="dm-menu" role="menu">
            {props.items.map(function (item) {
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  class={"dm-menu-item" + (item.danger ? " is-danger" : "")}
                  onClick={function () {
                    close();
                    item.onSelect();
                  }}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      }}
    </Popover>
  );
}
