// OpenVidu 관련 상수들을 분리
export const OPENVIDU_CONFIG = {
  // OpenVidu 서버 연결 정보
  SERVER_URL: `${import.meta.env.VITE_OPENVIDU_PROTOCOL}://${import.meta.env.VITE_OPENVIDU_IP}:${import.meta.env.VITE_OPENVIDU_PORT}`,
  SERVER_SECRET: import.meta.env.VITE_OPENVIDU_SERVER_SECRET,

  // Publisher(로컬 스트림) 설정
  PUBLISHER_OPTIONS: {
    audioSource: undefined,    // undefined = 기본 마이크 사용
    videoSource: undefined,    // undefined = 기본 카메라 사용
    publishAudio: false,       // 초기 마이크 음소거 상태
    publishVideo: false,       // 초기 비디오 비활성화 상태
    resolution: '640x480',     // 비디오 해상도
    frameRate: 30,            // 프레임 레이트
    insertMode: 'APPEND',     // DOM에 비디오 요소 추가 방식
    mirror: true,             // 셀프 카메라 좌우 반전
    videoSimulcast: true,     // 다중 화질 지원 (네트워크 상태에 따라 자동 조절)
    mediaOptions: {
      audio: {
        echoCancellation: true,  // 에코 제거
        noiseSuppression: true,  // 잡음 제거
        autoGainControl: true    // 자동 볼륨 조절
      }
    }
  },

  // 자동 재연결 설정
  RECONNECTION_CONFIG: {
    maxAttempts: 5,                    // 최대 재연결 시도 횟수
    attemptsTimeout: 5000,             // 재연결 시도 제한 시간(ms)
    minDelayBetweenRetries: 2000,      // 재시도 간 최소 대기 시간(ms)
    exponentialBackoffRate: 1.5         // 재시도 간격 증가율
  }
} 