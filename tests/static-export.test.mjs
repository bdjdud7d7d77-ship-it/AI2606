import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

test("GitHub Pages용 정적 HTML이 생성된다", () => {
  assert.match(html, /<html[^>]*lang="ko"/i);
  assert.match(html, /<title>ACE STUDY \| AI 자격 학습 시스템<\/title>/i);
  assert.match(html, /ACE STUDY/i);
});

test("정적 자산 경로에 설정된 basePath가 반영된다", () => {
  const expectedAssetPath = `${basePath}/_next/static/`;
  assert.ok(
    html.includes(expectedAssetPath),
    `정적 자산 경로에 ${expectedAssetPath}가 없습니다.`,
  );
  assert.ok(
    html.includes(`${basePath}/favicon.svg`),
    "파비콘 경로에 basePath가 반영되지 않았습니다.",
  );
});

test("서버 전용 또는 기존 Sites 미리보기 메타데이터가 없다", () => {
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /oai-authenticated-user/i);
});
