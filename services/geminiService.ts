import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

// In a real app, this comes from process.env.API_KEY.
// The strict prompt rules require assuming process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Sorry, I am currently offline or check your API Key configuration.";
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
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "No insights available.";
    } catch (error) {
      return "Unable to generate insights at this moment.";
    }
  }
};
