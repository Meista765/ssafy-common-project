// src/pages/Discussion.jsx
import axios from 'axios'
import dayjs from 'dayjs'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid2'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import Skeleton from '@mui/material/Skeleton'

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${
  import.meta.env.VITE_BACKEND_PORT
}`

const StyledCard = styled(Card)(({ theme, isactive }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  cursor: 'pointer',
  // backgroundColor: isactive === 'true' ? theme.palette.success.light : theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}))

const DiscussionList = () => {
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)

  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/discussion/`)
        setDiscussions(response.data)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch discussions:', error)
        setLoading(false)
      }
    }

    fetchDiscussions()
  }, [])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const filteredDiscussions = discussions.filter((discussion) =>
    tabValue === 0 ? discussion.is_active : !discussion.is_active
  )

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={200} height={45} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width={300} height={48} sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={item}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                  <Box sx={{ mt: 2 }}>
                    <Skeleton variant="rounded" width={120} height={24} sx={{ mr: 1, display: 'inline-block' }} />
                    <Skeleton variant="rounded" width={120} height={24} sx={{ display: 'inline-block' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        토론 목록
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="진행 중인 토론" />
        <Tab label="종료된 토론" />
      </Tabs>

      <Grid container spacing={3}>
        {filteredDiscussions.map((discussion) => (
          <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={discussion.discussion_pk}>
            <StyledCard isactive={discussion.is_active.toString()}>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom noWrap>
                  {discussion.topic}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  {discussion.novel.title}
                </Typography>
                {discussion.episode && (
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    에피소드: {discussion.episode.ep_title}
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`시작: ${dayjs(discussion.start_time).format('YYYY-MM-DD HH:mm')}`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  {discussion.end_time && (
                    <Chip
                      label={`종료: ${dayjs(discussion.end_time).format('YYYY-MM-DD HH:mm')}`}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  )}
                </Box>
                {/* <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    참여자: {discussion.participants.map((p) => p.nickname).join(', ')}
                  </Typography>
                </Box> */}
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

export default DiscussionList
