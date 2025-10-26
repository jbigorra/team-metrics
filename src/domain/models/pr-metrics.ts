export interface PullRequestMetrics {
  pullRequestUrl: string;
  author: string;
  jiraRef: string;
  jiraUrl: string;
  repositoryName: string;
  repositoryUrl: string;
  commentCount: number;
  commenters: string;
  comments: string;
  approvers: string;
  approvalCount: number;
  approvedOn: string;
  leadTime: string;
  createdOn: string;
  deployedOn: string;
  tagVersion: string;
}
