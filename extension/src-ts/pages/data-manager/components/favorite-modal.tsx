import { useState } from "preact/hooks";
import { FIELD_KEYS, getFieldLabel, normalizeProfile, type FavoriteEntry, type ProfileFieldMap } from "../page-model";
import { Dialog } from "./dialog";

export function FavoriteModal(props: {
  entry: FavoriteEntry | null;
  onClose: () => void;
  onSubmit: (input: { note: string; profile: ProfileFieldMap }) => void;
}) {
  const [profile, setProfile] = useState<ProfileFieldMap>(normalizeProfile(props.entry?.profile));
  const [note, setNote] = useState(props.entry?.note || "");
  const formId = "dm-favorite-form";

  return (
    <Dialog
      wide
      title={props.entry ? "编辑常用数据" : "新增常用数据"}
      description={props.entry ? "保存后将覆盖当前这组常用数据。" : "仅保存到当前站点。"}
      onClose={props.onClose}
      footer={
        <>
          <button type="button" class="dm-secondary-btn" onClick={props.onClose}>取消</button>
          <button type="submit" form={formId} class="dm-primary-btn">保存</button>
        </>
      }
    >
      <form
        id={formId}
        class="dm-form-grid"
        onSubmit={function (event) {
          event.preventDefault();
          props.onSubmit({ note: note.trim(), profile: normalizeProfile(profile) });
        }}
      >
        {FIELD_KEYS.map(function (fieldKey) {
          return (
            <label class="dm-form-field" key={fieldKey}>
              <span class="dm-form-label">{getFieldLabel(fieldKey)}</span>
              <input
                class="dm-input"
                type="text"
                value={profile[fieldKey]}
                placeholder={"填写" + getFieldLabel(fieldKey)}
                onInput={function (event) {
                  const value = event.currentTarget.value;
                  setProfile(function (current) {
                    return { ...current, [fieldKey]: value };
                  });
                }}
              />
            </label>
          );
        })}
        <label class="dm-form-field is-wide">
          <span class="dm-form-label">备注</span>
          <input
            class="dm-input"
            type="text"
            maxLength={120}
            value={note}
            placeholder="填写这组常用数据的备注"
            onInput={function (event) {
              setNote(event.currentTarget.value);
            }}
          />
        </label>
      </form>
    </Dialog>
  );
}
