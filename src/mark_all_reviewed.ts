#!/usr/bin/env node

import * as https from 'https';
import { exit, argv, env } from 'process';

// ============================================
// 类型定义
// ============================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface ViewerResponse {
  viewer: {
    login: string;
  };
}

interface PrIdVariables {
  owner: string;
  repo: string;
  number: number;
}

interface PrIdResponse {
  repository: {
    pullRequest: {
      id: string;
    };
  };
}

interface FilesVariables {
  prId: string;
  after?: string | null;
}

interface FilesResponse {
  node: {
    files: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: Array<{
        path: string;
        viewerViewedState: 'UNVIEWED' | 'VIEWED' | 'DISMISSED';
      }>;
    };
  };
}

interface MarkFileVariables {
  prId: string;
  path: string;
}

// ============================================
// 帮助信息
// ============================================
const commandName = 'gh-pr-mark';

function showHelp(): void {
  console.log(`
Usage: ${commandName} [options]

Batch mark all unviewed files in a GitHub Pull Request as "viewed".

Options:
  -o <owner>       Repository owner (organization or username).
                   If not provided, the owner of the GITHUB_TOKEN will be used.
  -repo <repo>     Repository name, required
  -pr <number>     Pull request number, required
  --out-detail     Output marking result for each file (default: off)
  -h, --help       Show this help message and exit

Environment:
  GITHUB_TOKEN     GitHub personal access token (required), must have repo scope

Examples:
  ${commandName} -repo repoName -pr 17                # Uses token owner as repository owner
  ${commandName} -o Owner -repo repoName -pr 17
  ${commandName} -o Owner -repo repoName -pr 17 --out-detail
`);
  exit(0);
}

// ============================================
// 解析命令行参数
// ============================================

let owner = '';
let repo = '';
let prNumber = '';
let showDetail = false;

for (let i = 2; i < argv.length; i++) {
  switch (argv[i]) {
    case '-h':
    case '--help':
      showHelp();
      break;
    case '-o':
      owner = argv[++i]!;
      break;
    case '-repo':
      repo = argv[++i]!;
      break;
    case '-pr':
      prNumber = argv[++i]!;
      break;
    case '--out-detail':
      showDetail = true;
      break;
    default:
      console.error(`未知参数: ${argv[i]}`);
      showHelp();
  }
}

if (!repo || !prNumber) {
  console.error('❌ 缺少必要参数');
  showHelp();
}

const token = env.GITHUB_TOKEN;
if (!token) {
  console.error('❌ 未设置 GITHUB_TOKEN 环境变量');
  exit(1);
}

console.log('🔧 环境检查通过');

// ============================================
// GraphQL 请求辅助函数
// ============================================

function graphqlRequest<T, V>(query: string, variables: V): Promise<T> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const options: https.RequestOptions = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Node.js PR Marker',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body) as GraphQLResponse<T>;
          if (json.errors) {
            reject(new Error(json.errors.map(e => e.message).join('; ')));
          } else if (json.data) {
            resolve(json.data);
          } else {
            reject(new Error('响应中缺少 data 字段'));
          }
        } catch (err) {
          reject(new Error(`解析响应失败: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ============================================
// 业务函数
// ============================================

async function getCurrentUser(): Promise<string> {
  const query = `query { viewer { login } }`;
  const data = await graphqlRequest<ViewerResponse, {}>(query, {});
  return data.viewer.login;
}

async function getPullRequestId(owner: string, repo: string, number: string): Promise<string> {
  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) { id }
      }
    }
  `;
  const variables: PrIdVariables = { owner, repo, number: parseInt(number, 10) };
  const data = await graphqlRequest<PrIdResponse, PrIdVariables>(query, variables);
  return data.repository.pullRequest.id;
}

async function getAllUnviewedFiles(prId: string): Promise<string[]> {
  const unviewedFiles: string[] = [];
  let afterCursor: string | null = null;
  let page = 1;

  while (true) {
    process.stdout.write(`   获取第 ${page} 页...`);
    const query: string = afterCursor
      ? `
        query($prId: ID!, $after: String!) {
          node(id: $prId) {
            ... on PullRequest {
              files(first: 100, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes { path viewerViewedState }
              }
            }
          }
        }
      `
      : `
        query($prId: ID!) {
          node(id: $prId) {
            ... on PullRequest {
              files(first: 100) {
                pageInfo { hasNextPage endCursor }
                nodes { path viewerViewedState }
              }
            }
          }
        }
      `;

    const variables: FilesVariables = { prId, after: afterCursor };
    const data = await graphqlRequest<FilesResponse, FilesVariables>(query, variables);
    const files = data.node.files;

    const unviewedInPage = files.nodes
      .filter(f => f.viewerViewedState === 'UNVIEWED')
      .map(f => f.path);
    unviewedFiles.push(...unviewedInPage);
    console.log(` 发现 ${unviewedInPage.length} 个未查看`);

    if (!files.pageInfo.hasNextPage) break;
    afterCursor = files.pageInfo.endCursor;
    page++;
  }

  return unviewedFiles;
}

async function markFileAsViewed(prId: string, path: string): Promise<void> {
  const query = `
    mutation($prId: ID!, $path: String!) {
      markFileAsViewed(input: { pullRequestId: $prId, path: $path }) {
        clientMutationId
      }
    }
  `;
  const variables: MarkFileVariables = { prId, path };
  await graphqlRequest<{}, MarkFileVariables>(query, variables);
}

function renderProgressBar(current: number, total: number, barWidth: number = 30): string {
  const percent = current / total;
  const filledLength = Math.round(barWidth * percent);
  const emptyLength = barWidth - filledLength;
  const filledBar = '='.repeat(filledLength);
  const emptyBar = '-'.repeat(emptyLength);
  return `[${filledBar}${emptyBar}] ${current}/${total} (${Math.round(percent * 100)}%)`;
}

// ============================================
// 解析最终使用的 owner
// ============================================
async function resolveOwner(): Promise<string> {
  if (owner) {
    return owner;
  }
  console.log('ℹ️  未指定 -o 参数，将使用当前 Token 的所属用户作为 owner...');
  const user = await getCurrentUser();
  console.log(`✅ 当前认证账号: ${user}`);
  return user;
}

// ============================================
// 主流程
// ============================================

(async () => {
  try {
    const finalOwner = await resolveOwner();

    // 如果 owner 原本就有值，则额外显示当前认证账号信息（可选）
    if (owner) {
      const user = await getCurrentUser();
      console.log(`✅ 当前认证账号: ${user}`);
    }

    const prId = await getPullRequestId(finalOwner, repo, prNumber);
    console.log(`🎯 目标: ${finalOwner}/${repo} PR #${prNumber}`);
    console.log(`✅ PR ID: ${prId}`);

    console.log('🔍 正在分页获取全部未查看文件（每次100条）...');
    const unviewedFiles = await getAllUnviewedFiles(prId);

    if (unviewedFiles.length === 0) {
      console.log('🎉 没有未查看的文件，无需标记！');
      exit(0);
    }

    console.log(`📋 待标记文件数: ${unviewedFiles.length}\n`);

    const total = unviewedFiles.length;
    let successCount = 0;
    let failCount = 0;

    for (let idx = 0; idx < total; idx++) {
      const filePath = unviewedFiles[idx]!;
      const current = idx + 1;

      try {
        await markFileAsViewed(prId, filePath);
        successCount++;
        if (showDetail) {
          console.log(`[${current}/${total}] ✅  ${filePath}`);
        }
      } catch (err) {
        failCount++;
        if (showDetail) {
          const message = err instanceof Error ? err.message : String(err);
          console.log(`[${current}/${total}] ❌  ${filePath} 失败: ${message}`);
        }
      }

      if (!showDetail) {
        process.stdout.write(`\r${renderProgressBar(current, total)}`);
      }
    }

    if (!showDetail) {
      process.stdout.write('\n');
    }
    console.log(`\n✅ 完成！成功: ${successCount}，失败: ${failCount}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ 执行失败: ${message}`);
    exit(1);
  }
})();