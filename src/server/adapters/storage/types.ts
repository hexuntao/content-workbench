export interface UploadFileInput {
  key: string;
  contentType: string;
  body: string | Uint8Array;
}

export interface UploadFileOutput {
  key: string;
  url?: string;
  size?: number;
}

export interface StorageAdapter {
  upload(input: UploadFileInput): Promise<UploadFileOutput>;
}
