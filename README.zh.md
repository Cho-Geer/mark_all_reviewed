# gh-pr-mark

> 通过命令行批量将 GitHub Pull Request 中所有未查看的文件标记为"已查看"。

厌倦了在一个大型 PR 中逐个点击数百个文件只为将它们标记为已查看?`gh-pr-mark` 可以通过一个命令自动完成这一繁琐任务。

- 使用 GitHub 官方的 GraphQL API
- 自动处理任意数量 PR 文件的分页
- 仅标记仍处于**未查看**状态的文件
- 显示进度条和可选的详细输出

## 安装

```bash
npm install -g gh-pr-mark
```

请确保已安装 [Node.js](https://nodejs.org/)(v14 或更高版本)。

***

## 前提条件

需要一个具有 `repo` 权限范围的 GitHub Personal Access Token。请将其设置为环境变量:

```Shell
export GITHUB_TOKEN=your_github_token_here
```

您可以在以下地址生成令牌: <https://github.com/settings/tokens>

***

## 使用方法

```Shell
gh-pr-mark -repo <repo> -pr <number> [options]
```

如果省略 `-o` 选项,仓库所有者将从您的令牌中自动推断(即您自己的用户名)。

### 选项

| 选项             | 描述                                                                                                          |
| :--------------- | :------------------------------------------------------------------------------------------------------------ |
| `-o <owner>`     | 仓库所有者(组织或用户名)。**可选** — 如果未提供,则使用 `GITHUB_TOKEN` 的所有者。                              |
| `-repo <repo>`   | 仓库名称。**必填**。                                                                                           |
| `-pr <number>`   | Pull Request 编号。**必填**。                                                                                  |
| `--out-detail`   | 为每个标记的文件打印成功/失败行。默认仅显示进度条。                                                              |
| `-h, --help`     | 显示帮助信息并退出。                                                                                            |

### 环境变量

| 变量            | 描述                                              |
| :-------------- | :------------------------------------------------ |
| `GITHUB_TOKEN`  | 具有 `repo` 权限范围的 GitHub Personal Access Token。 |

***

## 示例

### 标记您自己仓库中的所有文件

```Shell
# 自动使用令牌的 owner
gh-pr-mark -repo my-project -pr 42
```

### 标记某个组织仓库中的文件

```Shell
gh-pr-mark -o facebook -repo react -pr 1234
```

### 显示每个文件的详细输出

```Shell
gh-pr-mark -repo my-project -pr 42 --out-detail
```

### `--out-detail` 输出示例

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

## 工作原理

1. 使用您的 `GITHUB_TOKEN` 进行身份验证。
2. 获取该 Pull Request 的 GraphQL ID。
3. 分页遍历 PR 中的所有文件,仅过滤出 `viewerViewedState: UNVIEWED` 的文件。
4. 对每个未查看的文件发送一个 `markFileAsViewed` 变更请求。
5. 报告进度和最终统计信息。

所有 API 调用都遵循 GitHub 的速率限制(每个用户每小时 5,000 点)。每标记一个文件消耗 1 点。

***

## 许可证

MIT © \Zach Tao

---

## 🇯🇵 日本語 | 🇬🇧 English

- [日本語版](./README.md)
- [English version](./README.en.md)
