import { buildDataManagerPageUrl } from "../shared/data-manager-routing";

const api = {
  buildDataManagerPageUrl
};

const rootScope = globalThis as typeof globalThis & {
  ChromeTestDataDataManagerBridge?: typeof api;
};

rootScope.ChromeTestDataDataManagerBridge = api;

export default api;
