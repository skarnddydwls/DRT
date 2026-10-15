# 센터 알림전송

센터의 알림전송 화면은 등록된 `CMM_DEVICE_INFO` 디바이스를 조회하고,
선택한 디바이스 중 `push_enabled=true`이며 최근 90일 내 Expo 푸시 토큰이 등록된 대상에게 발송합니다.
푸시 토큰은 `PASSENGER_PUSH_SUBSCRIPTION`을 재사용하며 프론트엔드에 노출하지 않습니다.
등록 디바이스가 있어도 휴대폰 앱의 푸시 토큰이 없으면 발송할 수 없습니다.

## 처리 흐름

1. 센터 → `/api/notifications/send` → Spring `/sendNotification.do`.
2. 수신 가능한 대상과 백엔드 `EXPO_ACCESS_TOKEN` 설정을 검사합니다.
3. `CMM_NOTIFICATION`에 발송 이력을, `PASSENGER_NOTIFICATION`에 대상별 앱 알림을 저장합니다.
4. 기존 푸시 작업자가 약 5초 간격으로 최대 5건씩 Expo에 제출합니다.
5. Expo 티켓과 후속 receipt를 기록하며 등록 해제된 토큰은 삭제합니다.

화면의 발송 대기는 실제 기기 수신 완료가 아닙니다. 네트워크 타임아웃은 중복 전송 방지를 위해
자동 재전송하지 않으며, 실제 단말 수신 여부는 별도로 확인해야 합니다.
알림 OFF 설정은 발송 직전에도 확인합니다. 여객선 결항 감지는 기존 1분 주기를 유지합니다.

## 적용 파일

- 백엔드 SQL: `drt/docs/center-notifications.sql` (기존 결항 알림은 보존).
- 센터 발송/디바이스/이력 API: `CenterNotificationController.java`.
- 발송 작업자: `PassengerNotificationService.java`.

## 실제 휴대폰 수신 준비

- EAS 프로젝트 ID, Android FCM / iOS APNs 설정을 포함해 휴대폰 앱을 빌드해야 합니다.
- 네이티브 앱의 로그인 세션 연결 후 APP PUSH를 켜고 OS 알림 권한을 허용해야 합니다.
- 백엔드 프로세스에 `EXPO_ACCESS_TOKEN`을 설정하고 서버를 재시작해야 합니다.
- 8082 웹 로그인이나 웹 APP PUSH ON만으로는 Expo 토큰이 생성되지 않습니다.
- 기존 앱 설정 문서 `DRT-master/휴대폰-결항알림-설정.md`를 참고하세요.

현재 센터 관리 API는 기존 관광지 관리와 동일하게 로컬 센터에서만 접근할 수 있습니다.
원격 센터 배포에는 관리자 인증을 먼저 연결해야 합니다.

공식 문서: https://docs.expo.dev/push-notifications/sending-notifications/
