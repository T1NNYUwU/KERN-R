import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Removed @Get() route so it doesn't block ServeStaticModule from serving index.html
}
