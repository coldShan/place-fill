import * as offlineFormSnapshotApi from "../shared/offline-form-snapshot";

const rootScope = globalThis as typeof globalThis & {
  ChromeTestDataOfflineFormSnapshot?: typeof offlineFormSnapshotApi;
};

rootScope.ChromeTestDataOfflineFormSnapshot = offlineFormSnapshotApi;

export default offlineFormSnapshotApi;
