import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { Facebook } from './facebook.types';
export declare class FacebookService implements Facebook.UploadVideo {
    private readonly httpService;
    constructor(httpService: HttpService);
    getPageID(accessToken: string, pageName: string): Promise<string>;
    start(accessToken: string, fileName: string): Promise<[Observable<Facebook.StartResponse>, number]>;
    finish(accessToken: string, uploadSessionID: string): Facebook.FinishResponse;
    transfer(accessToken: string, fileName: string): Promise<void>;
}
