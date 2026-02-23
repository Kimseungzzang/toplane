# Context Summary (Codex x User)

Last updated: 2026-02-23

## 1) Goal From Conversation

- 롤 탑 라인전 느낌의 1:1 웹 게임을 모바일 중심으로 빠르게 플레이 가능하게 구현
- 초대 코드 기반 2인 매치, WebSocket 멀티플레이
- 그래픽은 단순화하고 지연 최소화
- 챔피언 선택(가렌/다리우스 느낌) -> 현재 이름은 Vanguard / Executioner
- 스킬, 상점, 부쉬, 타워 공격 로직, 리팩토링, 배포 고려

## 2) Major Product Decisions

- 런타임: Node.js + Next.js + Socket.IO
- 실시간 게임 상태: 서버 authoritative (20Hz tick)
- 페이지 셸: Next 라우팅 사용
- 게임 플레이 상태 갱신: CSR + WebSocket
- 초대 코드: 6자리 룸 코드

## 3) Current Routes

- `/` : 홈(모드 선택)
- `/practice` : 자동 방 생성
- `/play/[code]` : 코드 자동 입장 (CSR 검증, invalid면 `/` 리다이렉트)

## 4) Game Features Implemented

- 2인 private room 생성/입장
- 챔피언 선택 UI + 동작 (Vanguard / Executioner)
- Q/W/E/R + 패시브
- 치명타/방어력/관통/도트(bleed) 반영
- 미니언 웨이브/이동/전투
- 타워 전투
  - 미니언 우선 타겟
  - 아군 챔프 피격 시 어그로 전환
  - 경고 -> 투사체 -> 피격 단계
  - 챔피언 연속 피격 스택 데미지 증가
- 상점/골드/아이템 구매
- 부쉬 시야 시스템
  - 부쉬 내 은신
  - 공격/스킬 사용 시 일정 시간 reveal
  - 서버 측 시야 필터링(은신 적 좌표 비노출)
- 핑 측정(ping_check)

## 5) Refactoring Work Completed

### Server

기존 한 파일 집중 구조를 모듈화:

- `src/server/gameCore.js` : 오케스트레이션만 담당
- `src/server/socketHandlers.js` : 소켓 이벤트 등록/처리
- `src/server/stateEmitter.js` : 상태 직렬화 + emit
- `src/server/gameSystems.js` : combat/tower 시스템 조립
- `src/server/gameLoop.js` : tick 루프
- `src/server/roomLifecycle.js` : room start/wave/end 규칙
- `src/server/roomQueries.js` : room 조회 유틸
- `src/server/effects.js` : 이펙트 push/prune
- `src/server/utils/math.js` : clamp
- `src/server/modules/*` : config/factories/vision/combat/tower/roomState

### Client

기존 `public/client.js` DOM 스크립트 제거 후 React 구조로 전환:

- 삭제: `public/client.js`
- 추가:
  - `src/client/constants.js`
  - `src/client/renderGame.js`
  - `src/client/useToplaneGame.js`
  - `src/components/toplane/ToplaneApp.js`
- `pages/index.js`는 UI 컴포넌트 기반 라우트 엔트리로 변경

## 6) Deployment Notes Discussed

- ECS/Fargate 단일 태스크로 프론트+백 통합 운영 가능
- ALB만으로도 운영 가능 (Cloudflare 필수 아님)
- 단, 현재 룸 상태 메모리 저장 구조라 멀티 태스크 스케일링 시 상태 분산 이슈 발생
  - 다중 태스크 필요 시 Redis adapter + 외부 상태 저장 필요
- 정적 파일은 Next가 `public/*` + `/_next/static/*`로 함께 서빙

## 7) Current Tech Constraints / Known Limitations

- 챔피언 수 2개로 제한
- 실제 LoL 1:1 완전 동일 스펙 아님(유사 메커닉 중심)
- 룸/매치 상태가 프로세스 메모리 기반
- 관전/리플레이/매치메이킹/랭크 시스템 없음

## 8) What Was Validated

- 서버/클라이언트 리팩토링 후 반복적으로 `node --check` 수행
- `npm run build` 성공 확인
- Next 라우트 생성 상태 확인 (`/`, `/practice`, `/play/[code]`)

## 9) Suggested Next Steps

- ECS 배포용 Dockerfile + 스크립트 Linux 호환 확정
- `.github/workflows` CI(build) 추가
- Socket.IO Redis adapter 도입(수평 확장 대비)
- 테스트 코드(핵심 전투/타워 규칙) 추가

