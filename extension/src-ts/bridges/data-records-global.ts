import * as dataRecordsApi from "../shared/data-records";

const rootScope = globalThis as typeof globalThis & {
  ChromeTestDataDataRecords?: typeof dataRecordsApi;
};

rootScope.ChromeTestDataDataRecords = dataRecordsApi;

export default dataRecordsApi;
