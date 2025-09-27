import { ethers } from "ethers";
import { StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { START, END } from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { systemPrompt } from "./contractTemplate";
import { ChatOpenAI } from "@langchain/openai";
import {createZGComputeNetworkBroker} from "@0glabs/0g-serving-broker";

import { contractsArray } from "@/lib/contractCompile";
import fs from 'fs/promises';
import path from 'path';
import { githubVerificationNode, isGitHubVerificationRequest } from "./nodes/githubVerification";


const model = new ChatGroq({
    modelName: "llama-3.3-70b-versatile",
    temperature: 0.7,
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

// 0G Compute Network model with official provider
const zgProviderAddress = "0xf07240Efa67755B5311bc75784a061eDB47165Dd"; // Official llama-3.3-70b-instruct provider

// Initialize 0G Compute Network model
const initZGModel = async () => {
    try {
        const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
        const wallet = new ethers.Wallet(process.env.ZG_PRIVATE_KEY!, provider);
        const broker = await createZGComputeNetworkBroker(wallet);
        
        // Acknowledge the provider
        await broker.inference.acknowledgeProviderSigner(zgProviderAddress);
        
        // Get service metadata
        const { endpoint, model: modelName } = await broker.inference.getServiceMetadata(zgProviderAddress);
        
        return { broker, endpoint, modelName };
    } catch (error) {
        console.error("Failed to initialize 0G model:", error);
        return null;
    }
};

// Create 0G model instance
const createZGChatModel = async (question: string) => {
    const zgConfig = await initZGModel();
    if (!zgConfig) return null;
    
    const { broker, endpoint, modelName } = zgConfig;
    const headers = await broker.inference.getRequestHeaders(zgProviderAddress, question);
    
    return new ChatOpenAI({
        modelName: modelName,
        temperature: 0.7,
        openAIApiKey: "", // Empty string as per 0G docs
        configuration: {
            baseURL: endpoint,
        }
    });
};

type guildState = {
    input: string,
    contractData?: string | null,
    chatHistory?: BaseMessage[],
    messages?: any[] | null,
    operation?: string,
    result?: string,
    githubVerification?: any,
}

export default function nodegraph() {
    const graph = new StateGraph<guildState>({
        channels: {
            messages: { value: (x: any[], y: any[]) => x.concat(y) },
            input: { value: null },
            result: { value: null },
            contractData: { value: null },
            chatHistory: { value: null },
            operation: { value: null },
            githubVerification: { value: null }
        }
    });

    // Initial Node: Routes user requests to the appropriate node
    graph.addNode("initial_node", async (state: guildState) => {
        const SYSTEM_TEMPLATE = `You are an AI agent for Trakt, a revolutionary platform that transforms human chat into structured smart contracts. Trakt creates programmable escrow agreements for digital goods, services, rentals, and micro-loans using autonomous agents on the 0G blockchain.

Currently, Trakt supports:
- NFT to 0G token exchanges with secure escrow
- 0G to NFT trading with automated verification

Future possibilities include:
- Autonomous agents acting as incorruptible middlemen for digital agreements
- Programmable trust for complex multi-party transactions
- AI-powered contract verification and execution
- Trustless deals validated by APIs and browser agents
- Templates for game keys, SaaS subscriptions, domain leases, gift cards, bounties, and equipment rentals
- Smart contract automation for recurring digital services

Based on the user's input, respond with ONLY ONE of the following words:
- "contribute_node" if the user wants to report any errors or contribute to the project
- "escrow_Node" if the request is related to creating escrow smart contracts.
- "github_verification" if the request is about verifying GitHub repositories or deployments
- "unknown" if the request doesn't fit into any of the above categories

Context for decision-making:
- Escrow smart contracts involve secure peer-to-peer exchanges between NFTs and 0G tokens on the 0G blockchain.
- The platform currently supports only NFT to 0G token exchanges with automated verification and trustless execution.
- User contributions can include reporting errors, suggesting improvements, or offering to help develop the project.

Respond strictly with ONLY ONE of these words: "contribute_node", "escrow_Node", "github_verification", or "unknown". Provide no additional text or explanation.`;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        const response = await prompt.pipe(model).invoke({ input: state.input, chat_history: state.chatHistory });

        console.log(response.content, "Initial Message");

        const content = response.content as string;
        
        // Check if it's a GitHub verification request using the helper function
        if (isGitHubVerificationRequest(state.input)) {
            return { messages: [response.content], operation: "github_verification" };
        }
        
        if (content.includes("contribute_node")) {
            return { messages: [response.content], operation: "contribute_node" };
        } else if (content.includes("escrow_Node")) {
            return { messages: [response.content], operation: "escrow_Node" };
        } else if (content.includes("github_verification")) {
            return { messages: [response.content], operation: "github_verification" };
        } else if (content.includes("unknown")) {
            const CONVERSATIONAL_TEMPLATE = `You are an AI assistant for Trakt, a revolutionary platform that transforms human chat into structured smart contracts. Trakt creates programmable escrow agreements for digital goods, services, rentals, and micro-loans using autonomous agents on the 0G blockchain.

            Key Features:
            - Smart Contract Generation: Transform natural language conversations into secure escrow smart contracts on 0G blockchain
            - NFT to 0G Token Support: Currently supports NFT to 0G token exchanges with automated verification
            - User Interaction: Conversational interface for creating escrow agreements without technical knowledge
            - Security Focus: All contracts include built-in verification and trustless execution mechanisms
            - Autonomous Agents: AI-powered agents that act as incorruptible middlemen for digital agreements

            Current Capabilities:
            - NFT to 0G token exchanges with secure escrow
            - 0G to NFT trading with automated verification
            - Automated contract deployment with security verification on 0G blockchain
            - Real-time chat-to-contract conversion using AI

            Future Possibilities:
            - Programmable trust for complex multi-party digital agreements
            - Templates for game keys, SaaS subscriptions, domain leases, and more
            - API and browser agent verification for real-world use cases

            If the user's request is unrelated to our services, politely explain that we cannot process their request and suggest something related to Trakt that they might find interesting. Always maintain a friendly and helpful tone, and don't give long responses; keep it short or medium length and concise in markdown format.`;

            const conversationalPrompt = ChatPromptTemplate.fromMessages([
                ["system", CONVERSATIONAL_TEMPLATE],
                new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
                ["human", "{input}"]
            ]);
            const summaryModel = model.withConfig({ runName: "Summarizer" });
            const conversationalResponse = await conversationalPrompt.pipe(summaryModel).invoke({ input: state.input, chat_history: state.chatHistory });

            return { result: conversationalResponse.content as string, messages: [conversationalResponse.content] };
        } 
    });

    //@ts-ignore
    graph.addEdge(START, "initial_node");
    //@ts-ignore
    graph.addConditionalEdges("initial_node",
        async (state) => {
            if (!state.messages || state.messages.length === 0) {
                console.error("No messages in state");
                return "end";
            }

            if (state.operation === "contribute_node") {
                return "contribute_node";
            } else if (state.operation === "escrow_Node") {
                return "escrow_node";
            } else if (state.operation === "github_verification") {
                return "github_verification";
            } else if (state.result) {
                return "end";
            }
        },
        {
            contribute_node: "contribute_node",
            escrow_node: "escrow_node",
            github_verification: "github_verification",
            end: END,
        }
    );

    // Add the contribute_node
    graph.addNode("contribute_node", async (state: guildState) => {
        console.log("Processing contribution or error report");

        const CONTRIBUTE_TEMPLATE = `You are an AI assistant for Trakt, tasked with processing user contributions and error reports. Your job is to analyze the user's input and create a structured JSON response containing the following fields:

        - type: Either "error_report" or "code_contribution"
        - description: A brief summary of the error or contribution
        - details: More detailed information about the error or contribution
        - impact: Potential impact of the error or the benefit of the contribution
        - priority: Suggested priority (low, medium, high)

        Based on the user's input, create a JSON object with these fields. Be concise but informative in your responses.`;

        const contributePrompt = ChatPromptTemplate.fromMessages([
            ["system", CONTRIBUTE_TEMPLATE],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        try {
            const response = await contributePrompt.pipe(model).invoke({ 
                input: state.input, 
                chat_history: state.chatHistory
            });

            const contributionData = JSON.parse(response.content as string);

            // Save the contribution data to a file
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const fileName = `contribution_${timestamp}.json`;
            const filePath = path.join(process.cwd(), 'contributions', fileName);

            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(contributionData, null, 2));

            return { 
                result: "Thank you for your contribution. Your response has been received successfully and will be reviewed by our team.",
                messages: [response.content]
            };
        } catch (error) {
            console.error("Error in contribute_node:", error);
            return { 
                result: "Your error has been received successfully and will be reviewed by our team.",
                messages: ["Error processing contribution"]
            };
        }
    });

    // Add the Escrow_Node with 0G model integration
    graph.addNode("escrow_node", async (state: guildState) => {
        console.log("Generating Escrow contract");

        // Since contractsArray now has only one entry, directly use it
        const context = contractsArray[0].contractCode;

        const escrowPrompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
            ["human", "{input}"]
        ]);

        try {
            // Try 0G model first, fallback to Groq if needed
            let response;
            const zgModel = await createZGChatModel(state.input);
            
            if (zgModel && process.env.ZG_PRIVATE_KEY) {
                console.log("Using 0G Compute Network model");
                response = await escrowPrompt.pipe(zgModel).invoke({ 
                    input: state.input, 
                    chat_history: state.chatHistory,
                    context: context
                });
            } else {
                console.log("Fallback to Groq model");
                response = await escrowPrompt.pipe(new ChatGroq({
                    modelName: "llama-3.3-70b-versatile",
                    temperature: 0.9,
                    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
                })).invoke({ 
                    input: state.input, 
                    chat_history: state.chatHistory,
                    context: context
                });
            }

            const content = response.content as string;

            const match = content.match(/```solidity[\s\S]*?```/); // Updated regex to match the 'solidity' language specifier
            let contractData = null;
            let resultData = content;

            if (match) {
                // Remove the backticks and 'solidity' language specifier
                contractData = match[0].replace(/```solidity\s?|\s?```/g, '').trim();
                // Remove the contract code from the result
                resultData = content.replace(match[0], '').trim();
            }

            return { 
                contractData: contractData,
                result: resultData,
                messages: [content] 
            };
        } catch (error) {
            console.error("Error in escrow_node:", error);
            return { 
                result: "Error generating Escrow contract", 
                messages: ["I apologize, but there was an error generating the Escrow contract. Please try again or provide more information about your requirements."]
            };
        }
    });

    // Add the GitHub verification node
    graph.addNode("github_verification", githubVerificationNode);

    //@ts-ignore    
    graph.addEdge("contribute_node", END);
    //@ts-ignore
    graph.addEdge("escrow_node", END);
    //@ts-ignore
    graph.addEdge("github_verification", END);

    const data = graph.compile();
    return data;
}