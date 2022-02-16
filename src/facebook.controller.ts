import { Body, Controller, Post } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller()
export class AppController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post()
  getHello(@Body() body) {
    const { accessToken, pageName } = body;
    return this.facebookService.getPageID(accessToken, pageName);
  }
}
