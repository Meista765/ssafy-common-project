import { useState } from 'react'
import { OpenVidu } from 'openvidu-browser'
import axios from 'axios'
import { OPENVIDU_CONFIG } from '../constants/openViduConfig'

export const useOpenVidu = () => {
  // WebRTC 연결 관련 상태 관리
  const [session, setSession] = useState(null)        // OpenVidu 세션 객체
  const [publisher, setPublisher] = useState(null)    // 로컬 스트림(자신의 비디오/오디오)
  const [subscribers, setSubscribers] = useState([])  // 원격 스트림들(다른 참가자들의 스트림)
  const [roomName, setRoomName] = useState('')        // 현재 접속한 방 이름
  const [userName, setUserName] = useState('')        // 사용자 이름

  // OpenVidu 세션 생성 함수
  const createSession = async (roomName) => {
    try {
      // OpenVidu 서버에 세션 생성 요청
      const response = await axios.post(
        `${OPENVIDU_CONFIG.SERVER_URL}/openvidu/api/sessions`,
        { customSessionId: roomName },
        {
          headers: {
            Authorization: `Basic ${btoa(`OPENVIDUAPP:${OPENVIDU_CONFIG.SERVER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
          withCredentials: false
        }
      )
      // 성공 시 세션 ID 반환, 이미 존재하는 세션이면 해당 roomName 반환
      return response.data?.id || roomName
    } catch (error) {
      // 409 에러는 이미 세션이 존재한다는 의미이므로 roomName 반환
      if (error.response?.status === 409) return roomName
      throw error
    }
  }

  // 토큰 생성 함수 - 세션 참가를 위한 인증 토큰 발급
  const createToken = async (sessionId) => {
    try {
      const response = await axios.post(
        `${OPENVIDU_CONFIG.SERVER_URL}/openvidu/api/sessions/${sessionId}/connection`,
        {},
        {
          headers: {
            Authorization: `Basic ${btoa(`OPENVIDUAPP:${OPENVIDU_CONFIG.SERVER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
          withCredentials: false
        }
      )
      return response.data.token
    } catch (error) {
      throw error
    }
  }

  // 세션 이벤트 핸들러 설정
  const setupSessionEventHandlers = (session, publisher) => {
    // 새로운 스트림이 생성될 때 (새 참가자 입장)
    session.on('streamCreated', (event) => {
      const subscriber = session.subscribe(event.stream, undefined)
      setSubscribers(prev => [...prev, subscriber])
    })

    // 스트림이 제거될 때 (참가자 퇴장)
    session.on('streamDestroyed', (event) => {
      setSubscribers(prev => 
        prev.filter(sub => sub !== event.stream.streamManager)
      )
    })

    // 세션 연결이 끊겼을 때
    session.on('sessionDisconnected', (event) => {
      if (event.reason === 'networkDisconnect') {
        console.warn('Network disconnected')
      }
    })

    // 세션에 처음 연결됐을 때 기존 참가자들의 스트림 구독
    session.on('sessionConnected', () => {
      session.streamManagers.forEach(streamManager => {
        if (streamManager !== publisher) {
          const subscriber = session.subscribe(streamManager.stream, undefined)
          setSubscribers(prev => [...prev, subscriber])
        }
      })
    })
  }

  // 방 입장 함수 - WebRTC 연결의 핵심 로직
  const joinRoom = async ({ roomName, userName }) => {
    try {
      // OpenVidu 객체 생성
      const OV = new OpenVidu()

      // 배포 모드 활성화: 개발 모드에서는 필요 없음; 에러 수준의 로그를 제외하곤 모두 숨김
      OV.enableProdMode()

      // OpenVidu 세션 객체 생성
      const session = OV.initSession()
      const sessionId = session.sessionId
      
      console.log('[session info]', session)
      console.log('[sessionId]', sessionId)

      // WebSocket 연결 설정
      session.options = {
        sessionId: roomName,
        participantId: userName,
        metadata: {},
        reconnectionConfig: OPENVIDU_CONFIG.RECONNECTION_CONFIG
      }

      // 토큰 발급 및 세션 연결
      const token = await createSession(roomName).then(createToken)
      await session.connect(token, { clientData: userName })

      // 로컬 스트림(Publisher) 초기화
      const publisher = await OV.initPublisherAsync(undefined, OPENVIDU_CONFIG.PUBLISHER_OPTIONS)
      
      setupSessionEventHandlers(session, publisher)

      // 스트림 발행 및 상태 업데이트
      await session.publish(publisher)
      
      setPublisher(publisher)
      setSession(session)
      setRoomName(roomName)
      setUserName(userName)

    } catch (error) {
      if (session) session.disconnect()
      throw error
    }
  }

  // 방 나가기 함수 - 모든 연결 해제 및 상태 초기화
  const leaveRoom = () => {
    if (session) {
      session.disconnect()
      setSession(null)
      setPublisher(null)
      setSubscribers([])
      setRoomName('')
      setUserName('')
    }
  }

  // 외부에서 사용할 상태와 함수들 반환
  return {
    session,
    publisher,
    subscribers,
    roomName,
    userName,
    joinRoom,
    leaveRoom
  }
} 