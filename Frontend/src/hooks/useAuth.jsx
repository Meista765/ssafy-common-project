import axios from 'axios'
import PropTypes from 'prop-types'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [openLoginModal, setOpenLoginModal] = useState(false)
  const [openLogoutModal, setOpenLogoutModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState('')
  const [loginError, setLoginError] = useState('')
  const [googleLoginUrl, setGoogleLoginUrl] = useState('')

  const baseURL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

  // Axios 기본 설정
  useEffect(() => {
    axios.defaults.withCredentials = true
    axios.defaults.baseURL = baseURL
  }, [])

  // 로그인 상태 확인
  const checkLoginStatus = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/auth/me', {
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      if (response.data) {
        setIsLoggedIn(true)
        setUser(response.data)
      } else {
        setIsLoggedIn(false)
        setUser(null)
      }
    } catch (error) {
      setIsLoggedIn(false)
      setUser(null)
    }
    setLoading(false)
  }

  // 로그아웃
  const logout = async () => {
    try {
      await axios.post('/api/v1/auth/logout', {}, { withCredentials: true })
      setIsLoggedIn(false)
      setUser(null)
      setOpenLogoutModal(true)
      navigate('/auth/login')
    } catch (error) {
      // 에러 발생 시 사용자에게 알림
    }
  }

  const handleLogoutModalClose = () => {
    setOpenLogoutModal(false)
  }

  const showLoginModal = (redirectPath = '/auth/login') => {
    setOpenLoginModal(true)
    setPendingNavigation(redirectPath)
  }

  const handleLoginModalClose = () => {
    setOpenLoginModal(false)
    if (pendingNavigation) {
      navigate(pendingNavigation)
      setPendingNavigation('')
    }
  }

  // 일반 로그인
  const login = async (email, password) => {
    if (!email || !password) {
      setLoginError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }
    setLoginError('')

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      await axios.post('/api/v1/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
      })

      setIsLoggedIn(true)
      await checkLoginStatus()
      navigate(-1)
    } catch (error) {
      if (error.response?.status === 400) {
        setLoginError(error.response.data.detail)
      } else {
        setLoginError('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
      throw error
    }
  }

  const handleSocialLogin = useCallback(async () => {
    // 로그인 전에 loading 상태를 true로 설정
    setLoading(true)

    // Google 로그인 페이지로 리다이렉트
    window.location.href = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/oauth/google/login`
  }, [])

  useEffect(() => {
    checkLoginStatus()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        loading,
        user,
        loginError,
        login,
        logout,
        showLoginModal,
        handleSocialLogin,
        checkLoginStatus, // 추가
        setIsLoggedIn, // 추가
      }}
    >
      {children}
      <Dialog
        open={openLoginModal}
        onClose={handleLoginModalClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">로그인이 필요한 서비스입니다.</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            확인 버튼 또는 엔터 키를 누르시면 로그인 페이지로 이동합니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLoginModalClose} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLogoutModal}
        onClose={handleLogoutModalClose}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">로그아웃</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">성공적으로 로그아웃되었습니다.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutModalClose} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAuth = () => useContext(AuthContext)
