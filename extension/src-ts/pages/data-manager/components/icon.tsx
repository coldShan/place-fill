type IconAssetsApi = {
  getIconAssetUrl?: (name: string) => string;
};

declare global {
  interface Window {
    ChromeTestDataIconAssets?: IconAssetsApi;
  }
}

export function Icon(props: { name: string; class?: string }) {
  const iconAssets = typeof window !== "undefined" ? window.ChromeTestDataIconAssets : undefined;
  const url = iconAssets?.getIconAssetUrl ? iconAssets.getIconAssetUrl(props.name) : "";
  return (
    <span
      class={"dm-icon" + (props.class ? " " + props.class : "")}
      data-icon={props.name}
      aria-hidden="true"
      style={{ "--ctdp-icon-url": 'url("' + url + '")' }}
    />
  );
}
