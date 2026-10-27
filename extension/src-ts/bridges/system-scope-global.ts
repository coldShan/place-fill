import * as scopeMigration from "../shared/scope-migration";
import * as systemRegistry from "../shared/system-registry";
import * as systemScope from "../shared/system-scope";

const systemScopeApi = { ...systemScope, ...systemRegistry, ...scopeMigration };

const rootScope = globalThis as typeof globalThis & {
  ChromeTestDataSystemScope?: typeof systemScopeApi;
};

rootScope.ChromeTestDataSystemScope = systemScopeApi;

export default systemScopeApi;
