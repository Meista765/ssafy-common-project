import axios from 'axios'

import { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { Box, InputLabel, TextField, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import { PrimaryButton } from '../components/common/buttons'

const FindPasswordContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 64px)',
  padding: '0 2rem',
  marginTop: '-64px',
  paddingTop: '64px',
})

const FindPasswordBox = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

const UserFindPassword = () => {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSendEmailVerificationCode = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/api/v1/auth/send-verification-email', {
        email: email,
        name: name,
      })
      alert(response.data.message)
    } catch (error) {
      console.error('이메일 인증번호 전송 오류:', error)
      setError(error.response?.data?.detail || '이메일 인증번호 전송에 실패했습니다.')
    }
  }

  const handleVerifyEmailCode = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/api/v1/auth/verify-email-code', {
        email: email,
        code: emailVerificationCode,
        name: name, //이름 필드 추가
      })
      setIsEmailVerified(true)
      setError('')
      alert(response.data.message)
      navigate(`/auth/reset-password?email=${email}`) // 이메일 인증 성공 시 비밀번호 변경 페이지로 이동
    } catch (error) {
      console.error('이메일 인증번호 확인 오류:', error)
      setError(error.response?.data?.detail || '이메일 인증번호가 올바르지 않습니다.')
    }
  }

  const handleFindPassword = async () => {
    // 모든 인증이 완료되었으면 비밀번호 재설정 페이지로 이동
    if (isEmailVerified) {
      // 인증 정보를 함께 전달 (예: query parameters)
      navigate(`/reset-password?email=${email}`)
    } else {
      setError('이메일과 전화번호 인증을 모두 완료해주세요.')
    }
  }

  return (
    <FindPasswordContainer>
      <FindPasswordBox>
        {/* 헤더 섹션 */}
        <Typography variant="h4" align="center" gutterBottom fontWeight={950}>
          비밀번호 찾기
        </Typography>
        <Typography variant="body1" align="center" gutterBottom>
          가입 시 입력한 이메일과 이름을 입력해주세요.
        </Typography>

        {/* 에러 메시지 */}
        {error && (
          <Typography color="error" align="center">
            {error}
          </Typography>
        )}

        {/* 이름 입력 필드 */}
        <InputLabel htmlFor="name" sx={{ mb: -1, fontSize: '1em', fontWeight: 'bold' }}>
          이름
        </InputLabel>
        <TextField
          id="name"
          name="name"
          fullWidth
          placeholder="이름을 입력해주세요"
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* 이메일 인증 섹션 */}
        <InputLabel htmlFor="email" sx={{ mb: -1, fontSize: '1em', fontWeight: 'bold' }}>
          이메일
        </InputLabel>
        <Box sx={{ display: 'flex', gap: 1, mb: -1 }}>
          <TextField
            id="email"
            name="email"
            fullWidth
            placeholder="이메일을 입력해주세요"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEmailVerified}
          />
          <PrimaryButton
            onClick={handleSendEmailVerificationCode}
            disabled={isEmailVerified}
            sx={{
              px: 4,
              whiteSpace: 'nowrap',
            }}
          >
            인증 번호 받기
          </PrimaryButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            id="emailVerificationCode"
            name="emailVerificationCode"
            fullWidth
            placeholder="이메일 인증번호를 입력해주세요"
            variant="outlined"
            value={emailVerificationCode}
            onChange={(e) => setEmailVerificationCode(e.target.value)}
          />
        </Box>
        <PrimaryButton
          fullWidth
          onClick={handleVerifyEmailCode}
          sx={{
            px: 4,
            whiteSpace: 'nowrap',
          }}
        >
          모모소 비밀번호 찾기
        </PrimaryButton>
      </FindPasswordBox>
    </FindPasswordContainer>
  )
}

export default UserFindPassword
