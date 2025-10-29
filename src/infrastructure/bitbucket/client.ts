import type {
  CommentData,
  CommitData,
  IMetricsRepository,
  PullRequestData,
  TagData,
} from "../../domain/interfaces/repository.ts";
import { appConfig } from "../config/index.ts";

export class BitbucketClient implements IMetricsRepository {
  private readonly baseUrl: string;
  private readonly workspace: string;
  private readonly apiKey: string;
  private readonly userEmail: string;

  constructor() {
    this.baseUrl = appConfig.bitbucket.baseUrl;
    this.workspace = appConfig.bitbucket.workspace;
    this.userEmail = appConfig.bitbucket.userEmail;
    this.apiKey = appConfig.bitbucket.apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.userEmail}:${this.apiKey}`).toString('base64');
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Bitbucket API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  private async fetchPaginated<T>(
    endpoint: string,
    itemKey: string = "values"
  ): Promise<T[]> {
    const allItems: T[] = [];
    let url = endpoint;

    do {
      const data = await this.fetch<{ next?: string; values: T[] }>(url);
      allItems.push(...(data[itemKey as keyof typeof data] as T[]));
      url = data.next ? data.next.replace(this.baseUrl, "") : "";
    } while (url);

    return allItems;
  }

  async getPullRequests(
    repositoryName: string,
    since: Date
  ): Promise<PullRequestData[]> {
    const endpoint = `/repositories/${this.workspace}/${repositoryName}/pullrequests?state=MERGED&state=OPEN&q=updated_on>${since.toISOString()}`;

    const prs = await this.fetchPaginated<PullRequestData>(endpoint);

    return prs.map((pr: any) => ({
      id: pr.id,
      title: pr.title,
      author: pr.author.display_name,
      state: pr.state,
      mergedOn: pr.closed_on,
      createdOn: pr.created_on,
      destinationBranch: pr.destination?.branch?.name || "",
      sourceBranch: pr.source?.branch?.name || "",
      commentCount: pr.comment_count,
      tasksCount: pr.tasks,
      reviewers: pr.reviewers,
      participants: pr.participants,
      links: pr.links,
    }));
  }

  async getPRComments(
    repositoryName: string,
    prId: number
  ): Promise<CommentData[]> {
    const endpoint = `/repositories/${this.workspace}/${repositoryName}/pullrequests/${prId}/comments`;

    try {
      const comments = await this.fetchPaginated<CommentData>(endpoint);

      return comments.map((comment: any) => ({
        id: comment.id,
        content: comment.content?.raw || "",
        author: comment.user?.display_name || "",
        createdOn: comment.created_on,
        parent: comment.parent?.id,
      }));
    } catch (error) {
      return [];
    }
  }

  async getPRCommits(
    repositoryName: string,
    prId: number
  ): Promise<CommitData[]> {
    try {
      const auth = btoa(`${this.userEmail}:${this.apiKey}`);
      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };
      
      const url = `${this.baseUrl}/repositories/${this.workspace}/${repositoryName}/pullrequests/${prId}/commits`;
      let response = await fetch(url, { headers });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      const commits: CommitData[] = [];
      let next = data.next;

      const processCommits = (commitList: any[]) => {
        for (const item of commitList) {
          commits.push({
            hash: item.hash,
            message: item.message,
            author: item.author?.user?.display_name || item.author?.raw,
            createdOn: item.date,
            parents: item.parents?.map((p: any) => p.hash) || [],
          });
        }
      };

      processCommits(data.values || []);

      while (next) {
        let nextData;
        try {
          const nextResponse = await fetch(next, { headers });
          if (!nextResponse.ok) break;
          nextData = await nextResponse.json();
        } catch {
          break;
        }
        processCommits(nextData.values || []);
        next = nextData.next;
      }

      return commits;
    } catch (error) {
      return [];
    }
  }

  async getTagsContainingCommit(
    repositoryName: string,
    commitHash: string
  ): Promise<TagData[]> {
    const allTags = await this.getAllTags(repositoryName);

    const matchingTags: TagData[] = [];

    for (const tag of allTags) {
      try {
        const tagCommit = await this.getTagCommit(repositoryName, tag.name);
        if (tagCommit?.hash === commitHash) {
          matchingTags.push(tag);
        }
      } catch (error) {
        continue;
      }
    }

    return matchingTags;
  }

  async getAllTags(repositoryName: string): Promise<TagData[]> {
    const endpoint = `/repositories/${this.workspace}/${repositoryName}/refs/tags?sort=-target.date`;

    try {
      const tags = await this.fetchPaginated<TagData>(endpoint);

      return tags.map((tag: any) => ({
        name: tag.name,
        createdAt: tag.target?.date || "",
        commitHash: tag.target?.hash || "",
      }));
    } catch (error) {
      return [];
    }
  }

  private async getTagCommit(
    repositoryName: string,
    tagName: string
  ): Promise<{ hash: string } | null> {
    try {
      const data = await this.fetch<any>(
        `/repositories/${this.workspace}/${repositoryName}/refs/tags/${tagName}`
      );
      return {
        hash: data.target?.hash || "",
      };
    } catch (error) {
      return null;
    }
  }
}
