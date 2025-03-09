import { useAuth } from '@/hooks/useAuth'

import { useState } from 'react'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import Diversity3Icon from '@mui/icons-material/Diversity3'
import Edit from '@mui/icons-material/Edit'
import Home from '@mui/icons-material/Home'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import KeyboardDoubleArrowLeft from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRight from '@mui/icons-material/KeyboardDoubleArrowRight'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import PersonIcon from '@mui/icons-material/Person'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

const drawerWidth = 280

const Sidebar = () => {
  const [open, setOpen] = useState(true)
  const { user, isLoggedIn, showLoginModal, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null)

  const menuItems = [
    { text: '홈', icon: <Home fontSize="large" />, path: '/' },
    { text: 'AI 소설 에디터', icon: <Edit fontSize="large" />, path: '/novel/edit/' },
    { text: '그룹 토론', icon: <Diversity3Icon fontSize="large" />, path: '/discussion' },
    { text: '소설 게시판', icon: <LocalLibraryIcon fontSize="large" />, path: '/novel' },
  ]

  const handleDrawerToggle = () => {
    // TODO: Add animation effect when toggling drawer
    setOpen(!open)
  }

  const handleNavigate = (path) => {
    // 보호된 경로 체크
    const protectedRoutes = ['/novel/edit', '/conference']
    if (!isLoggedIn && protectedRoutes.includes(path)) {
      showLoginModal('/auth/login')
      return
    }
    navigate(path)
  }

  const handleUserMenuOpen = (event) => {
    if (!isLoggedIn) {
      showLoginModal('/auth/login')
      return
    }
    setUserMenuAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null)
  }

  const handleLogoutClick = () => {
    handleUserMenuClose()
    logout()
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 72,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 72,
          boxSizing: 'border-box',
          backgroundColor: '#FFF8EE',
          color: '#1E1E1E',
          transition: 'width 0.2s ease-in-out',
          overflowX: 'hidden',
        },
      }}
    >
      <Stack
        direction={open ? 'row' : 'column'}
        alignItems="center"
        justifyContent={open ? 'space-between' : 'center'}
        sx={{
          p: (theme) => theme.spacing(0, 1),
          height: open ? '64px' : '128px',
          gap: (theme) => (open ? theme.spacing(2) : theme.spacing(3)),
        }}
      >
        {open ? (
          <>
            <Stack sx={{ alignItems: 'center', '& img': { pl: 2, height: '24px', width: 'auto' } }}>
              <img src="/logo/text-logo.svg" alt="MOMOSO" />
            </Stack>
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                backgroundColor: '#FFB347',
                color: '#FFFFFF',
                borderRadius: '50%',
                height: '28px',
                width: '28px',
                '&:hover': { backgroundColor: '#FFA022' },
              }}
            >
              <KeyboardDoubleArrowLeft />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                backgroundColor: '#FFB347',
                color: '#FFFFFF',
                borderRadius: '50%',
                height: '30px',
                width: '30px',
                '&:hover': { backgroundColor: '#FFA022' },
              }}
            >
              <KeyboardDoubleArrowRight />
            </IconButton>
            <Stack
              sx={{
                alignItems: 'center',
                '& img': { height: '32px', width: 'auto', maxWidth: '100%' },
              }}
            >
              <img src="/logo/graphic-logo.svg" alt="MOMOSO" />
            </Stack>
          </>
        )}
      </Stack>
      <Divider />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                '&:hover': { backgroundColor: '#FFE5CC' },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: '#1E1E1E',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: {
                      sx: {
                        color: '#1E1E1E',
                        fontFamily: '"Poppins", "Pretendard"',
                        fontSize: '20px',
                        fontWeight: 'bold',
                      },
                    },
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Stack sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <Divider />
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleUserMenuOpen}
            sx={{
              justifyContent: open ? 'initial' : 'center',
              alignItems: 'center',
              px: 2.5,
              '&:hover': { backgroundColor: '#FFE5CC' },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                my: open ? 0 : 1.5,
                justifyContent: 'center',
              }}
            >
              <Avatar
                src={user?.user_img}
                sx={{
                  width: 32,
                  height: 32,
                  border: '2px solid #FFB347',
                }}
              />
            </ListItemIcon>
            {open && (
              <Stack sx={{ flex: 1 }}>
                <ListItemText
                  primary={user ? user.nickname : '로그인이 필요합니다'}
                  secondary={user ? user.email : null}
                  slotProps={{
                    primary: {
                      sx: { color: '#1E1E1E', fontSize: '16px', fontWeight: 'bold', mb: 0 },
                    },
                    secondary: { sx: { color: '#666666', fontSize: 'auto' } },
                  }}
                />
              </Stack>
            )}
          </ListItemButton>
          <Menu
            anchorEl={userMenuAnchorEl}
            open={Boolean(userMenuAnchorEl)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            {isLoggedIn ? (
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
            ) : (
              <>
                <MenuItem onClick={() => showLoginModal('/auth/login')}>
                  <LoginIcon sx={{ mr: 1 }} />
                  로그인
                </MenuItem>
                <MenuItem component={Link} to="/auth/signup">
                  <HowToRegIcon sx={{ mr: 1 }} />
                  회원가입
                </MenuItem>
              </>
            )}
          </Menu>
        </ListItem>
      </Stack>
    </Drawer>
  )
}

export default Sidebar
