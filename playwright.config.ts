import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e",
  snapshotPathTemplate:"{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  timeout:30_000,
  expect:{timeout:7_500,toHaveScreenshot:{animations:"disabled",maxDiffPixelRatio:.005}},
  fullyParallel:false,
  reporter:[["list"]],
  use:{baseURL:"http://localhost:5173",trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{command:"npm run dev",url:"http://localhost:5173",reuseExistingServer:false,timeout:120_000},
});
