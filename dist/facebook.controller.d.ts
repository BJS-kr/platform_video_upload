import { FacebookService } from './facebook.service';
export declare class AppController {
    private readonly facebookService;
    constructor(facebookService: FacebookService);
    getHello(body: any): Promise<string>;
}
