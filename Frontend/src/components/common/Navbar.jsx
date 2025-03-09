import { useAuth } from '@/hooks/useAuth'

import { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import MenuIcon from '@mui/icons-material/Menu'
import PersonIcon from '@mui/icons-material/Person'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import textLogo from '/logo/text-logo.svg'

// 경로 수정

const Navbar = () => {
  const { isLoggedIn, logout, loading, showLoginModal } = useAuth() // showLoginModal 추가
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // 로그인이 필요한 페이지 목록
  const protectedRoutes = ['/novel/edit', '/discussion']

  const handleProtectedNavigation = (path) => {
    if (!isLoggedIn && protectedRoutes.includes(path)) {
      showLoginModal('/auth/login')
      return
    }
    navigate(path)
  }

  const handleLogoutClick = () => {
    setUserMenuAnchorEl(null)
    logout()
  }

  const renderMenuItems = () => {
    if (loading) {
      return <MenuItem>로딩중...</MenuItem>
    }

    if (isLoggedIn) {
      return (
        <>
          <MenuItem component={Link} to="/auth/mypage">
            <PersonIcon sx={{ mr: 1 }} />
            마이페이지
          </MenuItem>
          <MenuItem component={Link} to="/auth/change-info">
            <ManageAccountsIcon sx={{ mr: 1 }} />
            회원정보 수정
          </MenuItem>
          <MenuItem onClick={handleLogoutClick}>
            <LogoutIcon sx={{ mr: 1 }} />
            로그아웃
          </MenuItem>
        </>
      )
    } else {
      return (
        <>
          <MenuItem component={Link} to="/auth/login">
            <LoginIcon sx={{ mr: 1 }} />
            로그인
          </MenuItem>
          <MenuItem component={Link} to="/auth/signup">
            <HowToRegIcon sx={{ mr: 1 }} />
            회원가입
          </MenuItem>
        </>
      )
    }
  }

  return (
    <AppBar
      sx={{
        backgroundColor: '#FFFFFF',
        boxShadow: 'none',
        borderBottom: '1px solid #E5E5E5',
        fontFamily: 'Pretendard-Regular, sans-serif',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', height: '30px' }}>
          <img src={textLogo} alt="MOMOSO" style={{ height: '30px', width: 'auto' }} />
        </Link>
        {isMobile ? (
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <MenuIcon sx={{ color: '#000000' }} />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              onClick={() => setAnchorEl(null)}
            >
              <div>
                <MenuItem onClick={() => navigate('/novel')}>소설 게시판</MenuItem>
                <MenuItem onClick={() => handleProtectedNavigation('/discussion')}>그룹 토론</MenuItem>
                <MenuItem onClick={() => handleProtectedNavigation('/novel/edit')}>AI소설 에디터</MenuItem>
              </div>
            </Menu>
          </IconButton>
        ) : (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Link
              onClick={(e) => {
                e.preventDefault()
                handleProtectedNavigation('/novel/edit')
              }}
              style={{
                textDecoration: 'none',
                color: '#000000',
                fontFamily: 'Pretendard-Regular, sans-serif',
                cursor: 'pointer',
                '&:hover': { color: '#FFA726' },
              }}
            >
              AI소설 에디터
            </Link>
            <Link
              onClick={(e) => {
                e.preventDefault()
                handleProtectedNavigation('/discussion')
              }}
              style={{
                textDecoration: 'none',
                color: '#000000',
                fontFamily: 'Pretendard-Regular, sans-serif',
                cursor: 'pointer',
                '&:hover': { color: '#FFA726' },
              }}
            >
              그룹 토론
            </Link>
            <Link
              to="/novel"
              style={{
                textDecoration: 'none',
                color: '#000000',
                fontFamily: 'Pretendard-Regular, sans-serif',
                '&:hover': { color: '#FFA726' },
              }}
            >
              소설 게시판
            </Link>
            <IconButton onClick={(event) => setUserMenuAnchorEl(event.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#FFA726' }}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={userMenuAnchorEl}
              open={Boolean(userMenuAnchorEl)}
              onClose={() => setUserMenuAnchorEl(null)}
              onClick={() => setUserMenuAnchorEl(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              disableScrollLock
            >
              <div>{renderMenuItems()}</div>
            </Menu>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
