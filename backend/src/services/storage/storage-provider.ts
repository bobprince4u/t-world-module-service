export interface UploadedAsset {
  publicId: string;
  url: string;
}

export interface PromotedAsset {
  key: string;
  url: string;
}

export interface CloudinaryStorageProvider {
  upload(
    buffer: Buffer,
    options: {
      filename: string;
      mimeType: string;
    },
  ): Promise<UploadedAsset>;
}

export interface S3StorageProvider {
  promote(input: {
    sourceUrl: string;
    filename: string;
    mimeType: string;
  }): Promise<PromotedAsset>;
}
