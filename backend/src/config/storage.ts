import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { config } from './env.js';

const s3Config: S3ClientConfig = {
  region: 'auto',
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID || '',
    secretAccessKey: config.R2_SECRET_ACCESS_KEY || '',
  },
};

if (config.R2_ACCOUNT_ID) {
  s3Config.endpoint = `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export const s3Client = new S3Client(s3Config);
