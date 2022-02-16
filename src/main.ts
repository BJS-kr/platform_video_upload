import { NestFactory } from '@nestjs/core';
import { FacebookModule } from './facebook.module';

async function bootstrap() {
  const app = await NestFactory.create(FacebookModule);
  await app.listen(3000);
}
bootstrap();
