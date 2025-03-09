import axios from 'axios'
import { debounce } from 'lodash'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import FavoriteIcon from '@mui/icons-material/Favorite'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid2'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import coverPlaceholder from '../assets/placeholder/cover-image-placeholder.png'
import placeholderImage from '/placeholder/cover-image-placeholder.png'

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

// axios 기본 설정 추가
axios.defaults.baseURL = BACKEND_URL
axios.defaults.withCredentials = true

const NovelList = () => {
  const navigate = useNavigate()
  const [novels, setNovels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [genre, setGenre] = useState('all')
  const [genres, setGenres] = useState([])
  const [searchInputValue, setSearchInputValue] = useState('')

  useEffect(() => {
    const fetchNovels = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/novels`)
        setNovels(response.data)

        // 모든 소설의 장르를 추출하고 중복 제거
        const allGenres = response.data.flatMap((novel) => novel.genre)
        const uniqueGenres = Array.from(new Map(allGenres.map((g) => [g.genre_pk, g])).values()).sort((a, b) =>
          a.genre.localeCompare(b.genre, 'ko')
        )

        setGenres(uniqueGenres)
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    }

    fetchNovels()
  }, [])

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value)
    }, 200),
    []
  )

  const handleSearchChange = useCallback(
    (event) => {
      const value = event.target.value
      setSearchInputValue(value)
      debouncedSearch(value)
    },
    [debouncedSearch]
  )

  const handleSortChange = useCallback((event) => {
    setSortBy(event.target.value)
  }, [])

  const handleGenreChange = useCallback((event) => {
    setGenre(event.target.value)
  }, [])

  const handleNovelClick = useCallback(
    (novelPk) => {
      // novelId -> novelPk 로 변경
      navigate(`/novel/${novelPk}`) // `/novel/viewer/${novelId}` 에서 변경, novelId -> novelPk 로 변경
    },
    [navigate]
  )

  const handleImageError = (event) => {
    event.target.src = placeholderImage
  }

  const filteredNovels = useMemo(() => {
    return novels
      .filter((novel) => {
        // 검색어 필터링
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase()
          const titleMatch = novel.title.toLowerCase().includes(searchLower)
          return titleMatch
        }
        return true
      })
      .filter((novel) => {
        // 장르 필터링
        if (genre === 'all') return true
        return novel.genre.some((g) => g.genre_pk === genre)
      })
      .sort((a, b) => {
        // 정렬
        switch (sortBy) {
          case 'latest':
            return new Date(b.created_date) - new Date(a.created_date)
          case 'popular':
            return b.likes - a.likes
          case 'views':
            return b.views - a.views
          case 'title':
            return a.title.localeCompare(b.title, 'ko')
          default:
            return 0
        }
      })
  }, [novels, searchQuery, genre, sortBy])

  if (loading) return <Typography sx={{ textAlign: 'center', mt: 4 }}>로딩 중...</Typography>
  if (error) return <Typography sx={{ textAlign: 'center', mt: 4, color: 'red' }}>{error}</Typography>

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 검색 및 필터 섹션 */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="소설 제목으로 검색"
          value={searchInputValue}
          onChange={handleSearchChange}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
              backgroundColor: '#ffffff',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>정렬</InputLabel>
          <Select value={sortBy} onChange={handleSortChange} label="정렬">
            <MenuItem value="title">이름순</MenuItem>
            <MenuItem value="latest">최신순</MenuItem>
            <MenuItem value="popular">인기순</MenuItem>
            <MenuItem value="views">조회순</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>장르</InputLabel>
          <Select value={genre} onChange={handleGenreChange} label="장르">
            <MenuItem value="all">전체</MenuItem>
            {genres.map((g) => (
              <MenuItem key={g.genre_pk} value={g.genre_pk}>
                {g.genre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* 소설 목록 그리드 */}
      <Grid container spacing={3}>
        {filteredNovels.map((novel) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={novel.novel_pk}>
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
                {' '}
                {/* novel.id -> novel.novel_pk 로 변경 */}
                <CardMedia
                  component="img"
                  sx={{ aspectRatio: '3/4', objectFit: 'cover' }}
                  image={novel.novel_img || placeholderImage}
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
                    {novel.summary}
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
    </Box>
  )
}

export default NovelList
