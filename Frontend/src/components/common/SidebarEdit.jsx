import { useAuth } from '@/hooks/useAuth'

import { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import Diversity3Icon from '@mui/icons-material/Diversity3'
import Edit from '@mui/icons-material/Edit'
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Home from '@mui/icons-material/Home'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import KeyboardDoubleArrowLeft from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRight from '@mui/icons-material/KeyboardDoubleArrowRight'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import PersonIcon from '@mui/icons-material/Person'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Collapse from '@mui/material/Collapse'
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

const SidebarEdit = () => {
  const [open, setOpen] = useState(true)
  const { user, isLoggedIn, showLoginModal, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null)
  const [novels, setNovels] = useState([])
  const [discussions, setDiscussions] = useState([])
  const [novelMenuOpen, setNovelMenuOpen] = useState(false)
  const [discussionMenuOpen, setDiscussionMenuOpen] = useState(false)
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/users/novels-written`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setNovels(data)
        }
      } catch (error) {
        console.error('Failed to fetch novels:', error)
      }
    }

    const fetchDiscussions = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/discussion/user/notes`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setDiscussions(data)
        }
      } catch (error) {
        console.error('Failed to fetch discussions:', error)
      }
    }

    if (isLoggedIn) {
      fetchNovels()
      fetchDiscussions()
    }
  }, [isLoggedIn])

  const handleDrawerToggle = () => {
    // TODO: Add animation effect when toggling drawer
    setOpen(!open)
  }

  const handleNavigate = (path) => {
    // 보호된 경로 체크
    const protectedRoutes = ['/novel/edit', '/discussion']
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

  // 각 메뉴의 첫 5개 항목만 표시
  const displayedNovels = novels.slice(0, 5)
  const displayedDiscussions = discussions.slice(0, 5)

  const handleNovelMenuToggle = () => {
    setNovelMenuOpen(!novelMenuOpen)
    if (!novelMenuOpen) {
      setDiscussionMenuOpen(false)
    }
  }

  const handleDiscussionMenuToggle = () => {
    setDiscussionMenuOpen(!discussionMenuOpen)
    if (!discussionMenuOpen) {
      setNovelMenuOpen(false)
    }
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
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
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
        {/* 홈 메뉴 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigate('/')}
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
              <Home fontSize="large" />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="홈"
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

        {/* 작성중인 작품 리스트 메뉴 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleNovelMenuToggle}
            sx={{
              minHeight: 24,
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
              <Edit fontSize="large" />
            </ListItemIcon>
            {open && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <ListItemText
                    primary="작성중인 작품"
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
                  <Badge
                    badgeContent={novels.length > 99 ? '99+' : novels.length}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#FFB347',
                        color: '#FFFFFF',
                      },
                    }}
                  />
                </Stack>
                {novelMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </Stack>
            )}
          </ListItemButton>
        </ListItem>
        <Collapse in={novelMenuOpen && open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {displayedNovels.map((novel) => (
              <ListItemButton
                key={novel.novel_pk}
                onClick={() => handleNavigate(`/novel/edit/episodelist/${novel.novel_pk}`)}
                sx={{
                  pl: 4,
                  minHeight: 36,
                  py: 0,
                }}
              >
                <ListItemText
                  primary={novel.title}
                  sx={{
                    m: 0,
                    '& .MuiTypography-root': {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </ListItemButton>
            ))}
            {novels.length > 5 && (
              <ListItemButton
                onClick={() => handleNavigate('/novel/edit')}
                sx={{
                  pl: 4,
                  minHeight: 36,
                  py: 0,
                  color: '#666666',
                  '&:hover': {
                    backgroundColor: '#FFE5CC',
                    color: '#1E1E1E',
                  },
                }}
              >
                <ListItemText primary="더보기..." sx={{ m: 0 }} />
              </ListItemButton>
            )}
          </List>
        </Collapse>

        {/* 토론 아이디어 메뉴 */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleDiscussionMenuToggle}
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
              <EmojiObjectsIcon fontSize="large" />
            </ListItemIcon>
            {open && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  width: '100%', // 전체 너비 사용
                  justifyContent: 'space-between', // 양끝 정렬
                }}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <ListItemText
                    primary="집필 아이디어"
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
                  <Badge
                    badgeContent={discussions.length > 99 ? '99+' : discussions.length}
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#FFB347',
                        color: '#FFFFFF',
                      },
                    }}
                  />
                </Stack>
                {discussionMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </Stack>
            )}
          </ListItemButton>
        </ListItem>
        <Collapse in={discussionMenuOpen && open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {displayedDiscussions.map((discussion) => (
              <ListItemButton
                key={discussion.noteId}
                onClick={() => handleNavigate(`/novel/edit/idea/${discussion.noteId}`)}
                sx={{
                  pl: 4,
                  minHeight: 36,
                  py: 0,
                }}
              >
                <ListItemText
                  primary={discussion.topic}
                  sx={{
                    m: 0,
                    '& .MuiTypography-root': {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </ListItemButton>
            ))}
            {discussions.length > 5 && (
              <ListItemButton
                onClick={() => handleNavigate('/novel/edit/idea/notes')}
                sx={{
                  pl: 4,
                  minHeight: 36,
                  py: 0,
                  color: '#666666',
                  '&:hover': {
                    backgroundColor: '#FFE5CC',
                    color: '#1E1E1E',
                  },
                }}
              >
                <ListItemText primary="더보기..." sx={{ m: 0 }} />
              </ListItemButton>
            )}
          </List>
        </Collapse>
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

export default SidebarEdit
