import { Controller, Get, Param, Post, Body, Delete } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Post('set')
  async setKey(
    @Body('key') key: string,
    @Body('value') value: string,
  ): Promise<string> {
    await this.redisService.set(key, value);
    return `Key ${key} set successfully.`;
  }

  @Get('get/:key')
  async getKey(@Param('key') key: string): Promise<string | null> {
    return await this.redisService.get(key);
  }

  @Delete('delete/:key')
  async deleteKey(@Param('key') key: string): Promise<string> {
    await this.redisService.delete(key);
    return `Key ${key} deleted successfully.`;
  }
}
