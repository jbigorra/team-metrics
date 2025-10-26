import { LeadTimeCalculator } from "../application/services/lead-time-calculator.ts";
import { MetricsCollector } from "../application/services/metrics-collector.ts";
import { BitbucketClient } from "../infrastructure/bitbucket/client.ts";
import { appConfig } from "../infrastructure/config/index.ts";
import { LocalExcelStorage } from "../infrastructure/excel/local-storage.ts";

try {
  console.log("Starting metrics collection...");
  console.log(`Analyzing ${appConfig.repositories.length} repositories`);
  console.log(`Time range: last ${appConfig.timeRangeDays} days\n`);

  const repository = new BitbucketClient();
  const storage = new LocalExcelStorage();
  const leadTimeCalculator = new LeadTimeCalculator();
  const collector = new MetricsCollector(repository, leadTimeCalculator);

  const allMetrics = [];

  for (const repoName of appConfig.repositories) {
    try {
      console.log(`Fetching metrics for: ${repoName}`);
      const metrics = await collector.collect(repoName);
      console.log(`  Found ${metrics.length} PRs`);
      allMetrics.push(...metrics);
    } catch (error) {
      console.error(`  Error processing ${repoName}:`, error);
    }
  }

  console.log(`\nTotal PRs collected: ${allMetrics.length}`);
  console.log("Writing to Excel...");

  await storage.upsertMetrics(allMetrics);

  console.log("Metrics collection completed successfully!");
  console.log(`Results saved to: ${appConfig.onedrive.filePath}`);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
