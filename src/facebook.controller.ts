import { Controller, Get } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller()
export class AppController {
  constructor(private readonly facebookService: FacebookService) {}

  @Get()
  getHello(): string {
    return this.facebookService;
  }
}
