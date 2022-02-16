import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createReadStream, stat, writeFile } from 'fs';
import { catchError, map, Observable } from 'rxjs';
import { Facebook } from './facebook.types';
import { request, RequestOptions } from 'https';
import * as FormData from 'form-data';
@Injectable()
export class FacebookService implements Facebook.UploadVideo {
  constructor(private readonly httpService: HttpService) {}

  public async getPageID(
    accessToken: string,
    pageName: string,
  ): Promise<string> {
    let pageID: string;

    const requestOptions: RequestOptions = {
      protocol: 'https:',
      hostname: 'graph.facebook.com',
      path: `/v13.0/me/accounts?access_token=${accessToken}`,
      method: 'GET',
    };

    await new Promise((resolve, reject) => {
      const req = request(requestOptions, (res) => {
        if (res.statusCode !== 200) {
          reject('response status code is not 200');
        }

        res
          .on('error', (e) => {
            throw e;
          })
          .on('data', (resChunk) => {
            const result = JSON.parse(resChunk) as Facebook.getPageIDResponse;
            if (result.data[0].name === pageName) {
              resolve((pageID = result.data[0].id));
            }
          });
      });

      req.end();
    }).catch((rej) => {
      throw new Error(rej);
    });

    return pageID;
  }

  public async start(
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

  public finish(
    accessToken: string,
    uploadSessionID: string,
  ): Facebook.FinishResponse {
    let finishResponse;

    this.httpService
      .post(
        `https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=finish&access_token=${accessToken}&upload_session_id=${uploadSessionID}`,
      )
      .pipe(
        catchError((error) => {
          throw new InternalServerErrorException(error.response.data);
        }),
        map((response) => {
          finishResponse = response.data as Facebook.FinishResponse;
        }),
      );

    return finishResponse;
  }

  public async transfer(accessToken: string, fileName: string): Promise<void> {
    const [startResponse, fileSize] = await this.start(accessToken, fileName);

    let startOffset: string;
    let endOffset: string;
    let uploadSessionID: string;
    let videoId: string;
    let chunkCount = 0;

    startResponse.forEach((response) => {
      startOffset = response.startOffset;
      uploadSessionID = response.uploadSessionID;
      videoId = response.videoId;
    });

    // https://stackoverflow.com/questions/10859374/curl-f-what-does-it-mean-php-instagram
    createReadStream(`user_file_path/${fileName}`)
      .on('error', (err) => {
        console.error(`error on uploading chunk count:${chunkCount}`);
        throw err;
      })
      .on('data', (chunk) => {
        ++chunkCount;
        writeFile(`./chunk`, chunk, () => {
          this.httpService
            .post(
              `https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=transfer&access_token=${accessToken}&upload_session_id=${uploadSessionID}&start_offset=${startOffset}&video_file_chunk=@./chunk`,
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
          console.log('video upload complete, go for finish');
          const isSuccess = this.finish(accessToken, uploadSessionID).success;
          if (isSuccess) {
            console.log(`video upload succeeded: ${isSuccess}`);
            console.log(`your uploaded video id is ${videoId}`);
          } else {
            throw new InternalServerErrorException(
              `video upload not succeeded: ${isSuccess}`,
            );
          }
        } else {
          throw new InternalServerErrorException('something has gone wrong');
        }
      });
  }
}
