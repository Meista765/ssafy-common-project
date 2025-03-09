import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import AddIcon from '@mui/icons-material/Add'
import FavoriteIcon from '@mui/icons-material/Favorite'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import placeholderImage from '/placeholder/cover-image-placeholder.png'

const NovelEditor = () => {
  const navigate = useNavigate()
  const [novels, setNovels] = useState([])
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

    fetchNovels()
  }, [])

  const handleNovelClick = (novelId) => {
    navigate(`/novel/edit/episodelist/${novelId}`)
  }

  // 이미지 에러 처리를 위한 함수 추가
  const handleImageError = (event) => {
    event.target.src = placeholderImage // 기본 플레이스홀더 이미지 경로
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
          집필 중인 소설 목록
        </Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => navigate('/novel/edit/background')}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'success.dark',
            },
          }}
        >
          새로운 소설 생성
        </Button>
      </Box>

      {/* Novel List Grid */}
      <Grid container spacing={3}>
        {novels.map((novel) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={novel.novel_pk}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea onClick={() => handleNovelClick(novel.novel_pk)} sx={{ height: '100%' }}>
                <CardMedia
                  component="img"
                  sx={{ aspectRatio: '3/4', objectFit: 'cover' }}
                  image={novel.coverImage || placeholderImage}
                  alt={novel.title}
                  onError={handleImageError}
                />
                <CardContent>
                  <Typography variant="h6" noWrap>
                    {novel.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                    {novel.author}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    {novel.description}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <VisibilityIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {novel.views.toLocaleString()}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <FavoriteIcon fontSize="small" color="error" />
                      <Typography variant="body2" color="text.secondary">
                        {novel.likes.toLocaleString()}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

export default NovelEditor
