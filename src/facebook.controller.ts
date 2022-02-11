import { Body, Controller, Get } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller()
export class AppController {
  constructor(private readonly facebookService: FacebookService) {}

  @Get()
  getHello(@Body() body) {
    const { accessToken, fileName } = body;
    return this.facebookService.transfer(accessToken, fileName);
  }
}
