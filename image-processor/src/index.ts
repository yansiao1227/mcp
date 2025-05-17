import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { z } from "zod";
import fs from "fs/promises";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zodToJsonSchema } from "zod-to-json-schema";

// 获取工具输入的 zod schema
const ToolInputSchema = ToolSchema.shape.inputSchema;
// 推断工具输入类型
type ToolInput = z.infer<typeof ToolInputSchema>;

// 解析命令行参数，去除前两个（node 路径和脚本路径）
const args = process.argv.slice(2);
if (args.length === 0) {
  // 如果没有传递参数，输出用法并退出
  console.error(
    "Usage: mcp-server-filesystem <allowed-directory> [additional-directories...]"
  );
  process.exit(1);
}

// 未使用
// // 路径标准化函数，确保路径格式统一
// function normalizePath(p: string): string {
//   return path.normalize(p);
// }

// // 支持 ~ 作为家目录的路径展开
// function expandHome(filepath: string): string {
//   if (filepath.startsWith("~/")) {
//     return path.join(os.homedir(), filepath.slice(1));
//   }
//   return filepath;
// }

// // 允许访问的目录列表，全部标准化为绝对路径
// const allowedDirectories = args.map((dir) =>
//   normalizePath(path.resolve(expandHome(dir)))
// );

// 检查每个目录是否存在且为目录，否则退出
await Promise.all(
  args.map(async (dir) => {
    try {
      const stats = await fs.stat(dir);
      if (!stats.isDirectory()) {
        console.error(`Error: ${dir} is not a directory`);
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error processing directory ${dir}: ${e}`);
      process.exit(1);
    }
  })
);

// 定义读取图片工具的参数 schema，要求 path 为字符串
const ReadImageArgsSchema = z.object({ path: z.string() });

// 创建 MCP 服务器实例
const server = new Server(
  {
    name: "image-processor", // 服务名称
    version: "1.0.0", // 版本号
  },
  {
    capabilities: {
      tools: {}, // 工具能力（此处为空，后续通过 handler 注册）
    },
  }
);

// 注册 ListTools handler，返回可用工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read-image", // 工具名称
        description: "Read an image from the filesystem", // 工具描述
        inputSchema: zodToJsonSchema(ReadImageArgsSchema) as ToolInput, // 工具输入参数的 JSON schema
      },
    ],
  };
});

// 注册 CallTool handler，处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "read-image") {
      // 校验参数
      const parsed = ReadImageArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error("Invalid arguments");
      }
      const imagePath = parsed.data.path;
      // 读取图片文件为 Buffer
      const imageBuffer = await fs.readFile(imagePath);
      // 转为 base64 字符串
      const base64String = imageBuffer.toString("base64");
      // 获取文件扩展名
      const ext = path.extname(imagePath).toLowerCase();
      // 根据扩展名确定 MIME 类型
      const mimeType =
        {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        }[ext] || "application/octet-stream";
      // 返回图片内容和类型
      return {
        content: [
          {
            type: "image",
            data: base64String,
            mimeType: mimeType,
          },
        ],
      };
    } else {
      // 未知工具名，抛出异常
      throw new Error("Unknown tool");
    }
  } catch (e) {
    // 捕获异常并抛出带详细信息的错误
    throw new Error(`Error processing tool ${name}: ${e}`);
  }
});

// 主函数，启动服务器并监听 stdio
async function main() {
  const transport = new StdioServerTransport(); // 使用标准输入输出作为传输层
  await server.connect(transport); // 连接服务器
  console.error("Image processor running on stdio"); // 输出启动信息
}

// 启动主函数，捕获异常并退出
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
