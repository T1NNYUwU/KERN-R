import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from './redis.service';

@Injectable()
export class VideoQueueService {
  private readonly videoQueue: Queue;

  constructor(private readonly redisService: RedisService) {
    this.videoQueue = new Queue('video-rendering', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    });
  }

  async addVideoJob(data: any): Promise<void> {
    await this.videoQueue.add('render', data);
  }
}