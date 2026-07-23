# AI ACE CBT · GitHub Pages 배포본

AI 핵심 개념을 데모 문제로 학습하는 개인용 CBT 프로토타입입니다. 서버나 Supabase 없이 동작하며, 학습 기록과 오답은 사용자의 브라우저 `localStorage`에 저장됩니다.

> 현재 문항은 공식 기출문제가 아닌 기능 검증용 데모 학습문제입니다.

## 구현 기능

- 학습 홈 대시보드
- 5개 데모 문제와 제한시간
- 문제 이동, 답안 선택, 미응답 표시
- 제출 확인과 자동 채점
- 문제별 정답 및 해설
- 오답노트와 최근 학습 기록
- 데스크톱·태블릿·모바일 반응형
- GitHub Pages 정적 배포
- `main` 브랜치 푸시 시 자동 배포

## 기술 구성

- Next.js App Router
- React + TypeScript
- CSS
- JSON 문제 데이터
- 브라우저 `localStorage`
- GitHub Actions + GitHub Pages

## 폴더 구조

```text
AI_ACE_CBT_GitHub_Pages/
├─ .github/workflows/deploy-pages.yml
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ data/questions.json
├─ public/
│  ├─ .nojekyll
│  └─ favicon.svg
├─ tests/static-export.test.mjs
├─ next.config.ts
├─ package.json
└─ README.md
```

## 로컬 실행

Node.js 20.9 이상이 필요합니다. 권장 버전은 Node.js 22입니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

정적 배포 결과를 확인하려면 아래 명령을 사용합니다.

```bash
npm run build
npm run preview
```

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
2. 압축을 푼 프로젝트의 **내용 전체**를 저장소 최상위에 업로드합니다.
3. 기본 브랜치 이름을 `main`으로 사용합니다.
4. 저장소의 `Settings → Pages → Build and deployment`에서 Source를 `GitHub Actions`로 선택합니다.
5. `main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 자동 실행됩니다.
6. `Actions` 탭에서 배포 성공을 확인한 뒤 Pages 주소로 접속합니다.

기본 주소는 다음 형식입니다.

```text
https://사용자명.github.io/저장소명/
```

워크플로가 저장소명을 감지해 `/저장소명` 하위 경로를 빌드에 자동 반영하므로 별도 코드 수정이 필요하지 않습니다.

## 사용자 사이트와 사용자 지정 도메인

- 저장소 이름이 `사용자명.github.io`이면 루트 경로로 자동 배포됩니다.
- 사용자 지정 도메인을 사용할 때는 저장소의 `Settings → Secrets and variables → Actions → Variables`에서 `PAGES_BASE_PATH` 값을 `/`로 등록합니다.
- 특별한 하위 경로가 필요하면 `PAGES_BASE_PATH`에 `/원하는경로`를 입력할 수 있습니다. 마지막에는 `/`를 붙이지 않습니다.

## 문제 데이터 수정

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
  "explanation": "정답 해설",
  "sourceId": "DEMO-AI-001",
  "verified": false
}
```

`answer`는 0부터 시작합니다. 두 번째 보기가 정답이면 `1`을 입력합니다. 공식 출처가 확인되지 않은 문항은 `verified: false`를 유지하고 기출문제로 표시하지 않습니다.

## 운영 시 주의사항

- GitHub Pages는 정적 호스팅이므로 서버 코드, 로그인, 데이터베이스 기능은 포함하지 않습니다.
- 학습 기록은 브라우저와 기기에 종속됩니다. 사이트 데이터 삭제 또는 다른 기기 사용 시 기록이 이어지지 않습니다.
- 저장소 이름을 바꾸면 다음 푸시에서 새 경로로 자동 재빌드됩니다.
- 배포 오류가 발생하면 먼저 `Actions` 탭의 실패 단계와 `npm run test` 결과를 확인합니다.

## 최종 검증

```bash
npm run lint
npm test
```

`npm test`는 정적 사이트 빌드와 GitHub Pages 자산 경로를 함께 검사합니다.

## 공식 참고 문서

- [GitHub Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Next.js basePath 설정](https://nextjs.org/docs/pages/api-reference/config/next-config-js/basePath)
