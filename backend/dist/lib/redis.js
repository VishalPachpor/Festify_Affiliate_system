"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
exports.redis = new ioredis_1.default(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});
exports.redis.on("error", (err) => {
    console.error("[redis] Connection error:", err.message);
});
exports.redis.on("connect", () => {
    console.log("[redis] Connected");
});
//# sourceMappingURL=redis.js.map