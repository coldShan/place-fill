import type { ComponentChildren } from "preact";
import { Icon } from "./icon";

function getLogoUrl(): string {
  const iconAssets = window.ChromeTestDataIconAssets;
  return iconAssets?.getIconAssetUrl ? iconAssets.getIconAssetUrl("app-logo") : "";
}

export function Header(props: { scope: string; children?: ComponentChildren }) {
  return (
    <header class="dm-header">
      <div class="dm-header-brand">
        <img class="dm-header-logo" src={getLogoUrl()} alt="" />
        <h1 class="dm-header-title">数据管理</h1>
        {props.scope ? (
          <>
            <span class="dm-header-divider" aria-hidden="true" />
            <span class="dm-site-chip" title={"当前站点：" + props.scope}>
              <Icon name="globe" />
              <span class="dm-site-chip-text">{props.scope}</span>
            </span>
          </>
        ) : null}
      </div>
      <div class="dm-header-actions">{props.children}</div>
    </header>
  );
}
