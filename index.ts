import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as lark from "@larksuiteoapi/node-sdk";
import "dotenv/config";
import * as z from "zod/v4";

// 初始化飞书客户端
const client = new lark.Client({
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
  disableTokenCache: true,
  loggerLevel: lark.LoggerLevel.error,
});

// 初始化MCP服务端
const server = new McpServer({ name: "feishu-md-docx-mcp", version: "0.0.1" });

// 注册工具
server.registerTool(
  "create_docx",
  {
    description: "创建一个新的飞书docx文档",
    inputSchema: z.object({
      title: z.string().describe("文档标题"),
    }),
  },
  async ({ title }) => {
    const res = await client.docx.v1.document.create(
      {
        data: {
          title,
        },
      },
      lark.withUserAccessToken(process.env.TOKEN!),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(res.data) }],
      isError: false,
    };
  },
);
server.registerTool(
  "update_docx_content_with_markdown",
  {
    description: "使用markdown内容更新docx文档内容",
    inputSchema: z.object({
      docx_document_id: z.string().describe("docx文档ID"),
      markdown_content: z.string().describe("markdown格式的内容"),
    }),
  },
  async ({ docx_document_id, markdown_content }) => {
    // 步骤1：markdown转为blocks
    const convertRes = await client.docx.v1.document.convert(
      {
        data: {
          content: markdown_content,
          content_type: "markdown",
        },
      },
      lark.withUserAccessToken(process.env.TOKEN!),
    );
    const { blocks, first_level_block_ids } = convertRes.data!;
    if (!blocks || !first_level_block_ids) {
      throw new Error("转换markdown失败");
    }
    // 步骤2：用blocks更新文档内容
    // 分批插入
    const BATCH_SIZE = 500;
    for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
      const descendants = blocks?.slice(i, i + BATCH_SIZE);
      const children_id = first_level_block_ids.slice(i, i + BATCH_SIZE);
      await client.docx.v1.documentBlockDescendant.create(
        {
          path: {
            document_id: docx_document_id,
            block_id: docx_document_id,
          },
          params: {
            document_revision_id: -1,
          },
          data: {
            index: -1,
            children_id,
            descendants,
          },
        },
        lark.withUserAccessToken(process.env.TOKEN!),
      );
    }
    return {
      content: [{ type: "text", text: "写入成功" }],
      isError: false,
    };
  },
);

// 启动服务
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mcp Server started");
}

main().catch((error) => {
  console.error(JSON.stringify(error));
  console.error("Fatal error in main():", error);
  process.exit(1);
});
