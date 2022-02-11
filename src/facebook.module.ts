import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AppController } from './facebook.controller';
import { FacebookService } from './facebook.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [FacebookService],
})
export class AppModule {}
