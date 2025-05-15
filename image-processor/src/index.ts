import {
  CallToolRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { z } from "zod";
import os from "os";
import fs from "fs/promises";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: mcp-server-filesystem <allowed-directory> [additional-directories...]"
  );
  process.exit(1);
}

function normalizePath(p: string): string {
  return path.normalize(p);
}

function expandHome(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

const allowedDirectories = args.map((dir) =>
  normalizePath(path.resolve(expandHome(dir)))
);

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

const ReadImageArgsSchema = z.object({ path: z.string() });

const server = new Server(
  {
    name: "image-processor",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "read-image") {
      const parsed = ReadImageArgsSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error("Invalid arguments");
      }
      const imagePath = parsed.data.path;
      const imageBuffer = await fs.readFile(imagePath);
      const base64String = imageBuffer.toString("base64");
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType =
        {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        }[ext] || "application/octet-stream";
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
      throw new Error("Unknown tool");
    }
  } catch (e) {
    throw new Error(`Error processing tool ${name}: ${e}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Image processor running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
