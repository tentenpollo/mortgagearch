import { put, del } from "@vercel/blob";

export const storageService = {
  async upload(path: string, file: Buffer | Blob, contentType: string) {
    const blob = await put(path, file, {
      contentType,
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  },

  async remove(url: string) {
    await del(url);
  },
};
