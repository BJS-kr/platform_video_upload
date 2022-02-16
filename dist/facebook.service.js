"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const axios_1 = require("@nestjs/axios");
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const rxjs_1 = require("rxjs");
const https_1 = require("https");
let FacebookService = class FacebookService {
    constructor(httpService) {
        this.httpService = httpService;
    }
    async getPageID(accessToken, pageName) {
        let pageID;
        const requestOptions = {
            protocol: 'https:',
            hostname: 'graph.facebook.com',
            path: `/v13.0/me/accounts?access_token=${accessToken}`,
            method: 'GET',
        };
        await new Promise((resolve, reject) => {
            const req = (0, https_1.request)(requestOptions, (res) => {
                if (res.statusCode !== 200) {
                    reject('response status code is not 200');
                }
                res
                    .on('error', (e) => {
                    throw e;
                })
                    .on('data', (resChunk) => {
                    const result = JSON.parse(resChunk);
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
    async start(accessToken, fileName) {
        let fileSize;
        await new Promise((res, rej) => {
            (0, fs_1.stat)(`user_file_path/${fileName}`, (error, stats) => {
                if (error)
                    rej(error);
                res(stats.size);
            });
        })
            .then((size) => {
            fileSize = size;
        })
            .catch((error) => {
            throw error;
        });
        const startResponse = this.httpService
            .post(`https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=start&access_token=${accessToken}&file_size=${fileSize}`)
            .pipe((0, rxjs_1.catchError)((error) => {
            throw new common_1.InternalServerErrorException(error.response.data);
        }), (0, rxjs_1.map)((res) => {
            return res.data;
        }));
        return [startResponse, fileSize];
    }
    finish(accessToken, uploadSessionID) {
        let finishResponse;
        this.httpService
            .post(`https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=finish&access_token=${accessToken}&upload_session_id=${uploadSessionID}`)
            .pipe((0, rxjs_1.catchError)((error) => {
            throw new common_1.InternalServerErrorException(error.response.data);
        }), (0, rxjs_1.map)((response) => {
            finishResponse = response.data;
        }));
        return finishResponse;
    }
    async transfer(accessToken, fileName) {
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
        (0, fs_1.createReadStream)(`user_file_path/${fileName}`)
            .on('error', (err) => {
            console.error(`error on uploading chunk count:${chunkCount}`);
            throw err;
        })
            .on('data', (chunk) => {
            ++chunkCount;
            (0, fs_1.writeFile)(`./chunk`, chunk, () => {
                this.httpService
                    .post(`https://graph-video.facebook.com/v13.0/1755847768034402/videos?upload_phase=transfer&access_token=${accessToken}&upload_session_id=${uploadSessionID}&start_offset=${startOffset}&video_file_chunk=@./chunk`)
                    .pipe((0, rxjs_1.catchError)((error) => {
                    throw new common_1.InternalServerErrorException(error.response.data);
                }), (0, rxjs_1.map)((response) => {
                    const { data } = response;
                    startOffset = data.startOffset;
                    endOffset = data.endOffset;
                }));
            });
        })
            .on('end', () => {
            if (startOffset === endOffset && String(fileSize) === endOffset) {
                console.log('video upload complete, go for finish');
                const isSuccess = this.finish(accessToken, uploadSessionID).success;
                if (isSuccess) {
                    console.log(`video upload succeeded: ${isSuccess}`);
                    console.log(`your uploaded video id is ${videoId}`);
                }
                else {
                    throw new common_1.InternalServerErrorException(`video upload not succeeded: ${isSuccess}`);
                }
            }
            else {
                throw new common_1.InternalServerErrorException('something has gone wrong');
            }
        });
    }
};
FacebookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], FacebookService);
exports.FacebookService = FacebookService;
//# sourceMappingURL=facebook.service.js.map