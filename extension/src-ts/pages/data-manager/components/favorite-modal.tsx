import { useEffect, useRef, useState } from "preact/hooks";
import { FIELD_KEYS, getFieldLabel, normalizeProfile, type FavoriteEntry, type ProfileFieldMap } from "../page-model";

export function FavoriteModal(props: {
  entry: FavoriteEntry | null;
  onClose: () => void;
  onSubmit: (input: { note: string; profile: ProfileFieldMap }) => void;
}) {
  const [profile, setProfile] = useState<ProfileFieldMap>(normalizeProfile(props.entry?.profile));
  const [note, setNote] = useState(props.entry?.note || "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(function () {
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  return (
    <div class="dm-modal" data-open="true">
      <button type="button" class="dm-modal-backdrop" aria-label="关闭常用数据表单" onClick={props.onClose} />
      <section class="dm-modal-card" role="dialog" aria-modal="true" aria-labelledby="dm-favorite-modal-title">
        <div class="dm-modal-head">
          <div class="dm-modal-copy">
            <h2 id="dm-favorite-modal-title">{props.entry ? "编辑常用数据" : "新增常用数据"}</h2>
            <p class="dm-modal-note">{props.entry ? "保存后将覆盖当前这组常用数据。" : "仅保存当前作用域下的数据。"}</p>
          </div>
          <button type="button" class="dm-icon-btn" aria-label="关闭弹窗" onClick={props.onClose}>关闭</button>
        </div>
        <form
          ref={formRef}
          class="dm-modal-form"
          onSubmit={function (event) {
            event.preventDefault();
            props.onSubmit({ note: note.trim(), profile: normalizeProfile(profile) });
          }}
        >
          <div class="dm-modal-grid">
            {FIELD_KEYS.map(function (fieldKey) {
              return (
                <label class="dm-form-field" key={fieldKey}>
                  <span>{getFieldLabel(fieldKey)}</span>
                  <input
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
            <label class="dm-form-field dm-form-field-wide">
              <span>备注</span>
              <input
                type="text"
                maxLength={120}
                value={note}
                placeholder="填写这组常用数据的备注"
                onInput={function (event) {
                  setNote(event.currentTarget.value);
                }}
              />
            </label>
          </div>
          <div class="dm-modal-actions">
            <button type="button" class="dm-subtle-btn" onClick={props.onClose}>取消</button>
            <button type="submit" class="dm-primary-btn">保存常用数据</button>
          </div>
        </form>
      </section>
    </div>
  );
}
