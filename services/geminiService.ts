import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

export const geminiService = {
  askAssistant: async (
    prompt: string, 
    inventory: InventoryItem[], 
    recentTransactions: Transaction[]
  ): Promise<string> => {
    
    // VALIDATION: Check for empty key from env injection
    const key = process.env.API_KEY;
    if (!key || key.trim() === '') {
        return "⚠️ API Key Missing.\n\nPlease configure the 'API_KEY' in your Vercel Project Settings (Environment Variables) or use a local .env file.";
    }

    // Create a new instance right before making an API call to ensure current key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // OPTIMIZATION: Compact the data to save tokens and speed up processing.
    // We only send essential fields.
    const inventorySummary = inventory.map(i => 
      `${i.name} (${i.stock} ${i.unit})`
    ).join(', ');

    // Only last 3 transactions for speed context
    const transactionSummary = recentTransactions.slice(0, 3).map(t => 
      `${t.type} ${t.items.length} items (Rp${t.totalValue})`
    ).join('; ');

    const systemInstruction = `
      You are Nexus AI, a smart assistant for the Nexus WMS application.
      
      YOUR CAPABILITIES:
      1. General Assistant: You can chat about anything (business tips, writing emails, coding, general knowledge). You are NOT restricted to warehouse topics only.
      2. Warehouse Expert: You have access to the current stock data below. Use it ONLY if the user asks about stock, inventory, or sales.

      DATA CONTEXT (Use only if relevant):
      - Items: ${inventorySummary}
      - Recent Activity: ${transactionSummary}

      STYLE:
      - Be concise, professional, and fast.
      - If asked about generic things (e.g., "Write a poem"), just do it. Do not mention inventory.
      - If asked about stock, analyze the data provided above.
      - Currency: Indonesian Rupiah (Rp).
    `;

    try {
      // Using 'gemini-3-pro-preview' for complex text and reasoning tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          // SPEED OPTIMIZATION: Disable thinking budget for instant responses
          thinkingConfig: { thinkingBudget: 0 }, 
          temperature: 0.7, // Balance between creativity and accuracy
        }
      });
      // ACCESS the .text property directly (not a method)
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm currently offline or the API key is invalid.";
    }
  },

  generateInsights: async (inventory: InventoryItem[]): Promise<string> => {
    // VALIDATION Check
    const key = process.env.API_KEY;
    if (!key || key.trim() === '') {
        return "⚠️ API Key Missing. Check Vercel Env Vars.";
    }

    // Create a new instance right before making an API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Optimized prompt for speed
    const dataContext = JSON.stringify(inventory.map(i => ({ n: i.name, s: i.stock, m: i.minLevel, p: i.price })));
    
    const prompt = `
      Data: ${dataContext}
      Task: Short executive summary (bullet points).
      1. Low stock items?
      2. Highest value asset?
      3. One Reorder recommendation.
      Keep it very brief.
    `;

    try {
      // Using 'gemini-3-flash-preview' for basic summarization tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 0 }
        }
      });
      // ACCESS the .text property directly
      return response.text || "No insights available.";
    } catch (error) {
      return "Unable to generate insights.";
    }
  }
};
