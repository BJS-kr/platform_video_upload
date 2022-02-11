import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createReadStream, stat, writeFile } from 'fs';
import { catchError, map, Observable } from 'rxjs';
import { Facebook } from './facebook.types';

@Injectable()
export class FacebookService implements Facebook.UploadVideo {
  constructor(private readonly httpService: HttpService) {}
  private async start(
    accessToken: string,
    fileName: string,
  ): Promise<[Observable<Facebook.StartResponse>, number]> {
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

    const startResponse = this.httpService
      .post(
        `https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=start&access_token=${accessToken}&file_size=${fileSize}`,
      )
      .pipe(
        catchError((error) => {
          throw new InternalServerErrorException(error.response.data);
        }),
        map((res) => {
          return res.data as Facebook.StartResponse;
        }),
      );

    return [startResponse, fileSize];
    // result의 첫째 값: video_id = 업로드한 비디오의 최종적 id
  }

  public async transfer(
    accessToken: string,
    fileName: string,
  ): Promise<Facebook.TransferResponse> {
    const [startResponse, fileSize] = await this.start(accessToken, fileName);

    let startOffset;
    let endOffset;
    let uploadSessionID;
    let videoId;
    let chunkCount = 0;

    startResponse.forEach((response) => {
      startOffset = response.startOffset;
      uploadSessionID = response.uploadSessionID;
      videoId = response.videoId;
    });

    // https://stackoverflow.com/questions/10859374/curl-f-what-does-it-mean-php-instagram
    createReadStream('./test.mp4')
      .on('error', (err) => {
        console.error(`error on uploading chunk count:${chunkCount}`);
        throw err;
      })
      .on('data', (chunk) => {
        writeFile(`./chunk_${++chunkCount}`, chunk, () => {
          this.httpService
            .post(
              `https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=transfer&access_token=${accessToken}&upload_session_id=${uploadSessionID}&start_offset=${startOffset}&video_file_chunk=@./chunk_${chunkCount}`,
            )
            .pipe(
              catchError((error) => {
                throw new InternalServerErrorException(error.response.data);
              }),
              map((response) => {
                const { data } = response;
                startOffset = (data as Facebook.TransferResponse).startOffset;
                endOffset = (data as Facebook.TransferResponse).endOffset;
              }),
            );
        });
      })
      .on('end', () => {
        if (startOffset === endOffset && String(fileSize) === endOffset) {
          console.log('video upload complete');
        } else {
          console.log('something gone wrong');
        }
      });
  }

  public finish(
    accessToken: string,
    uploadSessionID: string,
  ): Facebook.FinishResponse {}
}
