import { readFileSync } from "node:fs";
import { parseCodeRabbitReview } from "./parse-coderabbit-review.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: cli-parse-review.ts <file>");
  process.exit(1);
}

const body = readFileSync(filePath, "utf-8");
const results = parseCodeRabbitReview(body);
console.log(JSON.stringify(results, null, 2));
