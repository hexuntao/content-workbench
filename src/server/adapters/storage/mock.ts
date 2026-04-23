import type {
  StorageAdapter,
  UploadFileInput,
  UploadFileOutput,
} from "@/server/adapters/storage/types";

function getBodySize(body: string | Uint8Array): number {
  return typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
}

export const mockStorageAdapter: StorageAdapter = {
  async upload(input: UploadFileInput): Promise<UploadFileOutput> {
    return {
      key: input.key,
      url: `mock://storage/${input.key}`,
      size: getBodySize(input.body),
    };
  },
};
