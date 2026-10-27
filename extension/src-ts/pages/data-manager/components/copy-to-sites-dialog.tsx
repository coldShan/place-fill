import { useEffect, useState } from "preact/hooks";
import { listScopeSummaries, type ScopeSummary } from "../page-model";
import { parseScopeKey, type SystemProfile } from "../../../shared/system-scope";
import { parseScopeInput } from "../lib/scope-input";
import { formatScopeLabel } from "../lib/scope-label";
import { Dialog } from "./dialog";
import { Icon } from "./icon";

const TARGET_KIND_ORDER = ["system", "host", "file"];

/** Legacy groups only hold un-migrated data; they are never a copy target. */
function isCopyTarget(scope: string): boolean {
  const parsed = parseScopeKey(scope);
  return !parsed || parsed.kind !== "legacy";
}

function compareTargets(left: ScopeSummary, right: ScopeSummary): number {
  const leftKind = TARGET_KIND_ORDER.indexOf(parseScopeKey(left.scope)?.kind || "host");
  const rightKind = TARGET_KIND_ORDER.indexOf(parseScopeKey(right.scope)?.kind || "host");
  return leftKind - rightKind;
}

export function CopyToSitesDialog(props: {
  scope: string;
  systems: SystemProfile[];
  title: string;
  onClose: () => void;
  onConfirm: (targetScopes: string[]) => Promise<void>;
}) {
  const [sites, setSites] = useState<ScopeSummary[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(function () {
    void listScopeSummaries().then(function (summaries) {
      setSites(
        summaries
          .filter(function (summary) { return summary.scope !== props.scope && isCopyTarget(summary.scope); })
          .sort(compareTargets)
      );
    }, function () {
      setSites([]);
    });
  }, [props.scope]);

  const keyword = filter.trim().toLowerCase();
  const visibleSites = (sites || []).filter(function (site) {
    return !keyword
      || site.scope.includes(keyword)
      || formatScopeLabel(site.scope, props.systems).toLowerCase().includes(keyword);
  });

  function toggle(scope: string): void {
    setSelected(function (current) {
      return current.includes(scope)
        ? current.filter(function (item) { return item !== scope; })
        : current.concat(scope);
    });
  }

  function addManualSite(): void {
    const parsed = parseScopeInput(manualInput, props.scope);
    if (parsed.error) {
      setManualError(parsed.error);
      return;
    }
    setSites(function (current) {
      const list = current || [];
      return list.some(function (site) { return site.scope === parsed.scope; })
        ? list
        : list.concat({ favorites: 0, history: 0, scope: parsed.scope });
    });
    setSelected(function (current) {
      return current.includes(parsed.scope) ? current : current.concat(parsed.scope);
    });
    setFilter("");
    setManualInput("");
    setManualError("");
  }

  async function submit(): Promise<void> {
    if (!selected.length || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title={"复制「" + props.title + "」到其他站点"}
      description="将写入目标站点的常用数据；目标站点已有相同数据时会跳过。"
      onClose={props.onClose}
      footer={
        <>
          <button type="button" class="dm-secondary-btn" onClick={props.onClose}>取消</button>
          <button
            type="button"
            class="dm-primary-btn"
            disabled={!selected.length || submitting}
            onClick={function () { void submit(); }}
          >
            {selected.length ? "复制到 " + selected.length + " 个站点" : "选择目标站点"}
          </button>
        </>
      }
    >
      <div class="dm-site-picker">
        <label class="dm-search is-block">
          <Icon name="search" class="dm-search-icon" />
          <input
            type="search"
            class="dm-search-input"
            value={filter}
            placeholder="筛选站点"
            aria-label="筛选站点"
            onInput={function (event) { setFilter(event.currentTarget.value); }}
          />
        </label>
        <div class="dm-site-list" role="group" aria-label="目标站点">
          {sites === null ? <p class="dm-site-empty">正在读取站点…</p> : null}
          {sites !== null && !visibleSites.length ? (
            <p class="dm-site-empty">{sites.length ? "没有匹配的站点" : "还没有其他站点的数据，可在下方手动添加。"}</p>
          ) : null}
          {visibleSites.map(function (site) {
            const checked = selected.includes(site.scope);
            return (
              <label key={site.scope} class={"dm-site-option" + (checked ? " is-checked" : "")}>
                <input type="checkbox" checked={checked} onChange={function () { toggle(site.scope); }} />
                <span class="dm-site-option-name" title={site.scope}>{formatScopeLabel(site.scope, props.systems)}</span>
                <span class="dm-site-option-meta">常用 {site.favorites} · 记录 {site.history}</span>
              </label>
            );
          })}
        </div>
        <div class="dm-form-field">
          <span class="dm-form-label">其他站点</span>
          <div class="dm-inline-form">
            <input
              class={"dm-input" + (manualError ? " is-warning" : "")}
              type="text"
              value={manualInput}
              placeholder="输入域名或粘贴网址"
              aria-label="输入其他站点"
              aria-describedby={manualError ? "dm-manual-site-error" : undefined}
              onInput={function (event) {
                setManualInput(event.currentTarget.value);
                setManualError("");
              }}
              onKeyDown={function (event) {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addManualSite();
              }}
            />
            <button type="button" class="dm-secondary-btn" onClick={addManualSite}>
              <Icon name="plus" />
              添加
            </button>
          </div>
          {manualError ? (
            <span id="dm-manual-site-error" class="dm-field-warning">
              <Icon name="circle-alert" />
              {manualError}
            </span>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
