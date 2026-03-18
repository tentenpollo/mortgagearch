import { put, del, head } from "@vercel/blob";

export const storageService = {
  async save(path: string, body: Buffer | Blob, contentType: string) {
    const blob = await put(path, body, {
      contentType,
      addRandomSuffix: false,
      access: "public",
    });
    return blob.url;
  },

  async head(path: string) {
    return await head(path);
  },

  async remove(path: string) {
    await del(path);
  },
};
