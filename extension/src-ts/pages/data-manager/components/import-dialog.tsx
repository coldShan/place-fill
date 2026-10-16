import { useState } from "preact/hooks";
import type { ImportedFavorite } from "../lib/import-export";
import { getFavoriteTitle } from "../lib/display";
import { Dialog } from "./dialog";

const PREVIEW_LIMIT = 5;

export function ImportDialog(props: {
  scope: string;
  fileName: string;
  sourceScope: string;
  toCreate: ImportedFavorite[];
  duplicates: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const count = props.toCreate.length;
  const description = count
    ? "将导入 " + count + " 条常用数据" + (props.duplicates ? "，" + props.duplicates + " 条与已有数据重复将跳过" : "") + "。"
    : "文件中的 " + props.duplicates + " 条数据都已存在，没有需要导入的新数据。";

  async function submit(): Promise<void> {
    if (!count || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title="导入常用数据"
      description={description}
      onClose={props.onClose}
      footer={
        count ? (
          <>
            <button type="button" class="dm-secondary-btn" onClick={props.onClose}>取消</button>
            <button type="button" class="dm-primary-btn" disabled={submitting} onClick={function () { void submit(); }}>
              导入 {count} 条
            </button>
          </>
        ) : (
          <button type="button" class="dm-primary-btn" onClick={props.onClose}>知道了</button>
        )
      }
    >
      <div class="dm-import-summary">
        <div class="dm-import-meta">
          <span>文件</span>
          <span class="dm-import-meta-value" title={props.fileName}>{props.fileName}</span>
        </div>
        {props.sourceScope && props.sourceScope !== props.scope ? (
          <p class="dm-banner is-info">
            文件导出自 {props.sourceScope}，将导入到当前站点 {props.scope}。
          </p>
        ) : null}
        {count ? (
          <ul class="dm-import-preview">
            {props.toCreate.slice(0, PREVIEW_LIMIT).map(function (item, index) {
              return (
                <li key={index}>
                  <span class="dm-import-preview-title">{getFavoriteTitle(item)}</span>
                  <span class="dm-import-preview-meta">{item.profile.mobile || item.profile.idNumber || item.profile.companyName}</span>
                </li>
              );
            })}
            {count > PREVIEW_LIMIT ? <li class="dm-import-preview-more">以及另外 {count - PREVIEW_LIMIT} 条</li> : null}
          </ul>
        ) : null}
      </div>
    </Dialog>
  );
}
