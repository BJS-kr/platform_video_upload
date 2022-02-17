export declare namespace Facebook {
  interface UploadVideo {
    start(
      accessToken: string,
      fileName: string,
      pageId: string,
    ): Promise<[StartResponse, number]>;

    transfer(
      accessToken: string,
      uploadSessionID: string,
      startOffset: string,
      videoFileChunk: string,
    ): Promise<void>;

    finish(
      accessToken: string,
      uploadSessionID: string,
      pageId: string,
    ): Promise<FinishResponse>;

    getPageId(accessToken: string, pageName: string): Promise<string>;
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

  type Category = { id: string; name: string };

  type Data = {
    access_token: string;
    category: string;
    category_list: Category[];
    name: string;
    id: string;
    tasks: string[];
  };

  type Cursors = { before: string; after: string };

  type GetAccountResponse = {
    data: Data[];
    paging: { cursors: Cursors };
  };
}
