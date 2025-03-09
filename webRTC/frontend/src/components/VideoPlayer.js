// src/components/VideoPlayer.js
import React, { useRef, useEffect, useState } from 'react';
import { Box, Slider } from '@mui/material';
import { VolumeUp } from '@mui/icons-material';

const VideoPlayer = ({ streamManager, isPublisher = false }) => {
  const videoRef = useRef();
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    if (streamManager && videoRef.current) {
      streamManager.addVideoElement(videoRef.current);
    }
  }, [streamManager]);

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (videoRef.current) {
      videoRef.current.volume = newValue / 100;
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <video
        autoPlay={true}
        ref={videoRef}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '400px',
          transform: isPublisher ? 'scaleX(-1)' : 'none',
        }}
      />
      {!isPublisher && ( // 자신의 비디오에는 볼륨 조절 표시하지 않음
        <Box sx={{ 
          position: 'absolute', 
          bottom: 10, 
          right: 10, 
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '5px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '150px'
        }}>
          <VolumeUp sx={{ color: 'white' }} />
          <Slider
            size="small"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
            sx={{ 
              color: 'white',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer;