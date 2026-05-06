# feishu-md-docx-mcp

将本地 Markdown 内容上传至飞书云文档的 MCP 服务。

## 功能

- **创建飞书文档**：通过标题创建一个新的飞书 docx 文档
- **写入 Markdown 内容**：将 Markdown 格式的内容转换并写入指定飞书文档

## 环境要求

- Node.js 18+
- 飞书应用凭证（App ID、App Secret）
- 飞书用户访问令牌（User Access Token）

## MCP 配置

在你的 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "feishu-md-docx-mcp": {
      "command": "npx",
      "args": ["feishu-md-docx-mcp"],
      "env": {
        "APP_ID": "your_feishu_app_id",
        "APP_SECRET": "your_feishu_app_secret",
        "TOKEN": "your_user_access_token"
      }
    }
  }
}
```

> **如何获取这些凭证？**
>
> - `APP_ID` / `APP_SECRET`：在[飞书开放平台](https://open.feishu.cn/)创建应用后获取
> - `TOKEN`：通过飞书 OAuth 2.0 授权流程获取用户访问令牌

## 工具说明

### `create_docx`

创建一个新的飞书 docx 文档。

| 参数 | 类型 | 描述 |
|------|------|------|
| `title` | string | 文档标题 |

**返回**：新创建文档的信息（JSON 格式）

---

### `update_docx_content_with_markdown`

使用 Markdown 内容更新指定飞书文档的内容。

| 参数 | 类型 | 描述 |
|------|------|------|
| `docx_document_id` | string | 目标文档的 ID |
| `markdown_content` | string | 要写入的 Markdown 格式内容 |

**返回**：`写入成功`

> 内部实现：先将 Markdown 转换为飞书 Block 格式，再分批（每批 500 个 block）写入文档。

## 开发者如何本地开发拓展工具

### 本地开发

新建`.env`文件，获取上述凭证写入环境变量中

### 本地调试

**使用 MCP Inspector 测试**

```shell
npx @modelcontextprotocol/inspector tsx index.ts
```

然后使用web可视化界面即可调用工具进行调试

**使用Agent热调试**



