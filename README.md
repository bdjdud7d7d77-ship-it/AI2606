# AI ACE CBT · GitHub Pages 배포본

AI 핵심 개념을 단원별 데모 문제로 학습하는 개인용 CBT 프로토타입입니다. 서버 없이 동작하며, 학습 기록·오답·직접 작성한 오답노트·문제 제외 설정은 사용자의 브라우저 `localStorage`에 저장됩니다.

> 현재 문항은 공식 기출문제가 아닌 기능 검증용 데모 학습문제입니다.

## 구현 기능

- 문제 풀이 중심의 간결한 학습 홈
- 전체 또는 단원별 문제 풀이
- 문제별 `정답 보기`와 직접 작성하는 `내 오답노트`
- 자동 채점과 문제별 정답·해설
- 오답의 간단 해설·자세한 해설 동시 제공
- 같은 단원의 관련 문제 더 풀기
- 문제 풀이에서 제외·다시 포함
- 오답 자동 저장과 문제별 재풀이
- 최근 학습 기록과 브라우저 저장
- 데스크톱·태블릿·모바일 반응형
- GitHub Pages 정적 배포

## 기술 구성

- Next.js App Router
- React + TypeScript
- CSS
- JSON 문제 데이터
- 브라우저 `localStorage`
- GitHub Actions + GitHub Pages

## 로컬 실행

Node.js 20.9 이상이 필요합니다. 권장 버전은 Node.js 22입니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검증

```bash
npm run lint
NEXT_PUBLIC_BASE_PATH=/AI2606 npm test
```

`npm test`는 정적 사이트 빌드, GitHub Pages 자산 경로, 요청 기능 문구와 단원별 관련 문항 수를 검사합니다.

## 문제 데이터

문제는 `data/questions.json`에서 관리합니다.

```json
{
  "id": "Q-001",
  "subject": "AI 활용 기초",
  "unit": "정보 검증",
  "type": "learning",
  "question": "문제 내용",
  "choices": ["보기 1", "보기 2", "보기 3", "보기 4"],
  "answer": 1,
  "shortExplanation": "간단 해설",
  "detailedExplanation": "자세한 해설",
  "sourceId": "DEMO-AI-001",
  "verified": false
}
```

`answer`는 0부터 시작합니다. 두 번째 보기가 정답이면 `1`입니다. `관련 문제 더 풀어보기`가 작동하려면 같은 `unit`에 제외되지 않은 다른 문제가 있어야 합니다.

## 저장 범위와 주의사항

- GitHub Pages는 정적 호스팅이므로 로그인과 데이터베이스 기능은 포함하지 않습니다.
- 학습 기록은 현재 브라우저와 기기에 종속됩니다.
- 브라우저의 사이트 데이터를 삭제하면 학습 기록과 오답노트도 삭제됩니다.
- 저장소 이름이 바뀌면 GitHub Actions가 새 하위 경로로 다시 빌드합니다.
- 공식 출처가 확인되지 않은 문항은 `verified: false`를 유지하고 기출문제로 표시하지 않습니다.
