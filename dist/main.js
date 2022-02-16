"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const facebook_module_1 = require("./facebook.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(facebook_module_1.FacebookModule);
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map