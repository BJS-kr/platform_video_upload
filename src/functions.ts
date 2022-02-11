import { createReadStream, stat } from 'fs';
let fileSize: number;
stat('./test.mp4', (err, stats) => {
  if (err) throw new Error();
  fileSize = stats.size;
});
const testReadStream = createReadStream('./test.mp4')
  .on('data', (chunk) => {})
  .on('end', () => {
    console.log('ended');
  });

function uploadVideoFacebook(
  accesstoken: string,
  uploadPhase: 'start' | 'transfer' | 'finish',
  fileSize?: number, // start에 필요. startOffset이 fileSize와 일치하면 endOffset도 당연히 일치하게 될 것.
  uploadSessionID?: string, // transfer와 finish에 필요. start
  startOffset?: number, // start와 transfer에 대한 응답에 포함
  videoFileChunk?: string,
) {
  return;
}
