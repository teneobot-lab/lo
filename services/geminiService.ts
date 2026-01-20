import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

// In a real app, this comes from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  askAssistant: async (
    prompt: string, 
    inventory: InventoryItem[], 
    recentTransactions: Transaction[]
  ): Promise<string> => {
    
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
      // Use gemini-2.5-flash-latest for maximum speed on general tasks
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest', 
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          // SPEED OPTIMIZATION: Disable thinking budget for instant responses
          thinkingConfig: { thinkingBudget: 0 }, 
          temperature: 0.7, // Balance between creativity and accuracy
        }
      });
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm currently offline or the API key is invalid.";
    }
  },

  generateInsights: async (inventory: InventoryItem[]): Promise<string> => {
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
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "No insights available.";
    } catch (error) {
      return "Unable to generate insights.";
    }
  }
};