import {
    Client
} from "@modelcontextprotocol/sdk/client/index.js";

import {
    StdioClientTransport
} from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {

    console.log("Starting MCP test client...");

    // Start the MCP server as a child process
    const transport = new StdioClientTransport({
        command: "npx",
        args: [
            "tsx",
            "mcp-server/src/index.ts"
        ]
    });

    // Create MCP client
    const client = new Client({
        name: "production-investigator-test-client",
        version: "1.0.0"
    });

    // Connect to MCP server
    await client.connect(transport);

    console.log("Connected to MCP server!");

    // Get available tools
    const tools = await client.listTools();

    console.log("\nAvailable MCP tools:");

    for (const tool of tools.tools) {
        console.log(`- ${tool.name}`);
    }

    // --------------------------------
    // Test 1: Search logs
    // --------------------------------

    console.log("\n-----------------------------");
    console.log("Testing search_logs()");
    console.log("-----------------------------");

    const logResult = await client.callTool({
        name: "search_logs",
        arguments: {
            correlationId: "CORR-1001"
        }
    });

    console.log(logResult);

    // --------------------------------
    // Test 2: Get deployments
    // --------------------------------

    console.log("\n-----------------------------");
    console.log("Testing get_recent_deployments()");
    console.log("-----------------------------");

    const deploymentResult = await client.callTool({
        name: "get_recent_deployments",
        arguments: {
            service: "credit-service"
        }
    });

    console.log(deploymentResult);

    // --------------------------------
    // Test 3: Service health
    // --------------------------------

    console.log("\n-----------------------------");
    console.log("Testing get_service_health()");
    console.log("-----------------------------");

    const healthResult = await client.callTool({
        name: "get_service_health",
        arguments: {
            service: "credit-service"
        }
    });

    console.log(healthResult);

    console.log("\nAll MCP tests completed.");
}

main().catch((error) => {
    console.error("\nMCP test failed:");
    console.error(error);
});