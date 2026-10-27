import type { Ref } from "preact";
import { Icon } from "./icon";

export function SearchBox(props: {
  value: string;
  inputRef: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label class="dm-search">
      <Icon name="search" class="dm-search-icon" />
      <input
        ref={props.inputRef}
        type="search"
        class="dm-search-input"
        value={props.value}
        placeholder={props.placeholder || "搜索姓名、手机号、身份证…"}
        aria-label={props.label || "搜索数据"}
        onInput={function (event) {
          props.onChange(event.currentTarget.value);
        }}
        onKeyDown={function (event) {
          if (event.key === "Escape" && props.value) {
            event.stopPropagation();
            props.onChange("");
          }
        }}
      />
      {props.value ? (
        <button
          type="button"
          class="dm-search-clear"
          aria-label="清空搜索"
          onClick={function () { props.onChange(""); }}
        >
          <Icon name="x" />
        </button>
      ) : (
        <kbd class="dm-kbd" aria-hidden="true">/</kbd>
      )}
    </label>
  );
}
