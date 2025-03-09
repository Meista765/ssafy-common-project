import axios from 'axios'

import { useEffect, useRef, useState } from 'react'

import { useParams, useNavigate } from 'react-router-dom'

import OfflineBoltIcon from '@mui/icons-material/OfflineBolt'
import DeleteIcon from '@mui/icons-material/Delete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Input from '@mui/material/Input'
import Paper from '@mui/material/Paper'
import TextareaAutosize from '@mui/material/TextareaAutosize'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { PrimaryButton } from '../components/common/buttons'
import { useAuth } from '../hooks/useAuth'

function NovelEditorEpisode() {
  const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`
  const { novelId, episodeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isFocused, setIsFocused] = useState(false)
  const [novelTitle, setNovelTitle] = useState('')
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [episodeContent, setEpisodeContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [openDeleteSuccessModal, setOpenDeleteSuccessModal] = useState(false)
  const [novelInfo, setNovelInfo] = useState({
    title: '',
    genre: '',
    worldview: '',
    synopsis: '',
    characters: [],
  })
  const contentRef = useRef('')

  useEffect(() => {
    const fetchEpisodeData = async () => {
      try {
        // 먼저 소설의 기본 정보를 가져옵니다
        const novelResponse = await axios.get(`${BACKEND_URL}/api/v1/novel/${novelId}`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (novelResponse.data.novel && novelResponse.data.novel[0]) {
          const novel = novelResponse.data.novel[0]
          setNovelInfo({
            title: novel.title || '',
            genre: novel.genre || '',
            worldview: novel.worldview || '',
            synopsis: novel.synopsis || '',
            characters: novelResponse.data.character || [],
          })
          setNovelTitle(novel.title || '')
        }

        // 에피소드 정보 가져오기
        if (episodeId) {
          const episodeResponse = await axios.get(`${BACKEND_URL}/api/v1/novel/${novelId}/episodes/${episodeId}`, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (episodeResponse.data) {
            setEpisodeTitle(episodeResponse.data.ep_title || '')
            setEpisodeContent(episodeResponse.data.ep_content || '')
            contentRef.current = episodeResponse.data.ep_content || ''
          }
        } else {
          setEpisodeTitle('')
          setEpisodeContent('')
          contentRef.current = ''
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        if (error.response?.status === 404) {
          alert('소설을 찾을 수 없습니다.')
        } else if (error.response?.status === 422) {
          alert('잘못된 요청입니다.')
        } else if (error.response?.status === 500) {
          alert('서버 오류가 발생했습니다.')
        } else if (error.code === 'ERR_NETWORK') {
          alert('네트워크 연결을 확인해주세요.')
        } else {
          alert('데이터 조회 중 오류가 발생했습니다.')
        }
      }
    }

    fetchEpisodeData()
  }, [novelId, episodeId])

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(true)

  const handleContentChange = (event) => {
    contentRef.current = event.target.value
    setEpisodeContent(event.target.value)
  }

  const handleTitleChange = (event) => {
    setEpisodeTitle(event.target.value)
  }

  const handleEpisodeGenerate = async () => {
    try {
      setIsLoading(true)

      if (!novelInfo) {
        throw new Error('소설 정보를 찾을 수 없습니다.')
      }

      // characters를 배열 형태로 구성
      const characters = novelInfo.characters.map((char) => ({
        이름: char.name || '',
        성별: char.sex || '',
        나이: char.age || '',
        역할: char.role || '',
        직업: char.job || '',
        프로필: char.profile || '',
      }))

      const requestData = {
        novel_pk: parseInt(novelId),
        title: novelInfo.title || '',
        genre: novelInfo.genre || '',
        worldview: novelInfo.worldview || '',
        synopsis: novelInfo.synopsis || '',
        characters: characters, // List[Dict] 형식 유지
      }

      console.log('AI Episode Generation Request:', requestData)

      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/episode`, requestData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.data && response.data.new_chapter) {
        setEpisodeContent(response.data.new_chapter)
        contentRef.current = response.data.new_chapter
      }
    } catch (error) {
      console.error('Error generating episode:', error)
      console.error('Error response:', error.response?.data)

      if (error.response?.status === 404) {
        alert('소설을 찾을 수 없습니다.')
      } else if (error.response?.status === 403) {
        alert('권한이 없습니다.')
      } else if (error.response?.status === 422) {
        alert('요청 데이터가 올바르지 않습니다: ' + (error.response?.data?.detail || '알 수 없는 오류'))
      } else {
        alert('에피소드 생성 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!episodeTitle.trim() || !episodeContent.trim()) {
        alert('제목과 내용을 모두 입력해주세요.')
        return
      }

      const episodeData = {
        ep_title: episodeTitle,
        ep_content: episodeContent,
      }

      if (episodeId) {
        // 에피소드 수정
        await axios.post(`${BACKEND_URL}/api/v1/novel/${novelId}/${episodeId}`, episodeData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        alert('에피소드가 수정되었습니다.')
      } else {
        // 새 에피소드 생성
        await axios.post(`${BACKEND_URL}/api/v1/novel/${novelId}/episode`, episodeData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        alert('새 에피소드가 생성되었습니다.')
      }
    } catch (error) {
      console.error('Failed to save/update episode:', error)
      if (error.response?.status === 404) {
        alert('에피소드를 찾을 수 없습니다.')
      } else if (error.response?.status === 400) {
        alert('잘못된 요청입니다. 입력값을 확인해주세요.')
      } else {
        alert('에피소드 저장/수정에 실패했습니다.')
      }
    }
  }

  const handleDeleteModalOpen = () => {
    setOpenDeleteModal(true)
  }

  const handleDeleteModalClose = () => {
    setOpenDeleteModal(false)
  }

  const handleDeleteSuccessModalClose = () => {
    setOpenDeleteSuccessModal(false)
    navigate(`/novel/edit/episodelist/${novelId}`)
  }

  const handleDeleteEpisode = async () => {
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/novel/${novelId}/${episodeId}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      handleDeleteModalClose()
      setOpenDeleteSuccessModal(true)
    } catch (error) {
      console.error('Failed to delete episode:', error)
      if (error.response?.status === 404) {
        alert('에피소드를 찾을 수 없습니다.')
      } else if (error.response?.status === 403) {
        alert('에피소드를 삭제할 권한이 없습니다.')
      } else {
        alert('에피소드 삭제에 실패했습니다.')
      }
    }
  }


  return (
    <Box
      sx={{
        width: '100%',
        margin: '2rem 6rem',
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <Paper elevation={0} sx={{ p: 3, position: 'relative' }}>
        <Typography variant="h4" component="h1" fontWeight="bold" marginBottom="2rem">
          에피소드 에디터
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            {novelTitle}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              {episodeId ? `${episodeId}화` : '새 에피소드'}
            </Typography>
            <PrimaryButton startIcon={<OfflineBoltIcon />} onClick={handleEpisodeGenerate} sx={{ py: 0.5 }}>
              AI 생성
            </PrimaryButton>
          </Box>
        </Box>

        <Input
          fullWidth
          placeholder="에피소드 제목을 입력해주세요"
          value={episodeTitle}
          onChange={handleTitleChange}
          sx={{
            mb: 2,
            p: 1,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            '&:hover': {
              border: '1px solid #000',
            },
            '&.Mui-focused': {
              border: '2px solid #1976d2',
            },
          }}
        />

        {isLoading ? (
          <Box
            sx={{
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          >
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>AI가 에피소드를 생성하고 있습니다...</Typography>
          </Box>
        ) : (
          <TextareaAutosize
            minRows={20}
            placeholder="컨텐츠를 입력하거나 AI 장면생성을 눌러주세요."
            value={episodeContent}
            onChange={handleContentChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fff',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              resize: 'vertical',
            }}
          />
        )}

<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%', mt: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteModalOpen}
            sx={{ backgroundColor: '#ff1744' }}
          >
            삭제하기
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: '#FFA000',
              color: 'white',
              '&:hover': {
                backgroundColor: '#FF8F00',
              },
            }}
          >
            저장하기
          </Button>
        </Box>
      </Paper>
    {/* 삭제 확인 모달 */}
    <Dialog
        open={openDeleteModal}
        onClose={handleDeleteModalClose}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">에피소드 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            에피소드를 삭제하면 관련 정보가 모두 삭제됩니다. 정말 삭제하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteModalClose}>취소하기</Button>
          <Button onClick={handleDeleteEpisode} color="error" autoFocus>
            삭제하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 완료 모달 */}
      <Dialog
        open={openDeleteSuccessModal}
        onClose={handleDeleteSuccessModalClose}
        aria-labelledby="delete-success-dialog-title"
        aria-describedby="delete-success-dialog-description"
      >
        <DialogTitle id="delete-success-dialog-title">삭제 완료</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-success-dialog-description">
            에피소드가 삭제되었습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteSuccessModalClose} autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default NovelEditorEpisode
