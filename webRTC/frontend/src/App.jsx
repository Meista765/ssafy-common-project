import React, { useState } from 'react';
import { OpenVidu } from 'openvidu-browser';
import axios from 'axios';
import JoinForm from './components/JoinForm';
import DebateRoom from './components/DebateRoom';

// axios 기본 설정
axios.defaults.headers.post['Content-Type'] = 'application/json';

const App = () => {
  const [session, setSession] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');

  // 환경변수에서 OpenVidu 설정 가져오기
  const OPENVIDU_SERVER_URL = `${import.meta.env.VITE_OPENVIDU_PROTOCOL}://${import.meta.env.VITE_OPENVIDU_IP}:${import.meta.env.VITE_OPENVIDU_PORT}`;
  const OPENVIDU_SERVER_SECRET = import.meta.env.VITE_OPENVIDU_SERVER_SECRET;

  // 세션 생성
  const createSession = async (sessionId) => {

    try {
      const response = await axios.post(
        `${OPENVIDU_SERVER_URL}/openvidu/api/sessions`,
        { customSessionId: sessionId },
        {
          headers: {
            'Authorization': `Basic ${btoa(`OPENVIDUAPP:${OPENVIDU_SERVER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data?.id || sessionId;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  };

  // 세션 탐색 및 생성성
  const getOrCreateSession = async (sessionId) => {
    try {
      const response = await axios.get(
        `${OPENVIDU_SERVER_URL}/openvidu/api/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`OPENVIDUAPP:${OPENVIDU_SERVER_SECRET}`)}`,
          },
        }
      );
      return response.data?.id;
    } catch (error) {
      if (error.response?.status === 404) {
        return await createSession(sessionId);
      }
    }
  }

  // 토큰 생성
  const createToken = async (sessionId) => {
    try {
      const response = await axios.post(
        `${OPENVIDU_SERVER_URL}/openvidu/api/sessions/${sessionId}/connection`,
        {},
        {
          headers: {
            'Authorization': `Basic ${btoa(`OPENVIDUAPP:${OPENVIDU_SERVER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.token;
    } catch (error) {
      console.error('Token creation error:', error);
      throw error;
    }
  };

  // 방에 참가
  const joinRoom = async (roomData) => {
    const { roomName, userName } = roomData;

    const sessionId = roomName

    try {
      const OV = new OpenVidu();
      OV.enableProdMode();
      const session = OV.initSession();

      session.on('streamCreated', (event) => {
        const subscriber = session.subscribe(event.stream);
        setSubscribers((prev) => [...prev, subscriber]);
      });

      session.on('streamDestroyed', (event) => {
        setSubscribers((prev) => prev.filter(sub => sub !== event.stream.streamManager));
      });


      const token = await createToken(await getOrCreateSession(sessionId));
      await session.connect(token, { clientData: userName });

      const publisher = await OV.initPublisherAsync(undefined, {
        audioSource: undefined,
        videoSource: undefined,
        publishAudio: false,
        publishVideo: false,
        resolution: '640x480',
        frameRate: 30,
        insertMode: 'APPEND',
        mirror: true,
        mediaOptions: {
          audio: {
            echoCancellation: true,  // 에코 취소
            noiseSuppression: true,  // 소음 억제
            autoGainControl: true    // 자동 게인 제어
          },
        }
      });

      await session.publish(publisher);
      setPublisher(publisher);
      setSession(session);
      setRoomName(roomName);
      setUserName(userName);

    } catch (error) {
      console.error('Error joining room:', error);
      if (session) session.disconnect();
      throw error;
    }
  };

  // 방 나가기
  const leaveRoom = () => {
    if (session) {
      session.disconnect();
      setSession(null);
      setPublisher(null);
      setSubscribers([]);
      setRoomName('');
      setUserName('');
    }
  };

  return (
    <div className="App">
      {!session ? (
        <JoinForm onJoin={joinRoom} />
      ) : (
        <DebateRoom
          session={session}
          publisher={publisher}
          subscribers={subscribers}
          roomName={roomName}
          userName={userName}
          onLeave={leaveRoom}
        />
      )}
    </div>
  )
}

export default App;
