
import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

export const geminiService = {
  askAssistant: async (
    prompt: string, 
    inventory: InventoryItem[], 
    recentTransactions: Transaction[]
  ): Promise<string> => {
    
    // Construct context
    const inventorySummary = inventory.map(i => 
      `- ${i.name} (SKU: ${i.sku}): ${i.stock} ${i.unit} @ Rp${i.price}. Loc: ${i.location}. Status: ${i.active ? 'Active' : 'Inactive'}`
    ).join('\n');

    const transactionSummary = recentTransactions.slice(0, 5).map(t => 
      `- ${t.type.toUpperCase()} on ${new Date(t.date).toLocaleDateString()}: Total Rp${t.totalValue} (${t.items.length} items)`
    ).join('\n');

    const systemInstruction = `
      You are an intelligent Warehouse Assistant for 'Nexus WMS'.
      You have access to the current inventory and recent transactions.
      
      Current Inventory Data:
      ${inventorySummary}

      Recent Transactions (Last 5):
      ${transactionSummary}

      Rules:
      1. Answer questions specifically about the stock, value, and location.
      2. If asked to write emails (e.g., to suppliers), draft a professional email.
      3. Suggest business insights if asked (e.g., overstock, reorder needs).
      4. Keep answers concise and helpful.
      5. Currency is Indonesian Rupiah (Rp).
    `;

    try {
      // Always initialize with process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      
      // Access the .text property directly
      if (!response.text) {
        throw new Error("Empty response from Gemini API");
      }
      
      return response.text;
    } catch (error: any) {
      console.error("Gemini Assistant Error:", error);
      if (error.message?.includes('401')) return "Error: Unauthorized API access. Check your API Key.";
      if (error.message?.includes('429')) return "Error: AI Rate limit reached. Please wait a moment.";
      return "Sorry, I am having trouble connecting to the AI brain. Please check your internet connection.";
    }
  },

  generateInsights: async (inventory: InventoryItem[]): Promise<string> => {
    const dataContext = JSON.stringify(inventory.map(i => ({ name: i.name, stock: i.stock, min: i.minLevel, price: i.price })));
    
    const prompt = `
      Analyze this inventory data JSON: ${dataContext}.
      Provide a brief Executive Summary identifying:
      1. Items with critical low stock.
      2. Items with highest total value (asset).
      3. A quick recommendation for reordering.
      Format with markdown bullet points.
    `;

    try {
      // Always initialize with process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      // Access the .text property directly
      return response.text || "No insights could be generated for this data.";
    } catch (error) {
      console.error("Gemini Insights Error:", error);
      return "Unable to generate insights at this moment due to a technical error.";
    }
  }
};
