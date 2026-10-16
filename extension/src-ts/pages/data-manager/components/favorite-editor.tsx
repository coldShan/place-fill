import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  FIELD_KEYS,
  getFieldLabel,
  isSameProfile,
  normalizeProfile,
  type FavoriteEntry,
  type ProfileFieldKey,
  type ProfileFieldMap
} from "../page-model";
import { DEFAULT_FAVORITE_NAME, getCustomFavoriteName, getFavoriteTitle } from "../lib/display";
import { FIELD_GROUPS } from "../lib/field-groups";
import { getFieldWarning } from "../lib/field-validation";
import { generateFieldValue, generateRandomProfile, getGeneratorsApi } from "../lib/generators";
import { DrawerShell } from "./record-drawer";
import { Icon } from "./icon";

export type FavoriteDraft = { name: string; note: string; profile: ProfileFieldMap };

const NOTE_MAX_LENGTH = 120;
const NAME_MAX_LENGTH = 40;

function createInitialDraft(entry: FavoriteEntry | null): FavoriteDraft {
  return {
    name: entry ? getCustomFavoriteName(entry.name) : "",
    note: entry ? entry.note : "",
    profile: normalizeProfile(entry ? entry.profile : undefined)
  };
}

function isSameDraft(left: FavoriteDraft, right: FavoriteDraft): boolean {
  return left.name.trim() === right.name.trim()
    && left.note.trim() === right.note.trim()
    && isSameProfile(normalizeProfile(left.profile), normalizeProfile(right.profile));
}

export function FavoriteEditor(props: {
  entry: FavoriteEntry | null;
  liveEntry?: FavoriteEntry | null;
  onLoadLatest?: () => void;
  favorites: FavoriteEntry[];
  onCancel: () => void;
  onSave: (draft: FavoriteDraft) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onShowExisting: (id: string) => void;
}) {
  const initialDraft = useMemo(function () {
    return createInitialDraft(props.entry);
  }, [props.entry ? props.entry.id : ""]);
  const [draft, setDraft] = useState<FavoriteDraft>(initialDraft);
  const [duplicate, setDuplicate] = useState<FavoriteEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const generatorsApi = getGeneratorsApi();
  const canGenerate = typeof generatorsApi.generateFieldValue === "function";
  const dirty = !isSameDraft(draft, initialDraft);
  const hasValue = FIELD_KEYS.some(function (fieldKey) {
    return draft.profile[fieldKey].trim() !== "";
  });
  const formId = "dm-favorite-editor";

  useLayoutEffect(function () {
    props.onDirtyChange(dirty);
  }, [dirty]);

  useEffect(function () {
    return function () {
      props.onDirtyChange(false);
    };
  }, []);

  useEffect(function () {
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  useEffect(function () {
    if (duplicate) bannerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [duplicate]);

  useEffect(function () {
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
    document.addEventListener("keydown", handleKeydown);
    return function () {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  function updateDraft(patch: Partial<FavoriteDraft>): void {
    setDuplicate(null);
    setDraft(function (current) {
      return { ...current, ...patch };
    });
  }

  function updateField(fieldKey: ProfileFieldKey, value: string): void {
    setDuplicate(null);
    setDraft(function (current) {
      return { ...current, profile: { ...current.profile, [fieldKey]: value } };
    });
  }

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!hasValue || saving) return;
    const profile = normalizeProfile(Object.fromEntries(FIELD_KEYS.map(function (fieldKey) {
      return [fieldKey, draft.profile[fieldKey].trim()];
    })));
    const existing = props.favorites.find(function (entry) {
      return (!props.entry || entry.id !== props.entry.id) && isSameProfile(entry.profile, profile);
    });
    if (existing) {
      setDuplicate(existing);
      return;
    }
    setSaving(true);
    try {
      await props.onSave({ name: draft.name.trim() || DEFAULT_FAVORITE_NAME, note: draft.note.trim(), profile });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DrawerShell
      eyebrow={props.entry ? "编辑常用数据" : "新增常用数据"}
      title={props.entry ? getFavoriteTitle(props.entry) : "新的常用数据"}
      subtitle={props.entry ? "" : "仅保存到当前站点，格式问题只做提示，不影响保存。"}
      onClose={props.onCancel}
      footer={
        <>
          <span class="dm-drawer-foot-hint">{hasValue ? "⌘/Ctrl + S 保存" : "至少填写一个字段"}</span>
          <span class="dm-drawer-foot-spacer" />
          <button type="button" class="dm-secondary-btn" onClick={props.onCancel}>取消</button>
          <button type="submit" form={formId} class="dm-primary-btn" disabled={!hasValue || saving}>保存</button>
        </>
      }
    >
      <form
        id={formId}
        ref={formRef}
        class="dm-editor"
        onSubmit={function (event) { void handleSubmit(event); }}
      >
        {props.entry && props.liveEntry === null ? (
          <div class="dm-banner is-warning" role="status">
            <Icon name="circle-alert" />
            <span class="dm-banner-text">这组数据已在其他页面被删除，保存后将重新创建。</span>
          </div>
        ) : null}
        {props.entry && props.liveEntry && props.liveEntry.updatedAt !== props.entry.updatedAt ? (
          <div class="dm-banner is-info" role="status">
            <Icon name="circle-alert" />
            <span class="dm-banner-text">这组数据已在其他页面更新，保存将覆盖那次修改。</span>
            {props.onLoadLatest ? (
              <button type="button" class="dm-link-btn" onClick={props.onLoadLatest}>载入最新</button>
            ) : null}
          </div>
        ) : null}
        {duplicate ? (
          <div ref={bannerRef} class="dm-banner is-warning" role="alert">
            <Icon name="circle-alert" />
            <span class="dm-banner-text">已存在相同数据「{getFavoriteTitle(duplicate)}」，未重复保存。</span>
            <button type="button" class="dm-link-btn" onClick={function () { props.onShowExisting(duplicate.id); }}>查看</button>
          </div>
        ) : null}
        <section class="dm-detail-group">
          <h3 class="dm-detail-group-title">基本信息</h3>
          <label class="dm-form-field">
            <span class="dm-form-label">名称</span>
            <input
              class="dm-input"
              type="text"
              maxLength={NAME_MAX_LENGTH}
              value={draft.name}
              placeholder="如：主账号；留空则显示姓名"
              onInput={function (event) { updateDraft({ name: event.currentTarget.value }); }}
            />
          </label>
          <label class="dm-form-field">
            <span class="dm-form-label">备注</span>
            <textarea
              class="dm-input dm-textarea"
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              value={draft.note}
              placeholder="记录这组数据的用途"
              onInput={function (event) { updateDraft({ note: event.currentTarget.value }); }}
            />
          </label>
        </section>
        <div class="dm-editor-tools">
          <span class="dm-detail-group-title">字段</span>
          {canGenerate ? (
            <button
              type="button"
              class="dm-ghost-btn is-small"
              onClick={function () {
                updateDraft({ profile: generateRandomProfile(generatorsApi) });
              }}
            >
              <Icon name="dices" />
              整组随机生成
            </button>
          ) : null}
        </div>
        {FIELD_GROUPS.map(function (group) {
          return (
            <section class="dm-detail-group is-compact" key={group.title}>
              <h3 class="dm-detail-group-title">{group.title}</h3>
              {group.fields.map(function (fieldKey) {
                const value = draft.profile[fieldKey];
                const warning = getFieldWarning(fieldKey, value, generatorsApi);
                const warningId = "dm-warning-" + fieldKey;
                return (
                  <div class="dm-form-field" key={fieldKey}>
                    <label class="dm-form-label" for={"dm-field-" + fieldKey}>{getFieldLabel(fieldKey)}</label>
                    <div class="dm-input-group">
                      <input
                        id={"dm-field-" + fieldKey}
                        class={"dm-input" + (warning ? " is-warning" : "")}
                        type="text"
                        value={value}
                        placeholder={"填写" + getFieldLabel(fieldKey)}
                        aria-describedby={warning ? warningId : undefined}
                        onInput={function (event) { updateField(fieldKey, event.currentTarget.value); }}
                      />
                      {canGenerate ? (
                        <button
                          type="button"
                          class="dm-input-addon"
                          aria-label={"随机生成" + getFieldLabel(fieldKey)}
                          title={"随机生成" + getFieldLabel(fieldKey)}
                          onClick={function () { updateField(fieldKey, generateFieldValue(fieldKey, generatorsApi)); }}
                        >
                          <Icon name="dices" />
                        </button>
                      ) : null}
                    </div>
                    {warning ? (
                      <span id={warningId} class="dm-field-warning">
                        <Icon name="circle-alert" />
                        {warning}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </section>
          );
        })}
      </form>
    </DrawerShell>
  );
}
