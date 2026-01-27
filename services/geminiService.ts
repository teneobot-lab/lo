
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

  findYoutubeVideo: async (query: string): Promise<{ title: string, url: string } | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Using 2.5 flash as it supports grounding consistently
        contents: `Find the official YouTube video URL for: "${query}". Return the specific video URL, not a channel or search result.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The exact title of the video found" },
              url: { type: Type.STRING, description: "The full YouTube URL (e.g., https://www.youtube.com/watch?v=...)" }
            },
            required: ["title", "url"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return null;
    } catch (error) {
      console.error("AI Search Error:", error);
      return null;
    }
  }
};
