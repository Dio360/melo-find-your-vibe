import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3-compatible object storage (Phase 3).
 * Local: Moto S3. Staging/prod: Cloudflare R2 — same API, different env.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? 'melo-audio';

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:5000',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'test',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'test',
      },
    });
  }

  async onModuleInit() {
    // Retry briefly — object storage may still be starting. Never crash boot.
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        await this.ensureBucket();
        return;
      } catch (err) {
        this.logger.warn(`Object storage unavailable (attempt ${attempt}/8)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    this.logger.error('Object storage unreachable — playback URLs will fail until it returns');
  }

  async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async putObject(key: string, body: Buffer, contentType = 'audio/mpeg') {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  presignedGetUrl(
    key: string,
    expiresIn = Number(process.env.PLAYBACK_URL_TTL_SECONDS ?? 900),
  ) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  /** Presigned PUT for user/AI uploads. Objects land under `uploads/` and are
   * never playable until an admin approves the track (rights gate requires
   * active track + active right + ready/demo asset). */
  presignedPutUrl(key: string, contentType = 'audio/mpeg', expiresIn = 900) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn },
    );
  }
}
