import type { SystemProfile } from "../../../shared/system-scope";

export type RuntimeMessageSender = (message: Record<string, unknown>) => Promise<unknown>;

export interface SystemCommandResult {
  ok: boolean;
  message?: string;
}

function normalizeResult(response: unknown, fallbackMessage: string): SystemCommandResult {
  if (!response || typeof response !== "object") return { ok: false, message: fallbackMessage };
  const record = response as Record<string, unknown>;
  if (record.ok === true) return { ok: true };
  return { ok: false, message: typeof record.message === "string" && record.message ? record.message : fallbackMessage };
}

/**
 * Registry edits from the data manager go through background messages so they share the
 * background's serial registry queue with page recognition (no lost read-modify-write updates).
 */
export function createSystemCommands(send: RuntimeMessageSender) {
  function run(message: Record<string, unknown>, fallbackMessage: string): Promise<SystemCommandResult> {
    return send(message).then(
      function (response) {
        return normalizeResult(response, fallbackMessage);
      },
      function () {
        return { ok: false, message: fallbackMessage };
      }
    );
  }
  return {
    save(system: SystemProfile): Promise<SystemCommandResult> {
      return run({ type: "save-system", system }, "保存失败，请重试");
    },
    remove(id: string, targetScope: string): Promise<SystemCommandResult> {
      return run({ type: "delete-system", id, targetScope }, "删除失败，请重试");
    },
    dismiss(systemId: string): Promise<SystemCommandResult> {
      return run({ type: "dismiss-anomalies", systemId }, "操作失败，请重试");
    }
  };
}

export function sendRuntimeMessage(message: Record<string, unknown>): Promise<unknown> {
  return new Promise(function (resolve) {
    try {
      chrome.runtime.sendMessage(message, function (response: unknown) {
        resolve(chrome.runtime.lastError ? null : response);
      });
    } catch (_error) {
      resolve(null);
    }
  });
}
