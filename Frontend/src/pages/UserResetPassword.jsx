import axios from 'axios'

import { useEffect, useState } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import { Box, InputLabel, TextField, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import { PrimaryButton } from '../components/common/buttons'
import { useAuth } from '../hooks/useAuth'

const ResetPasswordContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 64px)',
  padding: '0 2rem',
  marginTop: '-64px',
  paddingTop: '64px',
})

const ResetPasswordBox = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

const UserResetPassword = () => {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, setAuthState, logout } = useAuth() // logout 함수 추가

  const queryParams = new URLSearchParams(location.search)
  const emailFromQuery = queryParams.get('email')

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('비밀번호는 8자 이상 128자 이하여야 합니다.')
      return
    }

    try {
      const response = await axios.post(
        BACKEND_URL + '/api/v1/auth/reset-password',
        {
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )

      if (isAuthenticated) {
        try {
          await logout() // 로그아웃 함수 호출
          alert(response.data.message)
          window.location.href = '/auth/login' // 강제로 로그인 페이지로 이동
        } catch (logoutError) {
          console.error('로그아웃 실패:', logoutError)
          // 로그아웃에 실패하더라도 로그인 페이지로 이동
          window.location.href = '/auth/login'
        }
      } else {
        alert(response.data.message)
        window.location.href = '/auth/login'
      }
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error)
      const errorMessage = error.response?.data?.detail
      setError(typeof errorMessage === 'string' ? errorMessage : '비밀번호 재설정에 실패했습니다.')
    }
  }

  useEffect(() => {
    // 비로그인 상태이면서 이메일 쿼리가 없는 경우에만 접근 차단
    if (!isAuthenticated && !emailFromQuery) {
      setError('잘못된 접근입니다. 비밀번호 찾기 페이지를 통해 접근해주세요.')
      navigate('/')
    }
  }, [isAuthenticated, emailFromQuery, navigate])

  return (
    <ResetPasswordContainer>
      <ResetPasswordBox>
        <Typography variant="h4" align="center" gutterBottom fontWeight={950}>
          비밀번호 변경
        </Typography>
        <Typography variant="body1" align="center" gutterBottom>
          {isAuthenticated ? '새로운 비밀번호를 입력해주세요.' : '이메일 인증 후 새로운 비밀번호를 입력해주세요.'}
        </Typography>

        {error && (
          <Typography color="error" align="center">
            {error}
          </Typography>
        )}

        <InputLabel htmlFor="newPassword" sx={{ mb: -1, fontSize: '1em', fontWeight: 'bold' }}>
          새로운 비밀번호
        </InputLabel>
        <TextField
          id="newPassword"
          name="newPassword"
          fullWidth
          type="password"
          placeholder="새로운 비밀번호를 입력해주세요"
          variant="outlined"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <InputLabel htmlFor="confirmPassword" sx={{ mb: -1, fontSize: '1em', fontWeight: 'bold' }}>
          비밀번호 확인
        </InputLabel>
        <TextField
          id="confirmPassword"
          name="confirmPassword"
          fullWidth
          type="password"
          placeholder="비밀번호를 다시 한 번 입력해주세요"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <PrimaryButton fullWidth onClick={handleResetPassword} disabled={!isAuthenticated && !emailFromQuery}>
          비밀번호 변경
        </PrimaryButton>
      </ResetPasswordBox>
    </ResetPasswordContainer>
  )
}

export default UserResetPassword
