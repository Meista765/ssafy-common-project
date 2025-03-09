import axios from 'axios'
import 'github-markdown-css'
import ReactMarkdown from 'react-markdown'

import { useEffect, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function DiscussionSummary() {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const navigate = useNavigate()
  const { noteId } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSummary()
  }, [noteId])

  const fetchSummary = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/discussion/note/${noteId}`)
      setSummary(response.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch summary:', error)
      setError('요약본을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  if (error) {
    return <Typography sx={{ textAlign: 'center', mt: 4, color: 'red' }}>{error}</Typography>
  }

  if (isLoading) {
    return <Typography sx={{ textAlign: 'center', mt: 4 }}>로딩 중...</Typography>
  }

  if (!summary) {
    return null
  }

  return (
    <Stack sx={{ minHeight: '100vh', bgcolor: '#FAFAFA', width: '100%' }}>
      {/* 헤더 */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          p: 2,
          borderBottom: '1px solid #EEEEEE',
          bgcolor: '#FFFFFF',
          width: '100%',
        }}
      >
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Stack>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 1000 }}>
            {summary.novel.title}에 관한 토론
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            주제 : {summary.topic}
          </Typography>
        </Stack>
      </Stack>

      {/* 컨텐츠 */}
      <Stack spacing={3} sx={{ p: 3, flex: 1, overflow: 'auto', width: '100%' }}>
        {/* 토론 정보 */}
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            토론 시작 시간:{' '}
            {new Date(summary.start_time).toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Stack>

        {/* 요약 */}
        <Stack
          spacing={2}
          sx={{
            p: 3,
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
            width: '100%',
          }}
        >
          <>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutoStoriesIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 1000 }}>
                토론 요약
              </Typography>
            </Stack>
            <div style={{ marginBottom: 2 }}></div> {/* 간격을 위한 div 추가 */}
            <div className="markdown-body" style={{ backgroundColor: 'transparent' }}>
              <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
            </div>
          </>
        </Stack>
      </Stack>
    </Stack>
  )
}
