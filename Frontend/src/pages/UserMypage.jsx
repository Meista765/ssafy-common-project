import axios from 'axios'

import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import FavoriteIcon from '@mui/icons-material/Favorite'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid2'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

const UserMypage = () => {
  const navigate = useNavigate()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState(0)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(BACKEND_URL + '/api/v1/users/detail', {
        withCredentials: true,
      })
      console.log('Fetched profile data:', response.data)
      setProfileData(response.data)
    } catch (error) {
      console.error('프로필 조회 실패:', error)
      if (error.response?.status === 401) {
        navigate('/auth/login')
      }
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue)
  }

  const handleNovelClick = (novelId) => {
    navigate(`/novel/${novelId}`)
  }

  const NovelGrid = ({ novels = [] }) => {
    if (!novels || novels.length === 0) {
      return <Typography sx={{ p: 2 }}>표시할 작품이 없습니다.</Typography>
    }

    return (
      <Grid container spacing={2}>
        {novels.map((novel) => (
          <Grid item size={{ xs: 12, sm: 4, md: 2 }} key={novel.novel_pk}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '4px',
                transition: 'transform 0.2s ease-in-out',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <CardActionArea onClick={() => handleNovelClick(novel.novel_pk)}>
                <CardMedia
                  component="img"
                  sx={{ aspectRatio: '3/4', objectFit: 'cover' }}
                  image={novel.novel_img || '/api/placeholder/400/400'}
                  alt={novel.title}
                />
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="subtitle1" noWrap sx={{ mb: 1, fontWeight: 'bold' }}>
                    {novel.title}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      총 {novel.num_episode || 0}화 작성
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FavoriteIcon fontSize="small" color="error" />
                      <Typography variant="body2" color="text.secondary">
                        {novel.likes?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    최근 작성일:{' '}
                    {novel.created_date ? new Date(novel.created_date).toLocaleDateString('ko-KR') : '날짜 정보 없음'}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  const CommentsSection = ({ comments = [], cocomments = [] }) => {
    const allComments = [...(comments || []), ...(cocomments || [])]

    if (allComments.length === 0) {
      return <Typography sx={{ p: 2 }}>표시할 댓글이 없습니다.</Typography>
    }

    return (
      <Grid container spacing={3}>
        {comments.map((comment) => (
          <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={comment.comment_pk}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Stack>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {comment.novel_title || '소설 제목'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {comment.ep_title || `${comment.ep_pk}화`}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {new Date(comment.created_date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mt: 2,
                  mb: 'auto',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {comment.content}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <FavoriteIcon fontSize="small" color="error" />
                  <Typography variant="body2">{comment.likes}</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>에러 발생: {error}</Box>
  }

  if (!profileData) {
    return <Box sx={{ p: 3, textAlign: 'center' }}>프로필을 찾을 수 없습니다.</Box>
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ mb: 4, p: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Avatar
              src={profileData.user_img || '/api/placeholder/400/400'}
              alt={profileData.nickname}
              sx={{ width: 120, height: 120, mx: { xs: 'auto', md: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {profileData.nickname}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profileData.name}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label={`최근 작품 (${profileData.recent_novels?.length || 0})`} />
          <Tab label={`선호 작품 (${profileData.liked_novels?.length || 0})`} />
          <Tab label={`작성한 작품 (${profileData.novels_written?.length || 0})`} />
          <Tab label={`작성한 댓글 (${(profileData.comments?.length || 0) + (profileData.cocomments?.length || 0)})`} />
        </Tabs>
      </Box>

      <Box sx={{ mt: 3 }}>
        {selectedTab === 0 && <NovelGrid novels={profileData.recent_novels} />}
        {selectedTab === 1 && <NovelGrid novels={profileData.liked_novels} />}
        {selectedTab === 2 && <NovelGrid novels={profileData.novels_written} />}
        {selectedTab === 3 && <CommentsSection comments={profileData.comments} cocomments={profileData.cocomments} />}
      </Box>
    </Container>
  )
}

export default UserMypage
