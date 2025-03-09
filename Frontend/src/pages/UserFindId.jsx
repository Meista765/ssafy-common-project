import axios from 'axios'

import { useState } from 'react'

import { Box, InputLabel, TextField, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import { PrimaryButton } from '../components/common/buttons'

const FindIdContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 64px)',
  padding: '0 2rem',
  marginTop: '-64px',
  paddingTop: '64px',
})

const FindIdBox = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

const UserFindId = () => {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [error, setError] = useState('') // 에러 메시지 상태 추가
  const [foundEmail, setFoundEmail] = useState('')

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    let formattedValue = ''
    if (value.length <= 3) {
      formattedValue = value
    } else if (value.length <= 7) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`
    } else {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`
    }
    setPhone(formattedValue)
  }

  const handleVerificationCodeSend = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/api/v1/auth/send-sms', null, {
        params: { phone: phone },
      })
      alert(response.data.message)
    } catch (error) {
      console.error('인증번호 전송 오류:', error)
      setError(error.response?.data?.detail || '인증번호 전송에 실패했습니다.')
    }
  }

  const handleVerificationCodeCheck = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/api/v1/auth/verify-sms-code', null, {
        params: {
          phone: phone,
          code: verificationCode,
        },
      })
      setIsPhoneVerified(true)
      alert(response.data.message)
    } catch (error) {
      console.error('인증번호 확인 오류:', error)
      setError(error.response?.data?.detail || '인증번호가 올바르지 않습니다.')
    }
  }

  const handleFindId = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/api/v1/auth/find-id', {
        name: name,
        phone: phone,
      })
      setFoundEmail(response.data.email)
      setError('') // 성공 시 에러 메시지 초기화
    } catch (error) {
      console.error('아이디 찾기 오류:', error)
      setError(error.response?.data?.detail || '아이디를 찾을 수 없습니다.')
    }
  }

  return (
    <FindIdContainer>
      <FindIdBox>
        {/* 헤더 섹션 */}
        <Typography variant="h4" align="center" gutterBottom fontWeight={950}>
          아이디 찾기
        </Typography>
        <Typography variant="body1" align="center" gutterBottom>
          가입 시 입력한 이름과 연락처를 입력해주세요.
        </Typography>

        {/* 에러 메시지 */}
        {error && (
          <Typography color="error" align="center">
            {error}
          </Typography>
        )}

        {/* 아이디 찾기 폼 섹션 */}
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

        <InputLabel htmlFor="phone" sx={{ mb: -1, fontSize: '1em', fontWeight: 'bold' }}>
          연락처
        </InputLabel>
        <Box sx={{ display: 'flex', gap: 1, mb: -1 }}>
          <TextField
            id="phone"
            name="phone"
            fullWidth
            placeholder="연락처를 입력해주세요"
            variant="outlined"
            value={phone}
            inputProps={{
              maxLength: 13,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            onChange={handlePhoneChange}
          />
          <PrimaryButton
            onClick={handleVerificationCodeSend}
            disabled={isPhoneVerified}
            sx={{
              px: 4,
              whiteSpace: 'nowrap',
            }}
          >
            인증번호 전송
          </PrimaryButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            id="verificationCode"
            name="verificationCode"
            fullWidth
            placeholder="인증번호를 입력해주세요"
            variant="outlined"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            disabled={isPhoneVerified}
          />
          <PrimaryButton
            onClick={handleVerificationCodeCheck}
            disabled={isPhoneVerified}
            sx={{
              px: 4,
              whiteSpace: 'nowrap',
            }}
          >
            인증번호 확인
          </PrimaryButton>
        </Box>

        <PrimaryButton fullWidth onClick={handleFindId} disabled={!isPhoneVerified}>
          아이디 찾기
        </PrimaryButton>

        {/* 찾은 아이디 표시 */}
        {foundEmail && (
          <Typography variant="body1" align="center" sx={{ mt: 2 }}>
            찾으시는 아이디는 <b>{foundEmail}</b> 입니다.
          </Typography>
        )}
      </FindIdBox>
    </FindIdContainer>
  )
}

export default UserFindId
