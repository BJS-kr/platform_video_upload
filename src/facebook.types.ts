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
    ): Promise<void>;

    finish(accessToken: string, uploadSessionID: string): FinishResponse;

    getPageID(accessToken: string, pageName: string): Promise<string>;
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

  type Tasks =
    | 'ANALYZE'
    | 'ADVERTISE'
    | 'MESSAGING'
    | 'MODERATE'
    | 'CREATE_CONTENT'
    | 'MANAGE';

  type Category = { id: string; name: string };

  type Data = {
    access_token: string;
    category: string;
    category_list: Category[];
    name: string;
    id: string;
    tasks: Tasks[];
  };

  type Cursors = { before: string; after: string };

  type getPageIDResponse = {
    data: Data[];
    paging: { cursors: Cursors };
  };
}
