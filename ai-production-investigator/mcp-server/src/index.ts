import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import fs from "fs";
import path from "path";

const server = new McpServer({
    name: "production-investigator",
    version: "1.0.0",
});

const logsPath = path.resolve("data/logs.json");

function readLogs() {
    return JSON.parse(fs.readFileSync(logsPath, "utf-8"));
}

server.tool(
    "search_logs",
    "Search synthetic production logs by service, correlation ID or keyword",
    {
        service: z.string().optional(),
        correlationId: z.string().optional(),
        orderId: z.string().optional(),
        keyword: z.string().optional(),
    },

    async ({ service, correlationId, orderId, keyword }) => {
        let logs = readLogs();

        if (service) {
            logs = logs.filter((log: any) =>
                log.service === service
            );
        }

        if (correlationId) {
            logs = logs.filter((log: any) =>
                log.correlationId === correlationId
            );
        }

        if (orderId) {
            logs = logs.filter(
                (log: any) =>
                    log.orderId === orderId
            );
        }

        if (keyword) {
            logs = logs.filter((log: any) =>
                log.message.toLowerCase().includes(
                    keyword.toLowerCase()
                )
            );
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(logs, null, 2),
                }
            ]
        }

    }
)

const deploymentsPath = path.resolve("data/deployments.json");


// Add deployment investigation tool
server.tool(
    "get_recent_deployments",
    "Get recent production deployments for a service",
    {
        service: z.string().optional(),
    },
    async ({ service }) => {
        let deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

        if (service) {
            deployments = deployments.filter((deployment: any) => deployment.service === service);
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(deployments, null, 2),
                },
            ],
        };
    }
);

// Add service health check tool

const servicesPath = path.resolve("data/services.json");

server.tool(
    "get_service_health",
    "Get current health of production services",
    {
        service: z.string().optional(),
    },
    async ({ service }) => {
        let services = JSON.parse(fs.readFileSync(servicesPath, "utf-8"));

        if (service) {
            services = services.filter((item: any) => item.name === service);
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(services, null, 2),
                },
            ],
        };
    }
);

// console.error("Starting Production Investigator MCP Server...");

const transport = new StdioServerTransport();

await server.connect(transport);

// console.error("MCP Server connected and waiting for client...");