import styled from '@emotion/styled'
import axios from 'axios'
import dayjs from 'dayjs'

import { useEffect, useMemo, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import FavoriteIcon from '@mui/icons-material/Favorite'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import coverPlaceholder from '../assets/placeholder/cover-image-placeholder.png'
import placeholderImage from '/placeholder/cover-image-placeholder.png'
import { useAuth } from '../hooks/useAuth'

const NovelInfo = styled(Paper)({
  padding: '24px',
  display: 'flex',
  gap: '24px',
  marginBottom: '24px',
  borderRadius: '16px',
  backgroundColor: '#ffffff',
  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
})

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  '&.MuiTableCell-head': {
    backgroundColor: theme.palette.grey[100],
    fontWeight: 700,
  },
}))

const NovelEditorNovelDetail = () => {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { novelId } = useParams()
  const [novelData, setNovelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [openDeleteCompleteModal, setOpenDeleteCompleteModal] = useState(false)

  // 삭제 관련 핸들러 함수들 추가
  const handleDeleteClick = () => {
    setOpenDeleteModal(true)
  }

  const handleDeleteCancel = () => {
    setOpenDeleteModal(false)
  }

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/novel/${novelId}`, {
        withCredentials: true,
      })
      setOpenDeleteModal(false)
      setOpenDeleteCompleteModal(true)
    } catch (error) {
      console.error('Failed to delete novel:', error)
      alert('소설 삭제에 실패했습니다.')
    }
  }

  const handleDeleteCompleteClose = () => {
    setOpenDeleteCompleteModal(false)
    navigate('/novel/edit')
  }

  // Check login status
  useEffect(() => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다')
      navigate('/auth/login')
      return
    }
  }, [isLoggedIn, navigate])

  // 소설 정보와 에피소드 추출
  const novelInfo = useMemo(() => {
    return novelData?.novel_info?.[0] || {}
  }, [novelData])

  const episodes = useMemo(() => {
    if (!novelData?.episode) return []

    // created_date를 기준으로 오름차순 정렬
    return [...novelData.episode].sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
  }, [novelData])

  // 총 조회수/좋아요 계산
  const { totalViews, totalLikes } = useMemo(() => {
    const views = episodes ? episodes.reduce((sum, ep) => sum + (ep.views || 0), 0) : 0
    const likes = novelInfo?.likes || 0
    return { totalViews: views, totalLikes: likes }
  }, [episodes, novelInfo])

  // 소설 상세 정보 조회
  useEffect(() => {
    const fetchNovelDetails = async () => {
      if (!isLoggedIn || !novelId) return

      setLoading(true)
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/novel/${novelId}/detail`, {
          withCredentials: true,
        })
        setNovelData(response.data)
        console.log(response.data)
      } catch (error) {
        console.error('Failed to fetch novel details:', error)
        if (error.response?.status === 401) {
          alert('로그인이 필요합니다')
          navigate('/auth/login')
        } else {
          setError('소설 정보를 불러오는데 실패했습니다.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchNovelDetails()
  }, [isLoggedIn, novelId, navigate])

  const handleEpisodeClick = (ep_pk) => {
    navigate(`/novel/edit/episode/${novelId}/${ep_pk}`)
  }

  const handleImageError = (event) => {
    event.target.src = placeholderImage
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>로딩 중...</Typography>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, m: '2rem 6rem' }}>
      {/* Header with Create Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1" fontWeight="bold">
          에피소드 편집
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              const novelInfo = novelData.novel_info[0]
              navigate(`/novel/edit/background/${novelId}`, {
                state: {
                  novelInfo: {
                    ...novelInfo,
                    genres: novelInfo.genres.map((g) => g.genre),
                  },
                },
              })
            }}
            sx={{
              backgroundColor: '#FFA000',
              color: 'white',
              '&:hover': {
                backgroundColor: '#FF8F00',
              },
            }}
          >
            기본 정보 변경
          </Button>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{
              backgroundColor: '#d32f2f',
              color: 'white',
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
            }}
          >
            소설 삭제하기
          </Button>
        </Stack>
      </Box>

      {/* Novel Info */}
      <NovelInfo>
        {/* Cover Section */}
        <Box
          component="img"
          src={novelData?.novel_info?.[0]?.novel_img || placeholderImage}
          alt="소설 표지"
          sx={{
            width: 200,
            height: 267,
            objectFit: 'cover',
            borderRadius: 1,
            border: '1px solid #e0e0e0',
            flex: 2,
          }}
          onError={handleImageError}
        />

        {/* Novel Info Section */}
        <Stack direction="column" sx={{ flex: 4, justifyContent: 'space-between' }}>
          <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 950 }}>
            {novelInfo.title || '제목 없음'}
          </Typography>
          <Stack direction="column" spacing={1}>
            <Typography variant="body1">{novelInfo.summary || '요약 없음'}</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <VisibilityIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  {totalViews.toLocaleString()}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <FavoriteIcon color="error" />
                <Typography variant="body2" color="text.secondary">
                  {totalLikes.toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </NovelInfo>

      {/* 새 에피소드 작성 버튼 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/novel/edit/episode/${novelId}`)}
          sx={{
            backgroundColor: '#FFA000',
            color: 'white',
            '&:hover': {
              backgroundColor: '#FF8F00',
            },
          }}
        >
          새로운 에피소드 작성
        </Button>
      </Box>

      {/* Episode List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledTableCell>화수</StyledTableCell>
              <StyledTableCell>제목</StyledTableCell>
              <StyledTableCell align="right">조회수</StyledTableCell>
              <StyledTableCell align="right">게시일</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {episodes.map((episode, index) => (
              <TableRow
                key={episode.ep_pk}
                sx={{
                  '&:hover': {
                    backgroundColor: 'grey.50',
                    cursor: 'pointer',
                  },
                }}
                onClick={() => handleEpisodeClick(episode.ep_pk)}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{episode.ep_title}</TableCell>
                <TableCell align="right">{episode.views?.toLocaleString() || '0'}</TableCell>
                <TableCell align="right">{dayjs(episode.created_date).format('YYYY.MM.DD')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDeleteModal}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">소설 삭제 확인</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            소설을 삭제하면 관련 정보가 모두 삭제됩니다. 정말 삭제하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>취소하기</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            삭제하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 완료 모달 */}
      <Dialog
        open={openDeleteCompleteModal}
        onClose={handleDeleteCompleteClose}
        aria-labelledby="delete-complete-dialog-title"
      >
        <DialogTitle id="delete-complete-dialog-title">삭제 완료</DialogTitle>
        <DialogContent>
          <DialogContentText>소설이 삭제되었습니다.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCompleteClose} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default NovelEditorNovelDetail
