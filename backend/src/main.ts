import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
6:   const corsOrigins = process.env.CORS_ORIGIN 
7:     ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
8:     : '*';
9: 
10:   app.enableCors({
11:     origin: corsOrigins,
12:     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
13:     allowedHeaders: '*',
14:     credentials: true,
15:   });
  const port = process.env.PORT ?? 3005;
  // Use 0.0.0.0 to allow external connections (crucial for Docker/Cloud deployment)
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on port: ${port}`);
}
bootstrap();
