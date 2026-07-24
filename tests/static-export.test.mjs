import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const questionData = JSON.parse(
  await readFile(new URL("../data/questions.json", import.meta.url), "utf8"),
);

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

test("요청된 학습 기능이 소스에 포함된다", () => {
  for (const label of [
    "문제풀이 시작",
    "단원 풀기",
    "내 오답노트",
    "정답 보기",
    "관련 문제 더 풀어보기",
    "간단 해설",
    "자세한 해설",
    "문제 풀이에서 제외",
  ]) {
    assert.ok(source.includes(label), `${label} 기능 문구가 없습니다.`);
  }
});

test("모든 단원에 관련 문제 풀이용 문항이 2개 이상 있다", () => {
  const counts = questionData.reduce((result, question) => {
    result[question.unit] = (result[question.unit] ?? 0) + 1;
    return result;
  }, {});

  for (const [unit, count] of Object.entries(counts)) {
    assert.ok(count >= 2, `${unit} 단원의 문항이 2개보다 적습니다.`);
  }
});

test("서버 전용 또는 기존 Sites 미리보기 메타데이터가 없다", () => {
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /oai-authenticated-user/i);
});
