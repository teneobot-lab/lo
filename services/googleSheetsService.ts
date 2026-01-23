
export const googleSheetsService = {
  sync: async (url: string, payload: { type: string; data: any[] }) => {
    if (!url || !url.startsWith('http')) {
      throw new Error("URL Google Apps Script tidak valid.");
    }

    try {
      // Menggunakan mode 'no-cors' atau POST biasa ke Apps Script
      // Apps Script membutuhkan POST request dengan payload JSON
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Apps Script seringkali bermasalah dengan CORS, no-cors adalah workaround umum
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Karena no-cors, kita tidak bisa membaca response body, 
      // tapi jika tidak ada exception, kita asumsikan terkirim.
      return { success: true, message: "Data terkirim ke Google Sheets!" };
    } catch (error: any) {
      console.error("Sync Error:", error);
      throw new Error(error.message || "Gagal menghubungi Google Apps Script.");
    }
  }
};
