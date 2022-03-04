import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createReadStream, stat } from 'fs';
import { Facebook } from './facebook.types';
import { request, RequestOptions } from 'https';
import * as FormData from 'form-data';

@Injectable()
export class FacebookService extends Facebook.UploadVideo {
  constructor() {
    super();
  }
  protected async getPageId(
    accessToken: string,
    pageName: string,
  ): Promise<string> {
    if (!accessToken) {
      throw new BadRequestException('access token needed');
    }
    if (!pageName) {
      throw new BadRequestException('page name needed');
    }

    let pageId: string | null = null;

    const requestOptions: RequestOptions = {
      host: 'graph.facebook.com',
      path: `/v13.0/me/accounts?access_token=${accessToken}`,
      method: 'GET',
    };

    await new Promise((res, rej) => {
      request(requestOptions, (response) => {
        if (response.statusCode !== 200) {
          throw new BadRequestException(
            'GraphAPI responded error status on given options',
          );
        }

        response
          .on('error', (error) => {
            throw new InternalServerErrorException(error);
          })
          .on('data', (responseChunk) => {
            const responseData = JSON.parse(
              responseChunk,
            ) as Facebook.GetAccountResponse;

            const matchingData = responseData.data.find((eachData) => {
              return eachData.name === pageName;
            });

            matchingData
              ? res((pageId = matchingData.id))
              : rej(
                  'given page name data not exists on GraphAPI Account informations',
                );
          });
      }).end();
    }).catch((rej) => {
      throw new BadRequestException(rej);
    });

    if (pageId) {
      return pageId;
    } else {
      throw new InternalServerErrorException('pageId null');
    }
  }

  protected async start(
    accessToken: string,
    fileName: string,
    pageId: string,
  ): Promise<[Facebook.StartResponse, number]> {
    let fileSize: number | null = null;
    let startResponse: Facebook.StartResponse | null = null;

    await new Promise((res) => {
      stat(`/Users/james/Desktop/${fileName}`, (error, stats) => {
        if (error) throw error;
        res(stats.size);
      });
    })
      .then((size) => {
        // size는 stats.size이므로 언제나 number입니다.
        fileSize = size as number;
      })
      .catch((error: NodeJS.ErrnoException) => {
        throw error;
      });

    const formData = new FormData();

    if (fileSize) {
      formData.append('upload_phase', 'start');
      formData.append('access_token', accessToken);
      formData.append('file_size', fileSize);
    } else {
      throw new InternalServerErrorException('fileSize null');
    }

    const requestOptions: RequestOptions = {
      host: 'graph.facebook.com',
      path: `/v13.0/${pageId}/videos`,
      method: 'POST',
      headers: formData.getHeaders(),
    };

    await new Promise((res) => {
      const req = request(requestOptions, (response) => {
        if (response.statusCode !== 201) {
          throw new BadRequestException(
            'GraphAPI responded error status on given options',
          );
        }

        response
          .on('error', (error) => {
            throw new InternalServerErrorException(error);
          })
          .on('data', (responseChunk) => {
            res(
              (startResponse = JSON.parse(
                responseChunk,
              ) as Facebook.StartResponse),
            );
          });
      });

      formData.pipe(req);
    });

    if (startResponse) {
      return [startResponse, fileSize];
    } else {
      throw new InternalServerErrorException('startResponse null');
    }

    // result의 첫째 값: video_id = 업로드한 비디오의 최종적 id
  }

  protected async finish(
    accessToken: string,
    uploadSessionID: string,
    pageId: string,
  ): Promise<Facebook.FinishResponse> {
    let finishResponse: Facebook.FinishResponse | null = null;

    const formData = new FormData();

    formData.append('upload_phase', 'finish');
    formData.append('access_token', accessToken);
    formData.append('upload_session_id', uploadSessionID);

    const requestOptions: RequestOptions = {
      host: 'graph.facebook.com',
      path: `/v13.0/${pageId}/videos`,
      method: 'POST',
      headers: formData.getHeaders(),
    };

    await new Promise((res) => {
      const req = request(requestOptions, (response) => {
        if (response.statusCode !== 201) {
          throw new BadRequestException(
            'GraphAPI responded error status on given options',
          );
        }

        response
          .on('error', (error) => {
            throw new InternalServerErrorException(error);
          })
          .on('data', (responseChunk) => {
            res(
              (finishResponse = JSON.parse(
                responseChunk,
              ) as Facebook.FinishResponse),
            );
          });
      });

      formData.pipe(req);
    });

    if (finishResponse) {
      return finishResponse;
    } else {
      throw new InternalServerErrorException('finishResponse null');
    }
  }

  public async transfer(
    accessToken: string,
    fileName: string,
    pageName: string,
  ): Promise<void> {
    const pageId = await this.getPageId(accessToken, pageName);
    const [startResponse, fileSize] = await this.start(
      accessToken,
      fileName,
      pageId,
    );
    const transferableSize = 5 * 1024 * 1024 - 65536; // 5MB - 64KB(data stream chunk size)
    const uploadSessionID = startResponse.uploadSessionID;
    const videoId = startResponse.videoId;
    const requestOptions: RequestOptions = {
      host: 'graph.facebook.com',
      path: `/v13.0/${pageId}/videos`,
      method: 'POST',
    };
    const formData = new FormData();

    formData.append('upload_phase', 'transfer');
    formData.append('access_token', accessToken);
    formData.append('upload_session_id', uploadSessionID);

    let startOffset = startResponse.startOffset;
    let endOffset: string;
    let chunkCount = 0;
    let chunks: Buffer[] = [];
    let currentBufferSize = 0;
    let transferredSize = 0;

    // https://stackoverflow.com/questions/10859374/curl-f-what-does-it-mean-php-instagram
    const readStream = createReadStream(`/Users/james/Desktop/${fileName}`, {
      highWaterMark: transferableSize,
    });

    readStream
      .on('error', (err) => {
        console.error(`error on uploading chunk count:${chunkCount}`);
        throw err;
      })
      .on('data', (chunk) => {
        if (chunk instanceof Buffer) {
          chunks.push(chunk);
        } else {
          throw new InternalServerErrorException(
            'Data chunk is not a Buffer object',
          );
        }
        ++chunkCount;
        currentBufferSize += chunk.length;

        if (
          currentBufferSize >= transferableSize ||
          fileSize - transferredSize <= 65536
        ) {
          readStream.pause();
          formData.append('start_offset', startOffset);
          formData.append('video_file_chunk', Buffer.concat(chunks));

          requestOptions.headers = formData.getHeaders();

          const req = request(requestOptions, (response) => {
            response
              .on('error', (error) => {
                throw error;
              })
              .on('data', (responseChunk) => {
                const transferResponse = JSON.parse(
                  responseChunk,
                ) as Facebook.TransferResponse;
                startOffset = transferResponse.startOffset;
                endOffset = transferResponse.endOffset;
              });

            transferredSize += currentBufferSize;
            chunks = [];
            currentBufferSize = 0;
          });

          formData.pipe(req);
          readStream.resume();
        }
      })
      .on('end', async () => {
        if (startOffset === endOffset && String(fileSize) === endOffset) {
          console.log('video upload complete, go for finish');

          const isSuccess = (
            await this.finish(accessToken, uploadSessionID, pageId)
          ).success;

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
