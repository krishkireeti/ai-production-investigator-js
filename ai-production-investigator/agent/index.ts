import "dotenv/config";

import OpenAI from "openai";

import {
    Client
} from "@modelcontextprotocol/sdk/client/index.js";

import {
    StdioClientTransport
} from "@modelcontextprotocol/sdk/client/stdio.js";

import readline from "readline";

// ------------------------------------
// 1. OpenAI client
// ------------------------------------

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ------------------------------------
// 2. Connect to MCP server
// ------------------------------------

const transport = new StdioClientTransport({
    command: "npx",
    args: [
        "tsx",
        "mcp-server/src/index.ts"
    ]
});

const mcpClient = new Client({
    name: "production-investigator-agent",
    version: "1.0.0"
});

// ------------------------------------
// 3. Convert MCP tools to OpenAI tools
// ------------------------------------

async function getOpenAITools() {

    const result = await mcpClient.listTools();

    return result.tools.map((tool: any) => ({
        type: "function",

        name: tool.name,

        description: tool.description,

        parameters: tool.inputSchema
    }));
}

// ------------------------------------
// 4. Execute MCP tool
// ------------------------------------

async function executeMCPTool(
    toolName: string,
    arguments_: any
) {

    console.log(
        `\n🔧 Agent calling MCP tool: ${toolName}`
    );

    console.log(
        "Arguments:",
        arguments_
    );

    const result = await mcpClient.callTool({
        name: toolName,
        arguments: arguments_
    });

    return result;
}

// ------------------------------------
// 5. Ask AI agent
// ------------------------------------

async function investigate(
    userQuestion: string
) {

    const tools = await getOpenAITools();

    let response = await openai.responses.create({

        model: "gpt-6-luna",

        instructions: `
You are an AI Production Investigation Agent.

Your job is to investigate production incidents
using the available MCP tools.

Rules:

1. Use MCP tools to gather evidence.
2. Do not invent production information.
3. If you need logs, search the logs.
4. If you need deployment information, check deployments.
5. If you need service status, check service health.
6. Clearly separate evidence from assumptions.
7. Give a concise root-cause analysis.
8. Mention relevant correlation IDs, services,
   versions and timestamps when available.
`,

        input: userQuestion,

        tools: tools as any
    });

    console.log("\nOpenAI response output:");

    for (const item of response.output) {
        console.log(item);
    }

    // ------------------------------------
    // 6. Agent tool-calling loop
    // ------------------------------------

    while (true) {

        const toolCalls = response.output.filter(
            (item) => item.type === "function_call"
        );

        // No more tools needed
        if (toolCalls.length === 0) {
            break;
        }

        const toolOutputs = [];

        for (const call of toolCalls) {

            const arguments_ =
                JSON.parse(call.arguments);

            const result = await executeMCPTool(
                call.name,
                arguments_
            );

            toolOutputs.push({
                type: "function_call_output",

                call_id: call.call_id,

                output: JSON.stringify(result)
            });
        }

        // Give MCP results back to OpenAI
        response = await openai.responses.create({

            model: "gpt-6-luna",

            instructions: `
You are an AI Production Investigation Agent.

Analyze the MCP tool results and continue
investigating if more information is required.

Do not invent facts.

When you have enough evidence, provide:

1. Root cause
2. Evidence
3. Impact
4. Possible contributing factor
5. Recommended next step
`,

            previous_response_id: response.id,

            input: toolOutputs as any,

            tools: tools as any
        });
    }

    return response.output_text;
}

// ------------------------------------
// 7. Terminal prompt
// ------------------------------------

async function main() {

    console.log(
        "=========================================="
    );

    console.log(
        " AI Production Investigation Agent"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "\nConnecting to MCP server..."
    );

    await mcpClient.connect(transport);

    console.log(
        "Connected to MCP server!"
    );

    console.log(
        "\nAvailable MCP tools:"
    );

    const tools = await mcpClient.listTools();

    for (const tool of tools.tools) {
        console.log(`- ${tool.name}`);
    }

    console.log(
        "\nType your production question."
    );

    console.log(
        "Type 'exit' to stop."
    );

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = () => {

        rl.question(
            "\n> ",
            async (question) => {

                if (
                    question.toLowerCase() === "exit"
                ) {

                    rl.close();

                    await mcpClient.close();

                    return;
                }

                try {

                    console.log(
                        "\n🤖 Agent investigating..."
                    );

                    const answer =
                        await investigate(question);

                    console.log(
                        "\n=========================================="
                    );

                    console.log("AI Investigation:");

                    console.log(
                        "=========================================="
                    );

                    console.log(answer);

                } catch (error) {

                    console.error(
                        "\nAgent error:"
                    );

                    console.error(error);
                }

                askQuestion();
            }
        );
    };

    askQuestion();
}

main().catch((error) => {

    console.error(
        "\nApplication failed:"
    );

    console.error(error);

});