# Team Metrics

Team metrics is a tool to help you fetch information from dev tools such as Bitbucket and visualize leading indicators of team health and performance.

## Features

- Collects Pull Request metrics from Bitbucket repositories
- Tracks lead time from first commit to production deployment
- Extracts JIRA references and links
- Monitors code review activity (comments, approvals)
- Persists data to Excel for analysis
- Built with onion architecture for easy extensibility (Excel → Web UI)

## Setup

### Prerequisites

- Bun runtime installed
- Bitbucket API credentials

### Installation

1. Install dependencies:

```bash
bun install
```

2. Create `.env.production` file (copy from `env.example`):

```bash
BITBUCKET_WORKSPACE=verychic
BITBUCKET_API_KEY=your_api_key_here
ONEDRIVE_FILE_PATH=./metrics.xlsx
```

### Getting a Bitbucket API Key

1. Go to Bitbucket Settings → Personal Settings → App Passwords
2. Create an app password with repository read permissions
3. Copy the password to `.env.production`

## Usage

Run the metrics collection script:

```bash
bun run collect-metrics
```

The script will:
- Fetch merged PRs from the last 7 days
- Calculate lead time for deployments via git tags
- Extract JIRA references
- Update or append metrics to the Excel file

## Scheduled Execution

To run daily at 8pm, add to your crontab:

```bash
0 20 * * * cd /path/to/team-metrics && bun run collect-metrics
```

## Metrics Collected

- Pull Request link
- Author
- JIRA reference and link
- Repository name and link
- Comment count and commenters
- Approvers and approval count
- Lead time (first commit → deployment tag)
- Created and deployed dates
- Tag version

## Architecture

The project follows **Onion Architecture** for separation of concerns:

- `domain/` - Core business logic and interfaces
- `application/` - Use cases and orchestration
- `infrastructure/` - External integrations (Bitbucket, Excel)
- `scripts/` - Entry points

This allows easy extension to web interfaces, databases, or other storage mechanisms by implementing the `IMetricsStorage` interface.

## Configuration

Edit `src/infrastructure/config/index.ts` to:
- Add/remove repositories
- Adjust time range
- Configure storage location

