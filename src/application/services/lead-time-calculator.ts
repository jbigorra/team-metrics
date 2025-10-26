import type {
  CommitData,
  TagData,
} from "../../domain/interfaces/repository.ts";

export class LeadTimeCalculator {
  calculateLeadTime(
    firstCommit: CommitData,
    matchingTags: TagData[]
  ): { leadTime: string; deployedOn: string; tagVersion: string } {
    if (matchingTags.length === 0) {
      return {
        leadTime: "Not Deployed",
        deployedOn: "",
        tagVersion: "",
      };
    }

    if (matchingTags.length === 0) {
      throw new Error("Cannot calculate lead time without matching tags");
    }

    const earliestTag = matchingTags.reduce((earliest, current) => {
      return new Date(current.createdAt) < new Date(earliest.createdAt)
        ? current
        : earliest;
    }, matchingTags[0]);

    const commitDate = new Date(firstCommit.createdOn);
    const tagDate = new Date(earliestTag.createdAt);
    const diffMs = tagDate.getTime() - commitDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const leadTime =
      diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`;

    return {
      leadTime,
      deployedOn: earliestTag.createdAt,
      tagVersion: earliestTag.name,
    };
  }
}
