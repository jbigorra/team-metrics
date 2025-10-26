import ExcelJS from "exceljs";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { IMetricsStorage } from "../../domain/interfaces/repository.ts";
import type { PullRequestMetrics } from "../../domain/models/pr-metrics.ts";
import { appConfig } from "../config/index.ts";

export class LocalExcelStorage implements IMetricsStorage {
  private readonly filePath: string;

  constructor() {
    this.filePath = appConfig.onedrive.filePath;

    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async loadExisting(): Promise<PullRequestMetrics[]> {
    if (!existsSync(this.filePath)) {
      return [];
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return [];
    }

    const metrics: PullRequestMetrics[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cells = row.values as unknown[];
      if (cells[1] === undefined || cells[1] === null) return;

      metrics.push({
        pullRequestUrl: String(cells[1]),
        author: String(cells[2]),
        jiraRef: String(cells[3]),
        jiraUrl: String(cells[4]),
        repositoryName: String(cells[5]),
        repositoryUrl: String(cells[6]),
        commentCount: Number(cells[7]) || 0,
        commenters: String(cells[8]),
        comments: String(cells[9]),
        approvers: String(cells[10]),
        approvalCount: Number(cells[11]) || 0,
        approvedOn: String(cells[12]),
        leadTime: String(cells[13]),
        createdOn: String(cells[14]),
        deployedOn: String(cells[15]),
        tagVersion: String(cells[16]),
      });
    });

    return metrics;
  }

  async upsertMetrics(metrics: PullRequestMetrics[]): Promise<void> {
    const existing = await this.loadExisting();
    const existingMap = new Map(existing.map((m) => [m.pullRequestUrl, m]));

    for (const metric of metrics) {
      existingMap.set(metric.pullRequestUrl, metric);
    }

    const allMetrics = Array.from(existingMap.values());
    await this.writeToFile(allMetrics);
  }

  private async writeToFile(metrics: PullRequestMetrics[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Metrics");

    worksheet.columns = [
      { header: "Pull Request", key: "pullRequestUrl", width: 30 },
      { header: "Author", key: "author", width: 20 },
      { header: "JIRA Ref", key: "jiraRef", width: 15 },
      { header: "JIRA URL", key: "jiraUrl", width: 40 },
      { header: "Repository Name", key: "repositoryName", width: 25 },
      { header: "Repository URL", key: "repositoryUrl", width: 40 },
      { header: "# Comments", key: "commentCount", width: 12 },
      { header: "Commenters", key: "commenters", width: 25 },
      { header: "Comments", key: "comments", width: 50 },
      { header: "Approvers", key: "approvers", width: 25 },
      { header: "# Approvals", key: "approvalCount", width: 12 },
      { header: "Approved on", key: "approvedOn", width: 20 },
      { header: "Lead Time", key: "leadTime", width: 15 },
      { header: "Created on", key: "createdOn", width: 20 },
      { header: "Deployed on", key: "deployedOn", width: 20 },
      { header: "Tag Version", key: "tagVersion", width: 20 },
    ];

    for (const metric of metrics) {
      worksheet.addRow(metric);
    }

    await workbook.xlsx.writeFile(this.filePath);
  }
}
