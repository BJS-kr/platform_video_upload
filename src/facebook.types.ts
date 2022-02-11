import { Observable } from 'rxjs';

export declare namespace Facebook {
  interface UploadVideo {
    start(
      accessToken: string,
      fileName: string,
    ): Promise<[Observable<StartResponse>, number]>;
    transfer(
      accessToken: string,
      uploadSessionID: string,
      startOffset: string,
      videoFileChunk: string,
    ): TransferResponse;
    finish(accessToken: string, uploadSessionID: string): FinishResponse;
  }

  type StartResponse = {
    videoId: string;
    startOffset: string;
    endOffset: string; // rest of props must be captured except this one
    uploadSessionID: string;
  };

  type TransferResponse = {
    startOffset: string;
    endOffset: string;
  };

  type FinishResponse = {
    success: boolean;
  };
}
