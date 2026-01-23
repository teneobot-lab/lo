
export const googleSheetsService = {
  sync: async (url: string, payload: { type: string; data: any[] }) => {
    if (!url || !url.startsWith('http')) {
      throw new Error("URL Google Apps Script tidak valid.");
    }

    try {
      // Kita kirim sebagai POST. 
      // Menggunakan mode 'no-cors' agar tidak terblokir oleh redirect Google (302),
      // data tetap akan sampai dan diproses oleh server Google.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return { success: true, message: "Sinkronisasi berhasil dipicu!" };
    } catch (error: any) {
      console.error("Sync Error:", error);
      throw new Error(error.message || "Gagal menghubungi Google Apps Script.");
    }
  }
};
