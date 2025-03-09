import axios from 'axios'
import { OpenVidu as OpenViduBrowser } from 'openvidu-browser'
import { OpenVidu as OpenViduNode } from 'openvidu-node-client'
import RecordRTC from 'recordrtc'
import { nanoid } from 'nanoid'

import { useEffect, useRef, useState, createRef } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SendIcon from '@mui/icons-material/Send'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useAuth } from '../hooks/useAuth'
import placeholderImage from '/placeholder/cover-image-placeholder.png'

// 경로 상수
const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
const OPENVIDU_SERVER_URL = `${import.meta.env.VITE_OPENVIDU_PROTOCOL}://${import.meta.env.VITE_OPENVIDU_IP}:${import.meta.env.VITE_OPENVIDU_PORT}`
const OPENVIDU_SERVER_SECRET = import.meta.env.VITE_OPENVIDU_SERVER_SECRET

// debounce 유틸리티 함수 추가
const debounce = (func, wait) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// VAD 클래스 추가
const VoiceActivityDetector = class {
  constructor(stream, options = {}) {
    this.audioContext = new AudioContext()
    this.microphone = this.audioContext.createMediaStreamSource(stream)
    this.analyser = this.audioContext.createAnalyser()

    this.recorder = null
    this.isProcessing = false
    this.lastProcessedTime = 0
    this.options = {
      threshold: 0.13,
      maxSilentTime: 2400,
      minRecordingTime: 1000,
      processingDebounce: 1000,
    }

    this.setupAnalyser()
  }

  setupAnalyser() {
    console.warn = function () {}
    this.analyser.minDecibels = -45
    this.analyser.maxDecibels = -10
    this.analyser.fftSize = 2048

    this.microphone.connect(this.analyser)
    this.dataArray = new Float32Array(this.analyser.frequencyBinCount)
  }

  isVoiceActive() {
    this.analyser.getFloatTimeDomainData(this.dataArray)

    const rms = Math.sqrt(this.dataArray.reduce((sum, value) => sum + value * value, 0) / this.dataArray.length)

    const normalizedVolume = Math.abs(rms)
    return normalizedVolume > this.options.threshold
  }

  canProcess() {
    const now = Date.now()
    if (now - this.lastProcessedTime < this.options.processingDebounce) {
      return false
    }
    return true
  }

  async handleRecordingStopped(onDataAvailable) {
    if (this.isProcessing || !this.canProcess()) return

    this.isProcessing = true
    this.lastProcessedTime = Date.now()

    try {
      await new Promise((resolve) => {
        if (!this.recorder) {
          resolve()
          return
        }

        this.recorder.stopRecording(async () => {
          try {
            const blob = this.recorder.getBlob()

            if (blob && blob.size > 0) {
              try {
                await onDataAvailable(blob)
              } catch (error) {
                console.error('오디오 데이터 전송 실패:', error)
              }
            }

            if (this.recorder) {
              this.recorder.reset()
              this.recorder.startRecording()
            }
            resolve()
          } catch (error) {
            console.error('Blob 처리 중 오류:', error)
            resolve()
          }
        })
      })
    } finally {
      this.isProcessing = false
    }
  }

  startRecording(onDataAvailable) {
    if (this.recorder) {
      try {
        this.recorder.stopRecording(() => {
          if (this.recorder) {
            this.recorder.reset()
          }
        })
      } catch (error) {
        console.error('기존 레코더 정리 중 오류:', error)
      }
    }

    const audioStream = this.microphone.mediaStream

    this.recorder = new RecordRTC(audioStream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: RecordRTC.StereoAudioRecorder,
      desiredSampRate: 16000,
      numberOfAudioChannels: 1,
      disableLogs: true,
    })

    this.recorder.startRecording()

    let isRecording = false
    let silentTime = 0
    let recordingTime = 0
    const CHECK_INTERVAL = 200

    const checkVoiceActivity = setInterval(async () => {
      if (this.isProcessing) return

      const isActive = this.isVoiceActive()

      if (isActive) {
        if (!isRecording) {
          isRecording = true
          silentTime = 0
          recordingTime = 0
        } else {
          silentTime = 0
          recordingTime += CHECK_INTERVAL
        }
      } else {
        if (isRecording) {
          silentTime += CHECK_INTERVAL
          recordingTime += CHECK_INTERVAL

          if (recordingTime >= this.options.minRecordingTime && silentTime >= this.options.maxSilentTime) {
            await this.handleRecordingStopped(onDataAvailable)
            isRecording = false
            silentTime = 0
            recordingTime = 0
          }
        }
      }
    }, CHECK_INTERVAL)

    return async () => {
      clearInterval(checkVoiceActivity)
      if (this.recorder) {
        await this.handleRecordingStopped(onDataAvailable)
        if (this.recorder) {
          this.recorder.destroy()
          this.recorder = null
        }
      }
    }
  }
}

export default function DiscussionRoom() {
  const navigate = useNavigate()
  const { discussionId } = useParams()
  const { user, isLoggedIn, loading } = useAuth()

  const isComponentMountedRef = useRef(true)
  const [discussionInfo, setDiscussionInfo] = useState(null)
  const [isMicOn, setIsMicOn] = useState(false)
  const [volume, setVolume] = useState(50)
  const [speakingUsers, setSpeakingUsers] = useState([]) // VAD로 현재 말하고 있는 사용자들의 ID 배열
  const [isVolumeHovered, setIsVolumeHovered] = useState(false)

  // OpenVidu 관련 상태 추가
  const [serverSession, setServerSession] = useState(null) // OpenVidu 세션 객체
  const [clientSession, setClientSession] = useState(null) // OpenVidu 세션 객체
  const [connection, setConnection] = useState(null) // OpenVidu 연결 객체
  const [publisher, setPublisher] = useState(null) // 로컬 스트림(자신의 비디오/오디오)
  const [participants, setParticipants] = useState([]) // 나를 포함한 참가자들의 스트림 객체 배열
  const [subscribers, setSubscribers] = useState([]) // 나를 포함한 참가자들의 구독자 객체 배열
  const [allParticipants,setAllParticipants] = useState([]) // 전체 사용자를 기록하기 위한 배열
  const [subject_test, setSubject] = useState(['주제 추천 버튼을 눌러주세요'])
  // participants 변경 감지를 위한 useEffect
  useEffect(() => {
    console.log('[Participants 변경]', participants)
  }, [participants])


  // 채팅 관련 상태 추가
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [meetingStartTime] = useState(new Date());
  const messagesRef = useRef([]);
  const allParticipantsRef = useRef([]);
  useEffect(()=>{
    messagesRef.current = messages;
  },[messages]);

   // allPriticipanst 변경 감지를 위한 useEffect
   useEffect(()=>{
    allParticipantsRef.current = allParticipants;
   },[allParticipants]);

   useEffect(() => {
    // 5초마다 구독자 오디오 상태 확인
    const checkInterval = setInterval(() => {
      // 구독자 측 간단 체크
      subscribers.forEach((sub, idx) => {
        console.log(`구독자 ${idx} 오디오 활성화 상태:`, sub.stream.audioActive);
      });
    }, 5000);
    
    return () => clearInterval(checkInterval);
  }, [subscribers]);

  // AI 어시스턴트 관련 상태 추가
  const [factChecks, setFactChecks] = useState([])
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false)

  const vadRef = useRef(null)

  const videoRefs = useRef(new Map());

  const participantsRef = useRef([]);
  useEffect(() =>{
    participantsRef.current = participants;
  },[participants]);

  // 오디오 데이터 전송
  const sendAudioData = async (blob) => {
    const formData = new FormData()
    formData.append('audio', blob, `audio_${Date.now()}.wav`)
    formData.append('roomName', discussionInfo?.session_id)
    formData.append('userName', user?.nickname)

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/discussion/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      })

      if (response.data.text) {
        await clientSession.signal({
          data: JSON.stringify({
            text: response.data.text,
            user: user?.nickname,
            user_pk: user?.user_pk,
            timestamp: new Date().toISOString()
          }),
          type: 'stt'
        })
      }
    } catch (error) {
      console.error('오디오 전송 에러:', error)
    }
  }

  // 마이크 토글 핸들러 수정
  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    
    if (publisher) {
      publisher.publishAudio(newMicState);
      
      if (newMicState) {
        // 기존 VAD 정리
        if (vadRef.current) {
          vadRef.current();
          vadRef.current = null;
        }
  
        const audioStream = publisher.stream.getMediaStream();
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          try {
            const vad = new VoiceActivityDetector(audioStream);
            const stopRecording = vad.startRecording(async (blob) => {
              await sendAudioData(blob);
            });
            
            vadRef.current = stopRecording;
          } catch (error) {
            console.error('VAD 설정 중 오류:', error);
          }
        } else {
          console.warn('오디오 트랙이 활성화되지 않았습니다.');
        }
      } else {
        if (vadRef.current) {
          vadRef.current();
          vadRef.current = null;
        }
      }
    }
  };

  // 음성 활동 감지 (게시자)
  useEffect(() => {
    if (publisher && publisher.stream && isMicOn) {
      const audioStream = publisher.stream.getMediaStream()
      const vad = new VoiceActivityDetector(audioStream)

      const checkVoiceActivity = setInterval(() => {
        const isActive = vad.isVoiceActive()
        setSpeakingUsers((prev) => {
          const newSpeakers = new Set(prev)
          if (isActive) {
            newSpeakers.add(user?.user_pk)
          } else {
            newSpeakers.delete(user?.user_pk)
          }
          return Array.from(newSpeakers)
        })
      }, 200)

      return () => clearInterval(checkVoiceActivity)
    }
  }, [publisher, isMicOn, user])

  // 음성 활동 감지 (구독자)
  useEffect(() => {
    const voiceActivityChecks = subscribers
      .filter(sub => sub.stream?.audioActive && sub.stream?.getMediaStream())
      .map(sub => {
        try {
          const connectionData = JSON.parse(sub.stream.connection.data);
          const mediaStream = sub.stream.getMediaStream();
          
          if (!mediaStream || !mediaStream.getAudioTracks().length) {
            console.warn('Invalid media stream for subscriber:', connectionData);
            return null;
          }

          const vad = new VoiceActivityDetector(mediaStream);
          
          const checkVoiceActivity = setInterval(() => {
            const isActive = vad.isVoiceActive();
            setSpeakingUsers(prev => {
              const newSpeakers = new Set(prev);
              if (isActive) {
                newSpeakers.add(connectionData.user_pk);
              } else {
                newSpeakers.delete(connectionData.user_pk);
              }
              return Array.from(newSpeakers);
            });
          }, 200);

          return () => {
            clearInterval(checkVoiceActivity);
            if (vad.audioContext) {
              vad.audioContext.close();
            }
          };
        } catch (error) {
          console.error('Failed to initialize VAD for subscriber:', error);
          return null;
        }
      })
      .filter(Boolean);

    return () => {
      voiceActivityChecks.forEach(cleanup => cleanup && cleanup());
    };
  }, [subscribers]);

  const createProceedings = (async() => {
    // 메시지가 없을 경우 기본 메시지 생성
    if (participantsRef.current.length===0 && messagesRef.current.length > 0){
      const formattedMessages = messagesRef.current.map(msg => {
        // 타임스탬프를 한국 시간 형식으로 변환
        const formattedTime = new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        // 원하는 형태로 객체 구성
        return {
          type: msg.type,
          user: msg.sender.nickname,
          text: msg.content,
          timestamp: formattedTime
        };
      });

      const messagesToSave = formattedMessages
      // Extract participant names correctly
      const participantNames = [
        user?.nickname,
        ...allParticipantsRef.current
          .filter(p => p.nickname && p.nickname !== user?.nickname)
          .map(p => p.nickname)
      ];
  
      const formData = new FormData();
      formData.append('discussion_pk',discussionId)
      formData.append('room_name',discussionInfo?.session_id);
      formData.append('host_name',user?.nickname);
      formData.append('start_time',meetingStartTime.toISOString());
      formData.append('end_time',new Date().toISOString());
      formData.append('duration',((new Date() - meetingStartTime)/1000/60).toFixed(2));
      formData.append('participants', JSON.stringify(participantNames));
  
      formData.append('messages',JSON.stringify(messagesToSave));
  
      try {
        const response = await axios.post(`${BACKEND_URL}/api/v1/discussion/meeting-minutes`, formData,{
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('회의록 저장 성공:',response.data);
        return response.data;
      } catch (error) {
        console.error('회의록 저장 실패: ',error);
        throw error;
      }
    }
  });

  const sendProceedings = (async() => {
      const formattedMessages = messagesRef.current.map(msg => {
        // 타임스탬프를 한국 시간 형식으로 변환
        const formattedTime = new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        // 원하는 형태로 객체 구성
        return {
          type: msg.type,
          user: msg.sender.nickname,
          text: msg.content,
          timestamp: formattedTime
        };
      });
      const messagesToSave = formattedMessages.length > 0 ? formattedMessages :[
        {
          type: 'system',
          text: '회의 중 메시지 없음',
          timestamp: new Date().toLocaleDateString()
        }
      ];
  
      // Extract participant names correctly
      const participantNames = [
        user?.nickname,
        ...allParticipantsRef.current
          .filter(p => p.nickname && p.nickname !== user?.nickname)
          .map(p => p.nickname)
      ];
  
      const formData = new FormData();
      formData.append('discussion_pk',discussionId)
      formData.append('room_name',discussionInfo?.session_id);
      formData.append('host_name',user?.nickname);
      formData.append('start_time',meetingStartTime.toISOString());
      formData.append('end_time',new Date().toISOString());
      formData.append('duration',((new Date() - meetingStartTime)/1000/60).toFixed(2));
      formData.append('participants', JSON.stringify(participantNames));
  
      formData.append('messages',JSON.stringify(messagesToSave));
  
      try {
        const response = await axios.post(`${BACKEND_URL}/api/v1/discussion/subject`, formData,{
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('회의록 전송 성공:',response.data);
        return response.data;
      } catch (error) {
        console.error('회의록 전송 실패: ',error);
        throw error;
      }
  });

  // 토론방 초기화 로직
  useEffect(() => {
    let openViduNode = null
    let openViduBrowser = null
    let serverSideSession = null
    let clientSideSession = null
    let connection = null
    let publisher = null

    const initializeDiscussionRoom = async () => {
      try {
        // 로그인 상태 확인
        if (!isLoggedIn && !loading) {
          navigate('/auth/login', { replace: true })
          return
        }

        // 1. OpenVidu 객체 초기화
        try {
          openViduNode = new OpenViduNode(OPENVIDU_SERVER_URL, OPENVIDU_SERVER_SECRET)
          openViduNode.enableProdMode()
          console.log('[Step 1-1] OpenViduNode 객체 초기화 성공', openViduNode)
        } catch (error) {
          console.error('[Step 1-1] OpenViduNode 객체 초기화 실패:', error)
          throw error
        }

        try {
          openViduBrowser = new OpenViduBrowser()
          openViduBrowser.enableProdMode()
          console.log('[Step 1-2] OpenViduBrowser 객체 초기화 성공', openViduBrowser)
        } catch (error) {
          console.error('[Step 1-2] OpenViduBrowser 객체 초기화 실패:', error)
          throw error
        }

        // 2. 토론방 정보 불러오기
        const { data: discussionData } = await axios.get(`${BACKEND_URL}/api/v1/discussion/${discussionId}`, {
          withCredentials: true,
        })

        setDiscussionInfo(discussionData)
        console.log('[Step 2] 토론방 정보 불러오기 성공', discussionData)

        // 3. 세션 가져오기 또는 생성
        const sessionId = discussionData.session_id
        try {
          // 3-1. 세션 생성 (이미 존재하면 해당 세션 반환)
          serverSideSession = await openViduNode.createSession({
            customSessionId: sessionId,
            mediaMode: 'ROUTED',
            recordingMode: 'MANUAL',
            defaultRecordingProperties: {
              hasAudio: true,
              hasVideo: false,
            },
          })

          setServerSession(serverSideSession)
          console.log('[Step 3] Server-Side Session 설정 성공', serverSideSession)
        } catch (error) {
          console.error('[Step 3] Server-Side Session 설정 실패:', error)
          throw error
        }

        // 4. 연결(connection) 관리 및 생성
        try {
          // 4-1. 세션의 현재 상태 업데이트
          await serverSideSession.fetch()
          console.log('[Server Session] 활성 연결 수:', serverSideSession.activeConnections.length);
          console.log('[Server Session] 활성 스트림 수:', 
            serverSideSession.activeConnections.reduce((count, conn) => {
              return count + conn.publishers.length;
            }, 0)
          );
          // 4-2. 현재 사용자의 기존 연결 찾기
          const userConnections = serverSideSession.activeConnections.filter((conn) => {
            try {
              const data = JSON.parse(conn.serverData)
              return data.user_pk === user?.user_pk
            } catch {
              return false
            }
          })

          // 4-3. 기존 연결 모두 정리
          if (userConnections.length > 0) {
            console.log(`기존 연결 ${userConnections.length}개 정리 시작`)
            for (const conn of userConnections) {
              // 내 정보가 아닌 경우 건너뛰기
              if (
                conn.serverData !==
                JSON.stringify({
                  user_pk: user?.user_pk,
                  nickname: user?.nickname,
                })
              ) {
                continue
              }
              try {
                await serverSideSession.forceDisconnect(conn)
                console.log('기존 연결 정리 성공:', conn.connectionId)
              } catch (error) {
                console.warn('기존 연결 정리 중 오류:', error)
              }
            }
          }

          // 4-4. 새로운 연결 생성 (user 정보 사용)
          connection = await serverSideSession.createConnection({
            role: 'PUBLISHER',
            data: JSON.stringify({
              user_pk: user?.user_pk,
              nickname: user?.nickname,
            }),
          })
          console.log('[Step 4] 새 연결 생성 성공:', connection.connectionId)

          setConnection(connection)
        } catch (error) {
          console.error('[Step 4] 연결 관리 실패:', error)
          throw error
        }

        // 5. 로컬 스트림 초기화 - 오디오 설정 수정
        try {
          publisher = await openViduBrowser.initPublisherAsync(undefined, {
            audioSource: undefined, // 기본 마이크 사용
            videoSource: false,
            publishAudio: false,
            publishVideo: false,
            frameRate: 30,
            insertMode: 'APPEND',
            mirror: false,
            mediaOptions: {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
              }
            }
          });
          console.log('[Step 5] 로컬 스트림 초기화 성공', publisher);
          setPublisher(publisher);
        } catch (error) {
          console.error('[Step 5] 로컬 스트림 초기화 실패:', error);
          throw error;
        }

        // 6. 접속을 위한 Client-Side Session 생성
        try {
          clientSideSession = await openViduBrowser.initSession()
          setClientSession(clientSideSession) // clientSideSession을 상태에 저장
          console.log('[Step 6] 접속을 위한 Client-Side Session 생성 성공', clientSideSession)
        } catch (error) {
          console.error('[Step 6] 접속을 위한 Client-Side Session 생성 실패:', error)
        }

        // 7. 세션 이벤트 핸들러 설정
        // 7-1. 이벤트 핸들러 정의
        const eventHandlers = {
          // 스트림이 생성될 때 (누군가 스트림 발행을 시작할 때)
          streamCreated: (event) => {
            try {
              // 연결 데이터 파싱 및 검증
              const connectionData = JSON.parse(event.stream.connection.data);
              
              // 필수 필드 검증
              if (!connectionData.user_pk || !connectionData.nickname) {
                console.warn('Invalid participant data:', connectionData);
                return;
              }

              const existingParticipant = participants.find(p => 
                p.connectionId === event.stream.connection.connectionId
              );

              if (existingParticipant) {
                return;
              }

              const subscriberOptions = {
                insertMode: 'APPEND',
                subscribeToAudio: true,
                subscribeToVideo: false
              };
          
              const subscriber = clientSideSession.subscribe(event.stream, undefined, subscriberOptions);

              // 비디오 엘리먼트 생성 및 연결
              const videoElement = document.createElement('video');
              videoElement.style.display = 'none';
              subscriber.addVideoElement(videoElement);
              
              // participants 배열 업데이트
              setParticipants(prev => {
                // 이미 존재하는 참가자 확인
                if (prev.some(p => p.user_pk === connectionData.user_pk)) {
                  return prev;
                }

                return [...prev, {
                  connectionId: event.stream.connection.connectionId,
                  user_pk: connectionData.user_pk,
                  nickname: connectionData.nickname,
                  streamManager: subscriber
                }];
                
              });
              setAllParticipants(prev => {
                // 이미 존재하는 참가자 확인
                if (prev.some(p => p.user_pk === connectionData.user_pk)) {
                  return prev;
                }

                return [...prev, {
                  connectionId: event.stream.connection.connectionId,
                  user_pk: connectionData.user_pk,
                  nickname: connectionData.nickname,
                  streamManager: subscriber
                }];
                
              });

              // VAD 이벤트 핸들러 설정
              subscriber.on('publisherStartSpeaking', () => {
                setSpeakingUsers(prev => {
                  const newSpeakers = new Set(prev);
                  newSpeakers.add(connectionData.user_pk);
                  return Array.from(newSpeakers);
                });
              });

              subscriber.on('publisherStopSpeaking', () => {
                setSpeakingUsers(prev => {
                  const newSpeakers = new Set(prev);
                  newSpeakers.delete(connectionData.user_pk);
                  return Array.from(newSpeakers);
                });
              });

              // subscribers 배열에 추가
              setSubscribers(prev => {
                // 중복 구독자 방지
                if (prev.some(s => s.stream.connection.connectionId === event.stream.connection.connectionId)) {
                  return prev;
                }
                return [...prev, subscriber];
              });
            } catch (error) {
              console.error('Error handling new stream:', error);
            }
          },
          // 스트림이 제거될 때
          streamDestroyed: (event) => {
            try {
              const connectionData = JSON.parse(event.stream.connection.data);
              
              // participants 배열에서 제거
              setParticipants(prev => 
                prev.filter(p => p.user_pk !== connectionData.user_pk)
              );

              // subscribers 배열에서 제거
              setSubscribers(prev => 
                prev.filter(s => s.stream.connection.connectionId !== event.stream.connection.connectionId)
              );

              // speakingUsers에서 제거
              setSpeakingUsers(prev => {
                const newSpeakers = new Set(prev);
                newSpeakers.delete(connectionData.user_pk);
                return Array.from(newSpeakers);
              });

              // 비디오 엘리먼트 ref 정리
              const container = videoRefs.current.get(event.stream.connection.connectionId)?.current;
              if (container) {
                while (container.firstChild) {
                  container.removeChild(container.firstChild);
                }
              }
              videoRefs.current.delete(event.stream.connection.connectionId);
            } catch (error) {
              console.error('Error handling stream destruction:', error);
            }
          }
        };
        // 7-2.이벤트 핸들러 등록
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          clientSideSession.on(event, handler)
        })
        console.log('[Step 7] 이벤트 핸들러 등록 성공')

        // 8. 세션 연결
        await clientSideSession.connect(connection.token)
        console.log('[Step 8] 세션 연결 성공')

        // 9. 세션에 스트림 발행
        try {
          console.log('[Step 9-1] 세션 발행 시작', publisher.stream);
          const publishResult = await clientSideSession.publish(publisher);
          console.log('[Step 9-2] 세션 발행 성공', publishResult);
          console.log('[Step 9-3] 오디오 트랙 상태:', 
            publisher.stream.getMediaStream().getAudioTracks().map(track => ({
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              id: track.id
            }))
          );
          // 자신을 participants 배열에 추가
          setParticipants(prev => {
            return [...prev,{
              connectionId: connection.connectionId,
              user_pk: user?.user_pk,
              nickname: user?.nickname,
              streamManager: publisher,
            }];
          });
        } catch (error) {
          console.error('[Step 9] 세션에 스트림 발행 실패:', error);
          throw error;
        }
        
        // 10. 전체 데이터 확인
        console.log('[Step 10] 전체 데이터 확인', {
          clientSideSession,
          serverSideSession,
          connection,
          publisher,
          participants,
        })
      } catch (error) {
        console.error('[] 토론방 초기화 실패', error)
        if (error.response?.status === 404) {
          // Handle 404
          console.error('Discussion room not found')
        }
        // Handle other errors appropriately
      }
    }
    
    initializeDiscussionRoom()
    // Cleanup 함수
    return () => {
      isComponentMountedRef.current = false

      const cleanup = async () => {
        try {
          // 회의록 생성 먼저 진행
          const proceedingsResult = await createProceedings();

          if (publisher) {
            // 오디오 트랙 정리
            if (publisher.stream?.getMediaStream()) {
              const tracks = publisher.stream.getMediaStream().getTracks()
              tracks.forEach((track) => track.stop())
            }

            // Publisher 이벤트 리스너 제거
            publisher.off('*')
            // 세션에서 Publisher 제거
            if (clientSideSession) {
              await clientSideSession.unpublish(publisher)
            }
          }

          // 세션 연결 해제
          if (clientSideSession) {
            clientSideSession.off('*')
            await clientSideSession.disconnect()
          }

          // 상태 초기화
          setClientSession(null)
          setConnection(null)
          setPublisher(null)
          setParticipants([])
          setSpeakingUsers([])

          // VAD 정리
          if (vadRef.current) {
            vadRef.current()
            vadRef.current = null
          }
        } catch (error) {
          console.error('나가기 처리 중 오류 발생:', error)
        }
      }

      cleanup()
    }
  }, [discussionId, isLoggedIn, loading, navigate, user])

  const handleBack = () => {
    navigate(-1, {
      // replace: true,
    })
  }

  // 볼륨 조절에 debounce 적용
  const debouncedVolumeChange = debounce((newValue) => {
    // 정규화된 볼륨 값 (0-1 범위)
    const normalizedVolume = newValue / 100;
    
    // DOM에서 모든 video/audio 요소를 찾아 볼륨 조절
    const mediaElements = document.querySelectorAll('video, audio');
    console.log(`[볼륨 조절] ${mediaElements.length}개의 미디어 요소 발견`);
    
    mediaElements.forEach((element, index) => {
      try {
        element.volume = normalizedVolume;
        console.log(`[볼륨 조절] 요소 ${index} 볼륨 설정: ${normalizedVolume}`);
      } catch (error) {
        console.error(`[볼륨 조절] 요소 ${index} 볼륨 설정 실패:`, error);
      }
    });
  }, 100);

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue)
    debouncedVolumeChange(newValue)
  }

  // 볼륨 토글 핸들러 (음소거/음소거 해제)
  const toggleVolume = () => {
    const newVolume = volume === 0 ? 50 : 0;
    setVolume(newVolume);
    debouncedVolumeChange(newVolume);
  };

  // OpenVidu 시그널 이벤트 처리 부분 수정
  useEffect(() => {
    if (clientSession) {
      // 이전 이벤트 리스너 제거
      clientSession.off('signal:chat');
      clientSession.off('signal:stt');

      const handleSignal = (event) => {
        const data = JSON.parse(event.data);
        const timestamp = data.timestamp || new Date().toISOString();
        
        // 본인이 보낸 chat 타입 메시지는 무시 (이미 로컬에 추가되어 있음)
        if (event.type === 'signal:chat' && data.user_pk === user?.user_pk) {
          return;
        }
        
        setMessages(prev => {
          // 중복 메시지 방지를 위한 검증
          const isDuplicate = prev.some(msg => 
            msg.timestamp === timestamp && 
            msg.sender.user_pk === data.user_pk &&
            msg.content === (data.text || data.message)
          );

          if (isDuplicate) {
            return prev;
          }

          return [...prev, {
            id: nanoid(),
            type: event.type.split(':')[1],
            content: data.text || data.message,
            timestamp: timestamp,
            sender: {
              user_pk: data.user_pk,
              nickname: data.user || data.nickname,
            }
          }];
        });
      };

      // 새로운 이벤트 리스너 등록
      clientSession.on('signal:chat', handleSignal);
      clientSession.on('signal:stt', handleSignal);

      return () => {
        clientSession.off('signal:chat', handleSignal);
        clientSession.off('signal:stt', handleSignal);
      };
    }
  }, [clientSession, user?.user_pk]); // user?.user_pk 의존성 추가

  // 채팅 메시지 전송 함수 수정
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const timestamp = new Date().toISOString();
    const messageId = nanoid();
    
    const messageData = {
      id: messageId,
      message: newMessage,
      user_pk: user?.user_pk,
      nickname: user?.nickname,
      timestamp: timestamp,
      type: 'chat'
    };

    try {
      await clientSession.signal({
        data: JSON.stringify(messageData),
        type: 'chat'
      });
      
      // 로컬 메시지 추가 (본인 메시지)
      setMessages(prev => [...prev, {
        id: messageId,
        type: 'chat',
        content: newMessage,
        timestamp: timestamp,
        sender: {
          user_pk: user?.user_pk,
          nickname: user?.nickname
        }
      }]);
      
      setNewMessage('');
    } catch (error) {
      console.error('채팅 전송 에러:', error);
    }
  };

  // 팩트 체크 핸들러
  const handleFactCheck = async (message) => {
    const formData = new FormData();
    formData.append('discussion_pk',discussionId)
    formData.append('content',message.content)
    try {
      const fact_res = await axios.post(`${BACKEND_URL}/api/v1/discussion/fact-check`, formData,{
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
        const test_resp = {
          timestamp : new Date().toISOString(),
          message : message.content,
          result: fact_res.data.factcheck
        }
        setFactChecks((prev) => [...prev, test_resp])
    } catch (error) {
      console.error('Failed to check fact:', error)
    }
  }

  // 토론 주제 추천 핸들러
  const handleTopicRecommendation = async () => {
    setIsGeneratingTopic(true)
    try {
      const response = await sendProceedings();
      setSubject(response.subject)
    } catch (error) {
      console.error('Failed to generate topic:', error)
    } finally {
      setIsGeneratingTopic(false)
    }
  }

  const handleImageError = (event) => {
    event.target.src = placeholderImage
  }

  // 비디오 엘리먼트 생성 및 연결을 위한 useEffect 수정
  useEffect(() => {
    // 약간의 지연을 주어 DOM이 마운트된 후 실행되도록 함
    const timer = setTimeout(() => {
      participants.forEach(participant => {
        const container = videoRefs.current.get(participant.connectionId)?.current;
        
        // container가 존재하고 비어있을 때만 videoElement 생성
        if (container && !container.hasChildNodes() && participant.streamManager) {
          try {
            const videoElement = participant.streamManager.createVideoElement();
            videoElement.style.display = 'none';
            container.appendChild(videoElement);
          } catch (error) {
            console.error('Error creating video element:', error);
          }
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      // cleanup
      participants.forEach(participant => {
        const container = videoRefs.current.get(participant.connectionId)?.current;
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        }
      });
    };
  }, [participants]);

  return (
    <Grid
      container
      sx={{
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {!discussionInfo ? (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ width: '100%', height: '100%' }}>
          <Typography>토론방 정보를 불러오는 중...</Typography>
        </Stack>
      ) : (
        <>
          {/* 상단 헤더 */}
          <Grid
            size={12}
            sx={{
              height: 'fit-content',
              borderBottom: '1px solid #EEEEEE',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton onClick={handleBack}>
                  <ArrowBackIcon />
                </IconButton>
                <Stack>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
                    {discussionInfo.novel.title} {discussionInfo.episode && `- ${discussionInfo.episode}화`} 토론방
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    {discussionInfo.topic}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  시작 시간:{' '}
                  {new Date(discussionInfo.start_time).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  현재 참여자: {discussionInfo.participants.length}명
                </Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* 컨텐츠 영역 컨테이너 */}
          <Grid
            container
            size={12}
            sx={{
              height: 'calc(100vh - 72px)',
              overflow: 'hidden',
            }}
          >
            {/* 좌측 사이드바 */}
            <Grid
              size={3}
              sx={{
                height: '100%',
                borderRight: '1px solid #EEEEEE',
                bgcolor: '#FAFAFA',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 참여자 목록 헤더 */}
              <Stack sx={{ p: 2, borderBottom: '1px solid #EEEEEE' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  토론 참여자 ({discussionInfo.participants.length})
                </Typography>
              </Stack>

              {/* 참여자 목록 */}
              <Stack sx={{ flex: 1, overflow: 'auto', height: 'calc(100% - 100px)' }}>
                {participants.map((participant) => (
                  <Stack
                    key={participant.connectionId}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: '#F5F5F5',
                      },
                    }}
                  >
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 12,
                        color: speakingUsers.includes(participant.user_pk) ? '#4CAF50' : '#9E9E9E',
                      }}
                    />
                    <Typography>{participant.nickname}</Typography>
                  </Stack>
                ))}
              </Stack>

              {/* 하단 컨트롤 */}
              <Stack
                sx={{
                  p: 2,
                  borderTop: '1px solid #EEEEEE',
                  bgcolor: '#FFFFFF',
                }}
                spacing={2}
              >
                {/* 볼륨 & 마이크 컨트롤 */}
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                  {/* 마이크 버튼 */}
                  <IconButton onClick={handleMicToggle}>
                    {isMicOn ? <MicIcon /> : <MicOffIcon color="error" />}
                  </IconButton>

                  {/* 볼륨 컨트롤 */}
                  <IconButton
                    onClick={toggleVolume}
                    onMouseEnter={() => setIsVolumeHovered(true)}
                    onMouseLeave={() => setIsVolumeHovered(false)}
                  >
                    {volume === 0 ? <VolumeOffIcon color="error" /> : <VolumeUpIcon />}

                    {/* 호버 시 나타나는 볼륨 슬라이더 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: '52px',
                        left: '8px',
                        height: '120px',
                        opacity: isVolumeHovered ? 1 : 0,
                        visibility: isVolumeHovered ? 'visible' : 'hidden',
                        transition: 'opacity 0.2s, visibility 0.2s',
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        boxShadow: 1,
                        zIndex: 1,
                      }}
                      onMouseEnter={() => setIsVolumeHovered(true)}
                      onMouseLeave={() => setIsVolumeHovered(false)}
                    >
                      <Slider
                        value={volume}
                        onChange={handleVolumeChange}
                        onClick={(e) => e.stopPropagation()} // 이벤트 전파 방지
                        aria-label="Volume"
                        orientation="vertical"
                        size="small"
                        sx={{
                          '& .MuiSlider-root': {
                            padding: '32px 12px',
                          },
                          '& .MuiSlider-thumb': {
                            width: 12,
                            height: 12,
                          },
                          height: '100%',
                          mt: 0.5,
                          mb: 0.5,
                        }}
                      />
                    </Box>
                  </IconButton>
                </Stack>

                {/* 구분선 */}
                <Stack
                  sx={{
                    width: '100%',
                    height: '1px',
                    bgcolor: '#EEEEEE',
                  }}
                />

                {/* 나가기 버튼 */}
                <Button variant="contained" color="error" fullWidth onClick={() => navigate(-1)}>
                  토론방 나가기
                </Button>
              </Stack>
            </Grid>

            {/* 메인 컨텐츠 영역 */}
            <Grid
              size={6}
              sx={{
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 채팅 메시지 영역 */}
              <Stack
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  gap: 2,
                }}
              >
                {messages.map((message) => (
                  <Stack
                    key={message.id}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    sx={{
                      alignSelf: message.sender.user_pk === user?.user_pk ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {message.sender.user_pk !== user?.user_pk && (
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: '#F5F5F5',
                          p: 1,
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {message.sender.nickname[0]}
                      </Typography>
                    )}
                    <Stack spacing={0.5}>
                      {message.sender.user_pk !== user?.user_pk && (
                        <Typography variant="caption" color="text.secondary">
                          {message.sender.nickname}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="flex-end"
                        sx={{
                          flexDirection: message.sender.user_pk === user?.user_pk ? 'row-reverse' : 'row',
                        }}
                      >
                        <Stack
                          sx={{
                            bgcolor: message.sender.user_pk === user?.user_pk 
                              ? (message.type === 'stt' ? '#E3F2FD' : '#E8F5E9')  // 내 메시지: STT는 파란색, 채팅은 초록색
                              : (message.type === 'stt' ? '#E1F5FE' : '#F5F5F5'),  // 상대방 메시지: STT는 연한 파란색, 채팅은 회색
                            p: 1.5,
                            borderRadius: 2,
                            width: '70%',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {message.type === 'stt' && (
                              <MicIcon 
                                sx={{ 
                                  fontSize: '0.875rem',
                                  color: message.sender.user_pk === user?.user_pk 
                                    ? '#1976D2'  // 내 STT 메시지의 마이크 아이콘
                                    : '#03A9F4'  // 상대방 STT 메시지의 마이크 아이콘
                                }} 
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                wordBreak: 'break-word',
                                lineHeight: 1.8,
                                gap: 0.5,
                              }}
                            >
                              {message.content}
                              <Tooltip title="Fact Check" arrow placement="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleFactCheck(message)}
                                  sx={{
                                    pb: 0.875,
                                    '& .MuiSvgIcon-root': {
                                      fontSize: '1rem',
                                    },
                                  }}
                                >
                                  <FactCheckOutlinedIcon />
                                </IconButton>
                              </Tooltip>
                            </Typography>
                          </Stack>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0}
                          alignItems="center"
                          sx={{
                            whiteSpace: 'nowrap',
                            flexDirection:
                              message.sender.user_pk === user?.user_pk ? 'row-reverse' : 'row',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                ))}
              </Stack>

              {/* 메시지 입력 영역 */}
              <Stack
                component="form"
                direction="row"
                spacing={1}
                sx={{
                  p: 2,
                  borderTop: '1px solid #EEEEEE',
                  bgcolor: '#FFFFFF',
                }}
                onSubmit={sendChatMessage}
              >
                <TextField
                  fullWidth
                  size="small"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="메시지를 입력하세요"
                  variant="outlined"
                  disabled={!clientSession}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#F5F5F5',
                    },
                  }}
                />
                <IconButton type="submit" disabled={!clientSession || !newMessage.trim()} color="primary">
                  <SendIcon />
                </IconButton>
              </Stack>
            </Grid>

            {/* AI 어시스턴트 사이드바 */}
            <Grid
              size={3}
              sx={{
                height: '100%',
                borderLeft: '1px solid #EEEEEE',
                bgcolor: '#FAFAFA',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* AI 어시스턴트 헤더 */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ p: 2, borderBottom: '1px solid #EEEEEE' }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    AI 어시스턴트
                  </Typography>
                </Stack>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              {/* 토론 주제 추천 */}
              <Stack sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                    토론 주제 추천
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleTopicRecommendation}
                    disabled={isGeneratingTopic}
                    sx={{ bgcolor: '#FFA726', '&:hover': { bgcolor: '#FB8C00' } }}
                  >
                    주제
                  </Button>
                </Stack>
                <Stack
                  sx={{
                    p: 2,
                    bgcolor: '#EEEEEE',
                    borderRadius: 1,
                    minHeight: 80,
                    maxHeight: 200, //토론 주제 추천 스크롤
                    overflow: 'auto',
                  }}
                >
                  <Typography 
                  variant="body2"
                   color="text.secondary"
                   sx={{ whiteSpace: 'pre-line'}}
                   >
                    {subject_test}
                  </Typography>
                </Stack>
              </Stack>

              {/* 팩트 체크 */}
              <Stack sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
                  FACT CHECK
                </Typography>
                <Stack spacing={2}>
                  {factChecks.map((check) => (
                    <Stack
                      key={check.timestamp}
                      sx={{
                        p: 2,
                        bgcolor: '#E8F5E9',
                        borderRadius: 1,
                      }}
                      spacing={1}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {new Date(check.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        &ldquo;{check.message}&rdquo;
                      </Typography>
                      <Typography 
                      variant="body2"
                      sx={{ whiteSpace: 'pre-line'}}
                      >
                        {check.result}
                        </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}
    </Grid>
  )
}
