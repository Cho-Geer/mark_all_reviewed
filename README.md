# gh-pr-mark

> コマンドラインから、GitHub の Pull Request 内の未閲覧ファイルをまとめて「閲覧済み」にマークします。

大きな PR で何百ものファイルを 1 つひとつ開いて「閲覧済み」にしていく作業にうんざりしていませんか?`gh-pr-mark` があれば、この退屈な作業を 1 つのコマンドで自動化できます。

- GitHub 公式 GraphQL API を使用
- ファイル数がいくらあってもページネーションを処理
- まだ**未閲覧**のファイルのみをマーク
- プログレスバーと任意の詳細出力を表示

## インストール

```bash
npm install -g gh-pr-mark
```

[Node.js](https://nodejs.org/)(v14 以降)がインストールされていることを確認してください。

***

## 前提条件

`repo` スコープ付きの GitHub Personal Access Token が必要です。環境変数として設定してください。

```Shell
export GITHUB_TOKEN=your_github_token_here
```

トークンは次のページで生成できます: <https://github.com/settings/tokens>

***

## 使い方

```Shell
gh-pr-mark -repo <repo> -pr <number> [options]
```

`-o` オプションを省略した場合、リポジトリの所有者はトークンから自動的に推測されます(つまり、あなた自身のユーザー名)。

### オプション

| オプション        | 説明                                                                                                              |
| :---------------- | :---------------------------------------------------------------------------------------------------------------- |
| `-o <owner>`      | リポジトリの所有者(Organization またはユーザー名)。**任意** — 指定しない場合は `GITHUB_TOKEN` の所有者が使用されます。 |
| `-repo <repo>`    | リポジトリ名。**必須**。                                                                                          |
| `-pr <number>`    | プルリクエスト番号。**必須**。                                                                                    |
| `--out-detail`    | マークしたファイルごとに成功/失敗の 1 行を出力します。デフォルトではプログレスバーのみが表示されます。              |
| `-h, --help`      | ヘルプメッセージを表示して終了します。                                                                             |

### 環境変数

| 変数            | 説明                                                    |
| :-------------- | :------------------------------------------------------ |
| `GITHUB_TOKEN`  | `repo` スコープ付きの GitHub Personal Access Token。 |

***

## 使用例

### 自分のリポジトリの全ファイルをマークする

```Shell
# トークンの所有者が自動的に使用されます
gh-pr-mark -repo my-project -pr 42
```

### Organization のリポジトリのファイルをマークする

```Shell
gh-pr-mark -o facebook -repo react -pr 1234
```

### 各ファイルの詳細出力を表示する

```Shell
gh-pr-mark -repo my-project -pr 42 --out-detail
```

### `--out-detail` 指定時の出力例

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

## 仕組み

1. `GITHUB_TOKEN` を使って認証します。
2. プルリクエストの GraphQL ID を取得します。
3. PR 内のすべてのファイルをページングし、`viewerViewedState: UNVIEWED` のファイルのみを抽出します。
4. 未閲覧の各ファイルに対して `markFileAsViewed` ミューテーションを送信します。
5. 進捗と最終的な統計を報告します。

すべての API 呼び出しは GitHub のレート制限(ユーザー 1 人あたり 1 時間 5,000 ポイント)を尊重します。ファイルを 1 件マークするごとに 1 ポイントが消費されます。

***

## ライセンス

MIT © \Zach Tao

---

## 🇬🇧 English | 🇨🇳 中文

- [English version](./README.en.md)
- [中文版本](./README.zh.md)
