import { Body, Controller, Post } from '@nestjs/common';
import { FacebookService } from './facebook.service';

@Controller()
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post()
  getHello(@Body() body) {
    const { accessToken, fileName, pageName } = body;
    return this.facebookService.transfer(accessToken, fileName, pageName);
  }
}
