import type { DataManagerView } from "../../../shared/data-manager-routing";
import type { ProfileFieldKey } from "../page-model";

export const DEFAULT_COLUMNS: Record<DataManagerView, ProfileFieldKey[]> = {
  favorites: ["fullName", "idNumber", "mobile", "companyName"],
  history: ["fullName", "idNumber", "mobile", "companyName", "email"]
};

const MONOSPACE_FIELDS = new Set<ProfileFieldKey>([
  "creditCode",
  "idNumber",
  "bankCard",
  "account",
  "mobile",
  "landline",
  "postalCode"
]);

export function isMonospaceField(fieldKey: ProfileFieldKey): boolean {
  return MONOSPACE_FIELDS.has(fieldKey);
}
