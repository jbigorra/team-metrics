import type {
    CommentData,
    CommitData,
    IMetricsRepository,
} from "../../domain/interfaces/repository.ts";
import type { PullRequestMetrics } from "../../domain/models/pr-metrics.ts";
import { appConfig } from "../../infrastructure/config/index.ts";
import { LeadTimeCalculator } from "./lead-time-calculator.ts";

export class MetricsCollector {
  constructor(
    private readonly repository: IMetricsRepository,
    private readonly leadTimeCalculator: LeadTimeCalculator
  ) {}

  extractJiraKeys(title: string, description: string): string[] {
    const jiraPattern = /([A-Z]+-\d+)/g;
    const matches = new Set<string>();

    for (const text of [title, description]) {
      const found = text.match(jiraPattern);
      if (found) {
        for (const key of found) {
          matches.add(key);
        }
      }
    }

    return Array.from(matches);
  }

  constructJiraUrl(key: string): string {
    return `https://verychic.atlassian.net/browse/${key}`;
  }

  private processJiraInfo(title: string): { jiraRef: string; jiraUrl: string } {
    const jiraKeys = this.extractJiraKeys(title, "");
    const jiraRef = jiraKeys.join(", ") || "N/A";
    const jiraUrl =
      jiraKeys.length > 0
        ? jiraKeys.map((key) => this.constructJiraUrl(key)).join(", ")
        : "";
    return { jiraRef, jiraUrl };
  }

  private processComments(comments: CommentData[]): {
    commenters: string;
    allComments: string;
  } {
    const commentersSet = new Set(
      comments.map((c) => c.author).filter(Boolean)
    );
    const commenters = Array.from(commentersSet).join(", ");
    const allComments = comments
      .map((c) => `${c.author}: ${c.content}`)
      .join(" | ");
    return { commenters, allComments };
  }

  private async calculateDeploymentInfo(
    repositoryName: string,
    firstCommit: CommitData
  ): Promise<{ deployedOn: string; tagVersion: string; leadTime: string }> {
    const matchingTags = await this.repository.getTagsContainingCommit(
      repositoryName,
      firstCommit.hash
    );

    if (matchingTags.length === 0) {
      return { deployedOn: "", tagVersion: "", leadTime: "Not Deployed" };
    }

    const result = this.leadTimeCalculator.calculateLeadTime(
      firstCommit,
      matchingTags
    );
    return {
      deployedOn: result.deployedOn,
      tagVersion: result.tagVersion,
      leadTime: result.leadTime,
    };
  }

  private extractApprovers(comments: CommentData[]): {
    approvers: string;
    approvalCount: number;
    approvedOn: string;
  } {
    const approversSet = new Set<string>();
    for (const comment of comments) {
      const content = comment.content.toLowerCase();
      if (content.includes("approve") || content.includes("lgtm")) {
        approversSet.add(comment.author);
      }
    }

    const approvers = Array.from(approversSet).join(", ");
    const approvalCount = approversSet.size;

    const approvedOn =
      comments
        .filter((c) => approversSet.has(c.author))
        .sort(
          (a, b) =>
            new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime()
        )[0]?.createdOn || "";

    return { approvers, approvalCount, approvedOn };
  }

  async collect(repositoryName: string): Promise<PullRequestMetrics[]> {
    const since = new Date();
    since.setDate(since.getDate() - appConfig.timeRangeDays);

    const prs = await this.repository.getPullRequests(repositoryName, since);
    const metrics: PullRequestMetrics[] = [];

    for (const pr of prs) {
      if (pr.state !== "MERGED") continue;

      const [comments, commits] = await Promise.all([
        this.repository.getPRComments(repositoryName, pr.id),
        this.repository.getPRCommits(repositoryName, pr.id),
      ]);

      if (commits.length === 0) continue;

      const firstCommit = commits.at(-1);
      if (!firstCommit) continue;

      const { jiraRef, jiraUrl } = this.processJiraInfo(pr.title);
      const { commenters, allComments } = this.processComments(comments);
      const deploymentInfo = await this.calculateDeploymentInfo(
        repositoryName,
        firstCommit
      );
      const approvalInfo = this.extractApprovers(comments);

      metrics.push({
        pullRequestUrl: `https://bitbucket.org/verychic/${repositoryName}/pull-requests/${pr.id}`,
        author: pr.author,
        jiraRef,
        jiraUrl,
        repositoryName,
        repositoryUrl: `https://bitbucket.org/verychic/${repositoryName}`,
        commentCount: comments.length,
        commenters,
        comments: allComments,
        approvers: approvalInfo.approvers,
        approvalCount: approvalInfo.approvalCount,
        approvedOn: approvalInfo.approvedOn,
        leadTime: deploymentInfo.leadTime,
        createdOn: pr.createdOn,
        deployedOn: deploymentInfo.deployedOn,
        tagVersion: deploymentInfo.tagVersion,
      });
    }

    return metrics;
  }
}
