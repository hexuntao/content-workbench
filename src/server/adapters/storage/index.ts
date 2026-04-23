import { mockStorageAdapter } from "@/server/adapters/storage/mock";
import type {
  StorageAdapter,
  UploadFileInput,
  UploadFileOutput,
} from "@/server/adapters/storage/types";

function resolveStorageAdapter(): StorageAdapter {
  return mockStorageAdapter;
}

export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return resolveStorageAdapter().upload(input);
}

export type {
  StorageAdapter,
  UploadFileInput,
  UploadFileOutput,
} from "@/server/adapters/storage/types";
