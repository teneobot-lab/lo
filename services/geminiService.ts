
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Transaction } from "../types";

export const geminiService = {
  askAssistant: async (
    prompt: string, 
    inventory: InventoryItem[], 
    recentTransactions: Transaction[]
  ): Promise<string> => {
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    // Ringkasan data biar AI tetap punya konteks gudang tapi hemat memori
    const inventorySummary = inventory.slice(0, 50).map(i => 
      `${i.name}: ${i.stock}`
    ).join(', ');

    const systemInstruction = `
      NAMA AGEN: Nexus AI (Versi Ultra-Flexible)
      PERAN: Kamu adalah asisten pribadi multifungsi yang terintegrasi di sistem Nexus WMS.

      KEMAMPUAN UTAMA:
      1. ASISTEN UMUM: Kamu bisa bantu bikin email, jadwal, kasih saran bisnis, coding, ngerjain tugas, atau sekadar teman curhat/ngobrol santai.
      2. PENULIS KREATIF: Bisa bikin caption sosmed, draf surat resmi, atau pesan WhatsApp gaul.
      3. AHLI GUDANG (ON-DEMAND): Kamu punya akses ke data stok Nexus (Data: ${inventorySummary}). Gunakan data ini HANYA JIKA user bertanya soal stok, barang, atau operasional gudang. Jika user tanya hal umum, fokuslah pada hal umum.

      GAYA BAHASA:
      - Gunakan Bahasa Indonesia sebagai bahasa utama.
      - Jika user minta "Bahasa Gaul", gunakan gaya anak Jakarta/gaul (pake 'gue', 'lo', 'bang', 'gercep', dll) tapi tetap sopan.
      - Default: Profesional, cerdas, solutif, dan sedikit humoris agar tidak kaku.

      INSTRUKSI KHUSUS:
      - Jangan pernah bilang "Saya hanya bot gudang". Kamu adalah AI canggih.
      - Jika user tanya "Siapa kamu?", jawablah sebagai Nexus AI, asisten cerdas yang siap bantu apa aja.
      - Kamu dilarang memberikan informasi yang berbahaya atau ilegal.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.9, 
          topP: 0.95,
          topK: 64,
        }
      });
      
      return response.text || "Waduh, otak saya lagi nge-blank bentar Bang. Coba tanya lagi deh.";
    } catch (error: any) {
      console.error("Gemini Error:", error);
      if (error.message?.includes("403")) return "❌ Akses ditolak. Silakan hubungi administrator sistem untuk bantuan lebih lanjut.";
      return "⚠️ Lagi ada gangguan koneksi ke server AI nih Bang. Coba cek internet atau refresh halaman ya.";
    }
  },

  generateInsights: async (inventory: InventoryItem[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const prompt = `
      Data: ${JSON.stringify(inventory.slice(0, 20).map(i => ({ n: i.name, s: i.stock })))}
      Tugas: Berikan analisa singkat & padat ala CEO Business Report dalam Bahasa Indonesia.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Kamu adalah Business Analyst handal." }
      });
      return response.text || "Gagal dapet insight.";
    } catch (error) {
      return "Gagal generate laporan.";
    }
  },

  searchYoutubeVideos: async (query: string): Promise<Array<{ title: string, channel: string, url: string }>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: `Search for top 5 YouTube videos matching: "${query}". Return the song/video title, the channel name (artist), and the URL.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Title of the video/song" },
                channel: { type: Type.STRING, description: "Channel name or Artist name" },
                url: { type: Type.STRING, description: "YouTube link" }
              },
              required: ["title", "channel", "url"]
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return [];
    } catch (error) {
      console.error("AI Search Error:", error);
      return [];
    }
  },

  parseTransactionDocument: async (base64Data: string, mimeType: string): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
      const prompt = `
        Analyze this Purchase Order / Invoice document. Extract the following details:
        - Supplier Name (field: supplier)
        - PO Number (field: poNumber)
        - Date (field: date) - Convert strictly to YYYY-MM-DD format.
        - Items (field: items) - A list containing:
          - sku (Item Code/Kode Barang)
          - name (Item Name/Nama Barang)
          - qty (Quantity) - as Number
          - uom (Unit/Satuan)
          - unitPrice (Price per unit) - as Number

        Ensure numeric values are parsed correctly (remove commas if used as thousands separators).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplier: { type: Type.STRING },
              poNumber: { type: Type.STRING },
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sku: { type: Type.STRING },
                    name: { type: Type.STRING },
                    qty: { type: Type.NUMBER },
                    uom: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER }
                  },
                  required: ["name", "qty"]
                }
              }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return {};
    } catch (error) {
      console.error("Gemini Document Parse Error:", error);
      throw new Error("Gagal menganalisis dokumen.");
    }
  }
};
