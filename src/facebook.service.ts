import * as AWS from 'aws-sdk';
import * as Axios from 'axios';
import * as FormData from 'form-data';

class FacebookService {
  private readonly userAccessToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
  private readonly accontsInformationURL = `https://graph.facebook.com/v13.0/me/accounts?fields=access_token%2Cid%2Cname&access_token=${this.userAccessToken}`;
  private readonly pageName = process.env.FACEBOOK_PAGE_NAME;
  private readonly bucket = process.env.BUCKET;
  private readonly s3 = new AWS.S3();
  private readonly axios = Axios.default;
  private readonly formDataHeader = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  private makePageContentControlURLByPageId(pageId: string) {
    return `https://graph-video.facebook.com/v13.0/${pageId}/videos`;
  }

  private sleep(sec: number) {
    return new Promise((res) => {
      setTimeout(() => res(true), sec * 1000);
    });
  }

  private sizeOf(key: string) {
    return this.s3.headObject({ Key: key, Bucket: this.bucket }).promise();
  }

  private makeVideosReadStreamFromS3(s3Key: string) {
    return this.s3
      .getObject({ Key: s3Key, Bucket: this.bucket })
      .createReadStream();
  }

  protected async getPageIdAndAccessToken(): Promise<
    readonly [string, string]
  > {
    if (!this.userAccessToken) {
      throw new Error('facebook access token needed');
    }

    if (!this.pageName) {
      throw new Error('facebook page name needed');
    }

    const responseData = (await this.axios.get(this.accontsInformationURL))
      .data;
    const pageData = responseData.data.find(
      (pageData: any) => pageData.name === this.pageName
    );
    if (!pageData) throw new Error('given page name does not exists');
    return [pageData.id, pageData.access_token];
  }

  protected async start(
    accessToken: string,
    fileName: string,
    pageId: string
  ): Promise<[any, number]> {
    const fileSize = (await this.sizeOf(fileName)).ContentLength;

    if (fileSize) {
      const startParams = {
        upload_phase: 'start',
        access_token: accessToken,
        file_size: fileSize,
      };
      const startResponse = (
        await this.axios.post(
          this.makePageContentControlURLByPageId(pageId),
          startParams,
          this.formDataHeader
        )
      ).data;
      console.log('startResponse: ', startResponse);

      return [startResponse, fileSize];
    } else {
      throw new Error('facebook upload fileSize null');
    }
  }

  protected async finish(
    accessToken: string,
    uploadSessionID: string,
    pageId: string
  ): Promise<any> {
    const finishParams = {
      upload_phase: 'finish',
      access_token: accessToken,
      upload_session_id: uploadSessionID,
    };

    const finishResponse = (
      await this.axios.post(
        this.makePageContentControlURLByPageId(pageId),
        finishParams,
        this.formDataHeader
      )
    ).data;
    console.log('finishResponse: ', finishResponse);

    if (!finishResponse.success)
      throw new Error('GraphAPI responded error status on given options');

    return finishResponse;
  }

  public async transfer(fileName: string) {
    const [pageId, accessToken] = await this.getPageIdAndAccessToken();

    const [startResponse, fileSize] = await this.start(
      accessToken,
      fileName,
      pageId
    );

    const videoReadStream = this.makeVideosReadStreamFromS3(fileName);
    const highWaterMark = videoReadStream.readableHighWaterMark;
    const _4MB = 4000000;
    const closestTo4MB = Math.floor(_4MB / highWaterMark) * highWaterMark;
    const transferableSize = closestTo4MB > fileSize ? fileSize : closestTo4MB;
    const uploadSessionID = startResponse.upload_session_id;
    const videoId = startResponse.video_id;

    let isFinished = false;
    let startOffset = startResponse.start_offset;
    let endOffset = startResponse.end_offset;
    let chunkCount = 0;
    let chunks: Buffer[] = [];
    let currentBufferSize = 0;
    let transferredSize = 0;

    // https://stackoverflow.com/questions/10859374/curl-f-what-does-it-mean-php-instagram
    videoReadStream
      .on('error', (error) => {
        throw new Error(error.message);
      })
      .on('data', async (chunk) => {
        if (chunk instanceof Buffer) {
          chunks.push(chunk);
        } else {
          throw new Error('Data chunk is not a Bufffer object');
        }
        ++chunkCount;
        currentBufferSize += chunk.length;

        if (
          currentBufferSize >= transferableSize ||
          fileSize - transferredSize === currentBufferSize
        ) {
          videoReadStream.pause();

          const transferParams = new FormData();

          transferParams.append('upload_phase', 'transfer');
          transferParams.append('access_token', accessToken);
          transferParams.append('upload_session_id', uploadSessionID);
          transferParams.append('start_offset', startOffset);
          transferParams.append(
            'video_file_chunk',
            Buffer.concat(chunks),
            `chunk${chunkCount}`
          );

          const transferRes = await this.axios
            .post(
              this.makePageContentControlURLByPageId(pageId),
              transferParams,
              this.formDataHeader
            )
            .catch((x) => console.error(x.response.data));
          const transferResponse = (transferRes && transferRes.data) || false;
          if (!transferResponse) throw 'maybe transferRes is void';
          console.log('transferResponse: ', transferResponse);

          endOffset = transferResponse.end_offset;
          startOffset = transferResponse.start_offset;

          transferredSize += currentBufferSize;
          if (transferredSize >= fileSize) isFinished = true;

          chunks = [];
          currentBufferSize = 0;

          videoReadStream.resume();
        }
      })
      .on('end', async () => {
        let elapsed = 0;

        while (!isFinished) {
          await this.sleep(1);
          elapsed++;
          if (elapsed > 15)
            throw new Error(
              '15 secs elapsed since video stream ended remain state: not finished'
            );
        }

        if (startOffset === endOffset && String(fileSize) === endOffset) {
          const isSuccess = (
            (await this.finish(accessToken, uploadSessionID, pageId)) as any
          ).success;

          if (!isSuccess) {
            throw new Error(`video upload not succeeded: ${isSuccess}`);
          }

          console.log(`uploaded video id is ${videoId}`);
        } else {
          throw new Error('end offset not matches to file size');
        }
      });
  }
}
