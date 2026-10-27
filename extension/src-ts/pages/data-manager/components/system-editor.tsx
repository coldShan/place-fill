import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { SystemProfile } from "../../../shared/system-scope";
import {
  createBlankEnvironmentDraft,
  createSystemDraft,
  isSameSystemDraft,
  validateSystemDraft,
  type EnvironmentDraft,
  type SystemDraft
} from "../lib/systems";
import { DrawerShell } from "./record-drawer";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";

const NAME_MAX_LENGTH = 40;

export function SystemEditor(props: {
  entry: SystemProfile | null;
  liveEntry?: SystemProfile | null;
  onLoadLatest?: () => void;
  onCancel: () => void;
  onSave: (draft: SystemDraft) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  notice?: ComponentChildren;
}) {
  const initialDraft = useMemo(function () {
    return createSystemDraft(props.entry);
  }, [props.entry ? props.entry.id + ":" + props.entry.updatedAt : ""]);
  const [draft, setDraft] = useState<SystemDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = !isSameSystemDraft(draft, initialDraft);
  const problem = validateSystemDraft(draft);
  const formId = "dm-system-editor";

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

  function updateTitles(update: (titles: string[]) => string[]): void {
    setDraft(function (current) {
      return { ...current, titles: update(current.titles) };
    });
  }

  function updateEnvironment(index: number, patch: Partial<EnvironmentDraft>): void {
    setDraft(function (current) {
      return {
        ...current,
        environments: current.environments.map(function (environment, position) {
          return position === index ? { ...environment, ...patch } : environment;
        })
      };
    });
  }

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (problem || saving) return;
    setSaving(true);
    try {
      await props.onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DrawerShell
      eyebrow={props.entry ? "编辑系统" : "新增系统"}
      title={props.entry ? props.entry.name || "未命名系统" : "新的系统"}
      subtitle={props.entry ? "ID " + props.entry.id : "填写名称和至少一条环境记录；保存后页面按环境匹配到该系统。"}
      onClose={props.onCancel}
      footer={
        <>
          <span class="dm-drawer-foot-hint">{problem || "⌘/Ctrl + S 保存"}</span>
          <span class="dm-drawer-foot-spacer" />
          <button type="button" class="dm-secondary-btn" onClick={props.onCancel}>取消</button>
          <button type="submit" form={formId} class="dm-primary-btn" disabled={!!problem || saving}>保存</button>
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
            <span class="dm-banner-text">这个系统已在其他页面被删除，保存后将重新创建。</span>
          </div>
        ) : null}
        {props.entry && props.liveEntry && props.liveEntry.updatedAt !== props.entry.updatedAt ? (
          <div class="dm-banner is-info" role="status">
            <Icon name="circle-alert" />
            <span class="dm-banner-text">这个系统已在其他页面更新，保存将覆盖那次修改。</span>
            {props.onLoadLatest ? (
              <button type="button" class="dm-link-btn" onClick={props.onLoadLatest}>载入最新</button>
            ) : null}
          </div>
        ) : null}
        {props.notice}
        <section class="dm-detail-group">
          <h3 class="dm-detail-group-title">基本信息</h3>
          <label class="dm-form-field">
            <span class="dm-form-label">名称</span>
            <input
              class="dm-input"
              type="text"
              maxLength={NAME_MAX_LENGTH}
              value={draft.name}
              placeholder="如：客户管理系统"
              onInput={function (event) {
                const value = event.currentTarget.value;
                setDraft(function (current) { return { ...current, name: value }; });
              }}
            />
          </label>
        </section>
        <section class="dm-detail-group is-compact">
          <h3 class="dm-detail-group-title">标题关键词</h3>
          <p class="dm-form-hint">页面标题包含任一关键词时归入该系统。「Vite App」等通用标题不能作为关键词。</p>
          {draft.titles.map(function (title, index) {
            return (
              <div class="dm-row-field" key={index}>
                <input
                  class="dm-input"
                  type="text"
                  value={title}
                  placeholder="如：客户管理"
                  aria-label={"标题关键词 " + (index + 1)}
                  onInput={function (event) {
                    const value = event.currentTarget.value;
                    updateTitles(function (titles) {
                      return titles.map(function (item, position) { return position === index ? value : item; });
                    });
                  }}
                />
                <IconButton
                  icon="x"
                  label="删除关键词"
                  onClick={function () {
                    updateTitles(function (titles) {
                      return titles.filter(function (_item, position) { return position !== index; });
                    });
                  }}
                />
              </div>
            );
          })}
          <div>
            <button
              type="button"
              class="dm-ghost-btn is-small"
              onClick={function () { updateTitles(function (titles) { return titles.concat(""); }); }}
            >
              <Icon name="plus" />
              添加关键词
            </button>
          </div>
        </section>
        <section class="dm-detail-group is-compact">
          <h3 class="dm-detail-group-title">环境</h3>
          {draft.environments.map(function (environment, index) {
            const prefix = "dm-env-" + index;
            return (
              <div class="dm-env-card" key={index} data-env-index={index}>
                <div class="dm-env-card-head">
                  <span class="dm-env-card-title">
                    环境 {index + 1}
                    {environment.autoAdded ? <span class="dm-badge">自动</span> : null}
                  </span>
                  <IconButton
                    icon="trash-2"
                    label={"删除环境 " + (index + 1)}
                    tone="danger"
                    onClick={function () {
                      setDraft(function (current) {
                        return {
                          ...current,
                          environments: current.environments.filter(function (_item, position) { return position !== index; })
                        };
                      });
                    }}
                  />
                </div>
                <div class="dm-env-grid">
                  <div class="dm-form-field">
                    <label class="dm-form-label" for={prefix + "-host"}>hostname</label>
                    <input
                      id={prefix + "-host"}
                      class="dm-input"
                      type="text"
                      value={environment.hostname}
                      placeholder="如：localhost 或 test.example.com"
                      onInput={function (event) { updateEnvironment(index, { hostname: event.currentTarget.value }); }}
                    />
                  </div>
                  <div class="dm-form-field">
                    <label class="dm-form-label" for={prefix + "-port"}>端口</label>
                    <input
                      id={prefix + "-port"}
                      class="dm-input"
                      type="text"
                      inputMode="numeric"
                      value={environment.port}
                      placeholder="可留空"
                      onInput={function (event) { updateEnvironment(index, { port: event.currentTarget.value }); }}
                    />
                  </div>
                  <div class="dm-form-field is-wide">
                    <label class="dm-form-label" for={prefix + "-path"}>末端 path（可选）</label>
                    <input
                      id={prefix + "-path"}
                      class="dm-input"
                      type="text"
                      value={environment.lastPath}
                      placeholder="URL 路径的最后一段，如 login；留空则不参与匹配"
                      onInput={function (event) { updateEnvironment(index, { lastPath: event.currentTarget.value }); }}
                    />
                  </div>
                </div>
                <div class="dm-form-field">
                  <span class="dm-form-label">标识参数（可选）</span>
                  {environment.query.map(function (row, rowIndex) {
                    return (
                      <div class="dm-query-row" key={rowIndex}>
                        <input
                          class="dm-input"
                          type="text"
                          value={row.key}
                          placeholder="参数名"
                          aria-label={"环境 " + (index + 1) + " 参数名 " + (rowIndex + 1)}
                          onInput={function (event) {
                            const value = event.currentTarget.value;
                            updateEnvironment(index, {
                              query: environment.query.map(function (item, position) {
                                return position === rowIndex ? { ...item, key: value } : item;
                              })
                            });
                          }}
                        />
                        <span class="dm-query-equals" aria-hidden="true">=</span>
                        <input
                          class="dm-input"
                          type="text"
                          value={row.value}
                          placeholder="值"
                          aria-label={"环境 " + (index + 1) + " 参数值 " + (rowIndex + 1)}
                          onInput={function (event) {
                            const value = event.currentTarget.value;
                            updateEnvironment(index, {
                              query: environment.query.map(function (item, position) {
                                return position === rowIndex ? { ...item, value } : item;
                              })
                            });
                          }}
                        />
                        <IconButton
                          icon="x"
                          label="删除参数"
                          onClick={function () {
                            updateEnvironment(index, {
                              query: environment.query.filter(function (_item, position) { return position !== rowIndex; })
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                  <div>
                    <button
                      type="button"
                      class="dm-ghost-btn is-small"
                      onClick={function () {
                        updateEnvironment(index, { query: environment.query.concat({ key: "", value: "" }) });
                      }}
                    >
                      <Icon name="plus" />
                      添加参数
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div>
            <button
              type="button"
              class="dm-ghost-btn is-small"
              onClick={function () {
                setDraft(function (current) {
                  return { ...current, environments: current.environments.concat(createBlankEnvironmentDraft()) };
                });
              }}
            >
              <Icon name="plus" />
              添加环境
            </button>
          </div>
        </section>
      </form>
    </DrawerShell>
  );
}
