import { Server } from "@modelcontextprotocol/sdk/server/index";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types";
import * as lark from "@larksuiteoapi/node-sdk";
import "dotenv/config";

// 初始化飞书客户端
const client = new lark.Client({
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
  disableTokenCache: true,
  loggerLevel: lark.LoggerLevel.error,
});

// 初始化MCP服务端
const server = new Server(
  { name: "feishu-md-docx-mcp", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_docx",
      description: "创建一个新的飞书docx文档",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "文档标题" },
        },
        required: ["title"],
      },
    },
    {
      name: "update_docx_content_with_markdown",
      description: "使用markdown内容更新docx文档内容",
      inputSchema: {
        type: "object",
        properties: {
          docx_document_id: { type: "string", description: "docx文档ID" },
          markdown_content: {
            type: "string",
            description: "markdown格式的内容",
          },
        },
        required: ["docx_document_id", "markdown_content"],
      },
    },
  ],
}));

// 实现工具调用逻辑
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      // 创建文档
      case "create_docx":
        const { title } = args as { title: string };
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
      // 用markdown更新文档内容
      case "update_docx_content_with_markdown":
        const { docx_document_id, markdown_content } = args as {
          docx_document_id: string;
          markdown_content: string;
        };
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
      default:
        throw new Error("未知的工具名称");
    }
  } catch (err) {
    console.error(JSON.stringify(err));
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
