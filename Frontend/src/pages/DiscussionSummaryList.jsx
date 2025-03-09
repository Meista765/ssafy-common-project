import axios from 'axios'

import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  Box,
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

export default function DiscussionSummaryList() {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const navigate = useNavigate()
  const [discussions, setDiscussions] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDiscussions()
  }, [])

  const fetchDiscussions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/discussion/user/notes`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      setDiscussions(response.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch discussions:', error)
      setError('토론 목록을 불러오는데 실패했습니다.')
    }
  }

  const handleRowClick = (noteId) => {
    navigate(`/novel/edit/idea/${noteId}`)
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 100px)">
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={3} sx={{ p: 3, width: '100%', minHeight: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" component="h1" fontWeight="bold">
        독자의 토론에서 아이디어 얻기
      </Typography>

      {discussions.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography>아직 소설에 대한 토론이 없습니다. AI의 도움을 받아 집필해보세요.</Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            mb: 3,
            border: '1px solid #e0e0e0',
            '& .MuiTableCell-head': {
              backgroundColor: '#FF8F00',
              fontWeight: 700,
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>소설</TableCell>
                <TableCell>토론 제목</TableCell>
                <TableCell>토론 카테고리</TableCell>
                <TableCell align="right">토론 일시</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {discussions.map((discussion) => (
                <TableRow
                  key={discussion.noteId}
                  onClick={() => handleRowClick(discussion.noteId)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'grey.50',
                      cursor: 'pointer',
                    },
                  }}
                >
                  <TableCell>{discussion.novel.title}</TableCell>
                  <TableCell>{discussion.topic}</TableCell>
                  <TableCell>{discussion.category === 'WHOLE_NOVEL' ? '전체 소설' : '특정 회차'}</TableCell>
                  <TableCell align="right">
                    {new Date(discussion.start_time).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
