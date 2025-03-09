import axios from 'axios'
import dayjs from 'dayjs'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

// 아이콘
import AddIcon from '@mui/icons-material/Add'
import FavoriteIcon from '@mui/icons-material/Favorite'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import RefreshIcon from '@mui/icons-material/Refresh'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
// 디자인 컴포넌트
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import CardMedia from '@mui/material/CardMedia'

import placeholderImage from '/placeholder/cover-image-placeholder.png'
import { useNovel } from '../contexts/NovelContext'
import { useAuth } from '../hooks/useAuth'

// 전역 상수수
const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

axios.defaults.baseURL = BACKEND_URL
axios.defaults.withCredentials = true

const NovelEpisodeList = () => {
  // 상수
  const navigate = useNavigate()
  const { isLoggedIn, showLoginModal, user } = useAuth()
  const [localIsLiked, setLocalIsLiked] = useState(false);
  const { novelId } = useParams()
  const {
    novelData,
    // comments,
    discussions,
    fetchNovelData,
  } = useNovel()

  const initialDiscussionForm = {
    novel_pk: novelId,
    topic: '',
    category: false,
    ep_pk: null,
    start_time: null,
    max_participants: 6,
  }

  // 상태 변수
  const [openModal, setOpenModal] = useState(false)
  const [discussionForm, setDiscussionForm] = useState(initialDiscussionForm)
  const [formErrors, setFormErrors] = useState({
    dateTime: false,
    topic: false,
    maxParticipants: false,
  })

  const isLiked = useMemo(() => {
    if (!isLoggedIn || !user || !novelData?.novel_info?.[0]) {
      return false
    }
    const isLiked = novelData.novel_info[0].liked_users?.some(
      likedUser => likedUser.user_pk === user.user_pk
    )
    return isLiked
  }, [isLoggedIn, user, novelData])

  const handleLike = async () => {
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }
  
    try {
      await axios.put(`${BACKEND_URL}/api/v1/novel/${novelId}/like`);
      // 로컬 상태 즉시 토글
      setLocalIsLiked(prev => !prev);
      // 데이터 갱신
      await fetchNovelData(novelId);
    } catch (error) {
      console.error('좋아요 처리 중 오류가 발생했습니다:', error);
    }
  };

  // 총 조회수/좋아요 계산을 useMemo로 최적화
  const { totalViews, totalLikes } = useMemo(
    () => ({
      totalViews: novelData.episode.reduce((sum, ep) => sum + (ep.views ?? 0), 0),
      totalLikes: novelData.episode.reduce((sum, ep) => sum + (ep.likes ?? 0), 0),
    }),
    [novelData.episode]
  )

  // 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchNovelData(novelId)
      } catch (error) {
        console.error('Error:', error)
      }
    }
    fetchData()
  }, [novelId])

  // 토론방 생성 핸들러
  const handleCreateDiscussion = useCallback(async () => {
    const errors = {
      dateTime: !discussionForm.start_time,
      topic: !discussionForm.topic.trim(),
      maxParticipants: !discussionForm.max_participants,
      episode: discussionForm.category && !discussionForm.ep_pk,
    }

    setFormErrors(errors)

    if (Object.values(errors).some((error) => error)) {
      return
    }

    const requestData = {
      novel_pk: parseInt(novelId),
      topic: discussionForm.topic,
      category: discussionForm.category,
      ep_pk: discussionForm.category ? discussionForm.ep_pk : null,
      start_time: dayjs(discussionForm.start_time).format(),
      max_participants: parseInt(discussionForm.max_participants),
    }

    try {
      await axios.post(`${BACKEND_URL}/api/v1/discussion/`, requestData, {
        withCredentials: true,
      })

      console.log('토론방 생성 성공')

      // NovelContext의 fetchNovelData 사용
      await fetchNovelData(novelId)
      console.log('데이터 새로고침 완료')

      setOpenModal(false)
      setDiscussionForm(initialDiscussionForm)
      setFormErrors({
        dateTime: false,
        topic: false,
        maxParticipants: false,
        episode: false,
      })
    } catch (error) {
      console.error('토론방 생성 실패:', error)
    }
  }, [discussionForm, novelId, fetchNovelData])

  const handleCloseModal = () => {
    setOpenModal(false)
    setDiscussionForm(initialDiscussionForm)
    setFormErrors({
      dateTime: false,
      topic: false,
      maxParticipants: false,
      episode: false,
    })
  }

  // 댓글 좋아요/싫어요 핸들러
  /*const handleLike = useCallback((commentId) => {
    // TODO: 좋아요 기능 구현
    console.log('Like comment:', commentId)
  }, [])

  const handleDislike = useCallback((commentId) => {
    // TODO: 싫어요 기능 구현
    console.log('Dislike comment:', commentId)
  }, [])

  const [commentInput, setCommentInput] = useState('')

  // 댓글 작성 핸들러
  const handleSubmitComment = useCallback(() => {
    if (!commentInput.trim()) return

    setComments((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        author: '사용자',
        date: new Date().toLocaleString(),
        content: commentInput,
        likes: 0,
        dislikes: 0,
        isBest: false,
      },
    ])
    setCommentInput('')
  }, [commentInput])

  // 댓글 삭제 핸들러
  const handleDeleteComment = useCallback((commentId) => {
    // TODO: 댓글 삭제 기능 구현
    console.log('Delete comment:', commentId)
  }, [])*/

  // novelData가 준비되지 않았을 때의 로딩 상태 확인
  const isLoading = !novelData?.novel_info?.[0]

  const handleImageError = (event) => {
    event.target.src = placeholderImage
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Paper
        sx={{
          p: { xs: '12px', sm: '16px', md: '24px' },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: '16px', md: '24px' },
          elevation: 0,
          mb: '24px',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          bgcolor: '#ffffff',
          width: '100%',
        }}
      >
        {/* 표지 섹션 */}
        {isLoading ? (
          <Skeleton
            variant="rectangular"
            sx={{
              width: { xs: '100%', sm: 200 },
              height: { xs: 267, sm: 267 },
              borderRadius: 2,
            }}
          />
        ) : (
          <CardMedia
            component="img"
            sx={{
              width: { xs: '100%', sm: 200 },
              height: { xs: 'auto', sm: 267 },
              aspectRatio: '3/4',
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              flex: { xs: 'none', md: 2 },
            }}
            image={novelData.novel_info[0]?.novel_img || placeholderImage}
            alt="소설 표지"
            onError={handleImageError}
          />
        )}

        {/* 소설 정보 섹션 */}
        <Stack direction="column" sx={{ flex: { xs: 1, md: 4 }, justifyContent: 'space-between' }}>
          {isLoading ? (
            <>
              <Skeleton variant="text" sx={{ fontSize: '2rem', width: '70%' }} />
              <Stack spacing={1}>
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: '30%' }} />
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: '100%' }} />
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: '100%' }} />
                <Stack direction="row" spacing={2}>
                  <Skeleton variant="text" sx={{ fontSize: '1rem', width: 80 }} />
                  <Skeleton variant="text" sx={{ fontSize: '1rem', width: 80 }} />
                </Stack>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="h1" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 950 }}>
                {novelData.novel_info[0]?.title || '제목 없음'}
              </Typography>
              <Stack direction="column" spacing={1}>
                <Typography variant="body1" color="text.secondary">
                  {novelData.author}
                </Typography>
                <Typography variant="body1">
                  {novelData.novel_info[0]?.summary || '요약 없음'}
                  </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VisibilityIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {totalViews.toLocaleString()}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton 
                        onClick={handleLike}
                        size="small"
                        sx={{ padding: 0.5 }}
                      >
                        {localIsLiked ? (
                          <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" sx={{ color: 'error.main' }} />
                        )}
                      </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {novelData?.novel_info?.[0]?.likes?.toLocaleString() || 0}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </>
          )}
        </Stack>

        {/* 토론방 섹션 */}
        <Stack spacing={2} sx={{ flex: { xs: 1, md: 4 }, height: { xs: 'auto', md: '100%' } }}>
          {isLoading ? (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: 100 }} />
                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
              </Stack>
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            </>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={700}>
                  토론방
                </Typography>
                <Tooltip title={isLoggedIn ? '' : '로그인 후 이용할 수 있습니다'} arrow placement="top">
                  <span style={{ display: 'inline-block' }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => (isLoggedIn ? setOpenModal(true) : showLoginModal())}
                      sx={{
                        bgcolor: '#FFA000',
                        opacity: isLoggedIn ? 1 : 0.6,
                        '&:hover': isLoggedIn ? { bgcolor: '#FF8F00' } : { bgcolor: '#FFA000' },
                      }}
                    >
                      토론 생성
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              {/* 토론 목록 */}
              <Stack
                spacing={1}
                sx={{
                  height: '180px',
                  overflowY: 'auto',
                  scrollSnapType: 'y mandatory',
                  pr: '4px',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    },
                  },
                }}
              >
                {console.log('현재 discussions:', discussions)}
                {discussions && discussions.length > 0 ? (
                  discussions
                    .filter(discussion => discussion.is_active === true)
                    .map((discussion) => {
                      console.log('필터링된 discussion:', discussion)
                      // 회차별 토론인 경우 해당 회차 정보와 인덱스 찾기
                      const episodeIndex =
                        discussion.category && discussion.ep_pk
                          ? novelData.episode.findIndex((ep) => ep.ep_pk === discussion.ep_pk)
                          : -1

                    return (
                      <Paper
                        onClick={() =>
                          isLoggedIn ? navigate(`/discussion/${discussion.discussion_pk}`) : showLoginModal()
                        }
                        key={discussion.discussion_pk}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          scrollSnapAlign: 'start',
                          border: '1px solid #E0E0E0',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 8px hsla(0, 0%, 0%, 0.1)',
                            bgcolor: 'hsla(0, 0%, 0%, 0.02)',
                            borderColor: '#1976D2',
                          },
                          opacity: isLoggedIn ? 1 : 0.7,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography
                            sx={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              mb: 1,
                              maxWidth: '73%',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {discussion.topic}
                          </Typography>
                          <Box
                            sx={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: discussion.category ? '#E3F2FD' : '#E8F5E9',
                              color: discussion.category ? '#1976D2' : '#2E7D32',
                              mb: 1,
                            }}
                          >
                            {discussion.category
                              ? `${episodeIndex !== -1 ? `${episodeIndex + 1}화 ` : ''}토론`
                              : '전체 토론'}
                          </Box>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {/* 최대 참여 인원 표시 */}
                          최대 {discussion.max_participants}명 참여 가능
                          <br />
                          {dayjs(discussion.start_time).format('YYYY.MM.DD HH:mm')}
                        </Typography>
                      </Paper>
                    )
                  })
              ) : (
                <Typography variant="body2" color="text.secondary" align="center">
                  토론방이 없습니다.
                </Typography>
              )}
              </Stack>
            </>
          )}
        </Stack>

        {/* 토론방 생성 모달 */}
        <Dialog
          open={openModal}
          onClose={handleCloseModal}
          maxWidth="sm"
          fullWidth
          sx={{
            height: 'fit-content',
            maxHeight: '90vh', // 화면 높이의 90%를 넘지 않도록 제한
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>토론방 생성</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>토론 유형</InputLabel>
                <Select
                  value={discussionForm.category}
                  label="토론 유형"
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  onChange={(e) => {
                    setDiscussionForm({
                      ...discussionForm,
                      category: e.target.value,
                      ep_pk: null, // 회차 선택 초기화
                    })
                    setFormErrors((prev) => ({
                      ...prev,
                      episode: false,
                    }))
                  }}
                >
                  <MenuItem value={false}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MenuBookIcon />
                      <Box>
                        <Typography>전체 작품 토론</Typography>
                        <Typography variant="caption" color="text.secondary">
                          작품 전체에 대해 토론
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                  <MenuItem value={true}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MenuBookIcon />
                      <Box>
                        <Typography>회차별 토론</Typography>
                        <Typography variant="caption" color="text.secondary">
                          특정 회차에 대해 토론
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              {discussionForm.category && (
                <FormControl fullWidth error={formErrors.episode}>
                  <InputLabel>토론할 회차</InputLabel>
                  <Select
                    value={discussionForm.ep_pk}
                    label="토론할 회차"
                    required
                    onChange={(e) => {
                      setDiscussionForm({
                        ...discussionForm,
                        ep_pk: parseInt(e.target.value),
                      })
                      setFormErrors((prev) => ({
                        ...prev,
                        episode: false,
                      }))
                    }}
                  >
                    {novelData.episode.map((episode, index) => (
                      <MenuItem key={episode.ep_pk} value={episode.ep_pk}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{index + 1}화</Typography>
                          <Typography color="text.secondary">{episode.ep_title}</Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.episode && <FormHelperText error>토론할 회차를 선택해주세요</FormHelperText>}
                </FormControl>
              )}

              <FormControl fullWidth error={formErrors.dateTime}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={discussionForm.start_time}
                    onChange={(newValue) => {
                      setDiscussionForm({ ...discussionForm, start_time: newValue })
                      setFormErrors((prev) => ({
                        ...prev,
                        dateTime: false,
                      }))
                    }}
                    minDateTime={dayjs()}
                    format="YYYY/MM/DD HH:mm"
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        label: '토론 일시',
                        variant: 'outlined',
                        error: formErrors.dateTime,
                        helperText: formErrors.dateTime ? '토론 일시를 선택해주세요' : '',
                      },
                    }}
                  />
                </LocalizationProvider>
              </FormControl>

              <TextField
                fullWidth
                variant="outlined"
                label="토론 주제"
                placeholder="토론 주제를 입력하세요."
                value={discussionForm.topic}
                error={formErrors.topic}
                helperText={formErrors.topic ? '토론 주제를 입력해주세요' : ''}
                onChange={(e) => {
                  setDiscussionForm({ ...discussionForm, topic: e.target.value })
                  setFormErrors((prev) => ({
                    ...prev,
                    topic: false,
                  }))
                }}
              />

              <FormControl fullWidth error={formErrors.maxParticipants}>
                <TextField
                  value={discussionForm.max_participants}
                  label="최대 참여 인원"
                  type="number"
                  error={formErrors.maxParticipants}
                  helperText={formErrors.maxParticipants ? '최대 참여 인원을 입력해주세요' : ''}
                  onChange={(e) => {
                    setDiscussionForm({
                      ...discussionForm,
                      max_participants: parseInt(e.target.value),
                    })
                    setFormErrors((prev) => ({
                      ...prev,
                      maxParticipants: false,
                    }))
                  }}
                />
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseModal} variant="outlined">
              취소
            </Button>
            <Button
              onClick={handleCreateDiscussion}
              variant="contained"
              sx={{
                backgroundColor: '#FFA000',
                '&:hover': {
                  backgroundColor: '#FF8F00',
                },
              }}
            >
              생성하기
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>

      {/* 에피소드 목록 */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          mb: 3,
          border: '1px solid #e0e0e0',
          '& .MuiTableCell-head': {
            backgroundColor: (theme) => theme.palette.grey[100],
            fontWeight: 700,
          },
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>화수</TableCell>
              <TableCell>제목</TableCell>
              <TableCell align="right">조회수</TableCell>
              <TableCell align="right">좋아요</TableCell>
              <TableCell align="right">게시일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))
              : novelData.episode.map((episode, index) => (
                  <TableRow
                    key={episode.ep_pk}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'grey.50',
                        cursor: 'pointer',
                      },
                    }}
                    onClick={() =>
                      navigate(`/novel/${novelId}/${episode.ep_pk}`, {
                        state: { episodeData: episode },
                      })
                    }
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{episode.ep_title}</TableCell>
                    <TableCell align="right">{(episode?.views || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{(episode?.likes || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{dayjs(episode.created_date).format('YYYY-MM-DD')}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 댓글 섹션 */}
      {/* <Paper sx={{ mt: 3, p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              작품리뷰
            </Typography>
            <Typography
              variant="body2"
              sx={{
                backgroundColor: 'grey.100',
                px: 1,
                py: 0.5,
                borderRadius: 0.5,
                color: 'text.secondary',
              }}
            >
              26
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton size="small">
              <RefreshIcon />
            </IconButton>
            <IconButton size="small">
              <InfoOutlinedIcon />
            </IconButton>
          </Stack>
        </Box> */}

      {/* 댓글 입력 영역 */}
      {/*<Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
          }}
        >
          <TextField
            fullWidth
            multiline
            rows={4}
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="댓글을 남기려면 로그인이 필요합니다."
            disabled
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
              <IconButton>
                <InsertEmoticonIcon />
              </IconButton>
              <IconButton>
                <ImageIcon />
              </IconButton>
            </Stack>
            <Button
              variant="contained"
              disabled
              onClick={handleSubmitComment}
              startIcon={<SendIcon />}
              sx={{
                bgcolor: '#FFA000',
                '&:hover': { bgcolor: '#FF8F00' },
              }}
            >
              등록하기
            </Button>
          </Box>
        </Paper>*/}

      {/* 댓글 목록 */}
      {/* <Stack spacing={2}>
          {comments.map((comment) => (
            <Paper
              key={comment.comment_pk}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={700}>{comment.author}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {comment.date}
                  </Typography>
                </Stack>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              {comment.isBest && (
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: '#E3F2FD',
                    color: '#1976D2',
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    BEST
                  </Typography>
                </Box>
              )}
              <Typography>{comment.content}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  startIcon={<ThumbUpIcon />}
                  size="small"
                  onClick={() => handleLike(comment.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  {comment.likes}
                </Button>
                <Button
                  startIcon={<ThumbDownIcon />}
                  size="small"
                  onClick={() => handleDislike(comment.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  {comment.dislikes}
                </Button>
              </Stack>
              <IconButton
                size="small"
                onClick={() => handleDeleteComment(comment.id)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <MoreVertIcon />
              </IconButton>
            </Paper>
          ))}
        </Stack> */}
      {/* </Paper> */}
    </Box>
  )
}

export default NovelEpisodeList
