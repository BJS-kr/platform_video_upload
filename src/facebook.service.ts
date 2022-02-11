import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { stat } from 'fs';
import { map } from 'rxjs';

@Injectable()
export class FacebookService {
  constructor(private readonly httpService: HttpService) {}
  public async startUpload(accessToken: string, fileName: string) {
    let fileSize: number;
    await new Promise((res, rej) => {
      stat(`user_file_path/${fileName}`, (error, stats) => {
        if (error) rej(error);
        res(stats.size);
      });
    })
      .then((size: number) => {
        fileSize = size;
      })
      .catch((error: NodeJS.ErrnoException) => {
        throw error;
      });

    const startResult = this.httpService.post(
      `https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=start&access_token=${accessToken}&file_size=${fileSize}`,
    );
    startResult.pipe(map());
  }
}
