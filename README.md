# gh-pr-mark

> Batch mark all unviewed files in a GitHub Pull Request as "viewed" via the command line.

Tired of clicking through hundreds of files in a large PR just to mark them as viewed? `gh-pr-mark` automates this tedious task with a single command.

- ✅ Uses GitHub's official GraphQL API
- ✅ Handles pagination for PRs with any number of files
- ✅ Only marks files that are still **unviewed**
- ✅ Shows progress bar and optional detailed output

## Installation

```bash
npm install -g gh-pr-mark
```

Make sure you have [Node.js](https://nodejs.org/) (v14 or later) installed.

***

## Prerequisites

A GitHub personal access token with `repo` scope is required. Set it as an environment variable:

```Shell
export GITHUB_TOKEN=your_github_token_here
```

You can generate a token at: <https://github.com/settings/tokens>

***

## Usage

```Shell
gh-pr-mark -repo <repo> -pr <number> [options]
```

If you omit the `-o` option, the repository owner is automatically inferred from your token (i.e., your own username).

### Options

| Option         | Description                                                                                                       |
| :------------- | :---------------------------------------------------------------------------------------------------------------- |
| `-o <owner>`   | Repository owner (organization or username). **Optional** – if not provided, the owner of `GITHUB_TOKEN` is used. |
| `-repo <repo>` | Repository name. **Required**.                                                                                    |
| `-pr <number>` | Pull request number. **Required**.                                                                                |
| `--out-detail` | Print a success/failure line for each file marked. By default only a progress bar is shown.                       |
| `-h, --help`   | Show help message and exit.                                                                                       |

### Environment

| Variable       | Description                                     |
| :------------- | :---------------------------------------------- |
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope. |

***

## Examples

### Mark all files in your own repository

```Shell
# Uses your token's owner automatically
gh-pr-mark -repo my-project -pr 42
```

### Mark files in an organization's repository

```Shell
gh-pr-mark -o facebook -repo react -pr 1234
```

### Show detailed output for each file

```Shell
gh-pr-mark -repo my-project -pr 42 --out-detail
```

### Example output (with `--out-detail`)

```Shell
🔧 Environment check passed
✅ Authenticated as: johndoe
🎯 Target: johndoe/my-project PR #42
✅ PR ID: PR_kwDOxxxxxx
🔍 Fetching all unviewed files (100 per page)...
   Fetching page 1... found 58 unviewed
📋 Files to mark: 58

[1/58] ✅  src/index.ts
[2/58] ✅  src/utils/helper.ts
...
[58/58] ✅  README.md

✅ Done! Success: 58, Failed: 0
```

***

## How It Works

1. Authenticates using your `GITHUB_TOKEN`.
2. Retrieves the pull request's GraphQL ID.
3. Paginates through all files in the PR, filtering only those with `viewerViewedState: UNVIEWED`.
4. Sends a `markFileAsViewed` mutation for each unviewed file.
5. Reports progress and final statistics.

All API calls respect GitHub's rate limits (5,000 points per hour per user). Each file marking consumes 1 point.

***

## License

MIT © \Zach Tao
