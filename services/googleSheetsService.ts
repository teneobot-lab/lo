
export const googleSheetsService = {
  sync: async (url: string, payload: { type: string; data: any[] }) => {
    if (!url || !url.startsWith('http')) {
      throw new Error("URL Google Apps Script tidak valid.");
    }

    try {
      // Mengirim data ke Google Apps Script Web App
      // Menggunakan mode 'no-cors' karena Apps Script seringkali sulit mengembalikan response CORS yang valid
      // tapi data tetap akan terproses di sisi server Google.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return { success: true, message: "Perintah sinkronisasi terkirim!" };
    } catch (error: any) {
      console.error("Sync Error:", error);
      throw new Error(error.message || "Gagal menghubungi Google Apps Script.");
    }
  }
};
