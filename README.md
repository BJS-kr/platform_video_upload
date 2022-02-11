# 구현 이유
Node.js의 stream을 공부했는데 막상 쓸 기회가 잘 없었다.
그런데 Graph API에서 비디오 업로드를 data chunk로 받아 업로드 한다는 것을 알게 되었다. 최대한 low하게 구현 해볼 기회라고 생각했다. SDK를 NPM에서 사용할 수 있지만, 사용하지 않았다. 만들어진걸 쓰면 연습의 의미가 없으니까.
# implementations
1. Node.js + Nest.js + Graph API + Axios
2. stream for controlling the data(video)

### Types
```typescript
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
  }
  ...
```
### Start -> Transfer -> Finish
```typescript
// get params and noticing Graph API to start..
... this.start(...)

// and entering transfer session...
...
createReadStream(`user_file_path/${fileName}`)
      .on('error', (err) => {
        console.error(`error on uploading chunk count:${chunkCount}`);
        throw err;
      })
      .on('data', (chunk) => {
        // processing...finishes when I done with chunks..
      .on('end', ...this.finish(...))
```
# Conclusion
Node 내장 라이브러리는 알아두면 패키지 의존성 없이 개발하는데 진짜 많은 도움이 된다. stream을 더 와닿게 이해한 것 같다.