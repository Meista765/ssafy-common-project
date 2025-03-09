// src/components/JoinForm.js
import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

const JoinForm = ({ onJoin }) => {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName && userName) {
      onJoin({ roomName, userName });
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxWidth: 400,
        margin: '0 auto',
        mt: 4,
        p: 3,
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        토론방 입장
      </Typography>
      
      <TextField
        label="방 이름"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        required
        fullWidth
      />
      
      <TextField
        label="사용자 이름"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        required
        fullWidth
      />
      
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={!roomName || !userName}
      >
        입장하기
      </Button>
    </Box>
  );
};

export default JoinForm;