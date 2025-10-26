import type { PullRequestMetrics } from "../models/pr-metrics.ts";

export interface IMetricsRepository {
  getPullRequests(
    repositoryName: string,
    since: Date
  ): Promise<PullRequestData[]>;
  getPRComments(repositoryName: string, prId: number): Promise<CommentData[]>;
  getPRCommits(repositoryName: string, prId: number): Promise<CommitData[]>;
  getTagsContainingCommit(
    repositoryName: string,
    commitHash: string
  ): Promise<TagData[]>;
  getAllTags(repositoryName: string): Promise<TagData[]>;
}

export interface IMetricsStorage {
  loadExisting(): Promise<PullRequestMetrics[]>;
  upsertMetrics(metrics: PullRequestMetrics[]): Promise<void>;
}

export interface PullRequestData {
  id: number;
  title: string;
  author: string;
  state: string;
  mergedOn: string | null;
  createdOn: string;
  destinationBranch: string;
  sourceBranch: string;
}

export interface CommentData {
  id: number;
  content: string;
  author: string;
  createdOn: string;
  parent?: number;
}

export interface CommitData {
  hash: string;
  message: string;
  author: string;
  createdOn: string;
  parents: string[];
}

export interface TagData {
  name: string;
  createdAt: string;
  commitHash: string;
}
