import { useCallback, useState } from "preact/hooks";
import { Dialog } from "../components/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (confirmed: boolean) => void };

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(function (options: ConfirmOptions): Promise<boolean> {
    return new Promise(function (resolve) {
      setPending({ ...options, resolve });
    });
  }, []);

  function settle(confirmed: boolean): void {
    if (!pending) return;
    pending.resolve(confirmed);
    setPending(null);
  }

  const confirmDialog = pending ? (
    <Dialog
      title={pending.title}
      description={pending.description}
      onClose={function () { settle(false); }}
      footer={
        <>
          <button type="button" class="dm-secondary-btn" data-autofocus onClick={function () { settle(false); }}>
            {pending.cancelLabel || "取消"}
          </button>
          <button
            type="button"
            class={pending.danger ? "dm-danger-btn" : "dm-primary-btn"}
            onClick={function () { settle(true); }}
          >
            {pending.confirmLabel || "确定"}
          </button>
        </>
      }
    />
  ) : null;

  return { confirm, confirmDialog };
}
