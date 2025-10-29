import { BitbucketClient } from "../infrastructure/bitbucket/client";

const client = new BitbucketClient()

const since = new Date();
since.setDate(since.getDate() - 7);

const prs = await client.getPullRequests("verychic", since)
console.log(prs)