import styled from '@emotion/styled'
import axios from 'axios'
import { nanoid } from 'nanoid'
import PropTypes from 'prop-types'

import { useEffect, useRef, useState } from 'react'

import { useLocation, useNavigate, useParams } from 'react-router-dom'

// Import useEffect
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import DropZone from '../components/common/DropZone'
import PrimaryButton from '../components/common/buttons/PrimaryButton'

// 결과 이미지 슬롯 스타일링
const ResultSlot = styled(Paper)(({ theme }) => ({
  aspectRatio: '3/4',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[100],
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.grey[200],
  },
}))

// 스타일 프리셋 데이터
const stylePresets = [
  { id: 1, name: '수채화', description: '부드럽고 감성적인 수채화 스타일', value: 'watercolor' },
  { id: 2, name: '자수', description: '바늘과 실로 수를 놓은 듯한 질감과 디테일', value: 'embroidery' },
  { id: 3, name: '픽셀 아트', description: '도트 이미지', value: 'pixel_art' },
  { id: 4, name: '선화 만화', description: '펜 선으로만 표현된 만화 스타일', value: 'linear_manga' },
  { id: 5, name: '스튜디오 지브리', description: '지브리의 분위기', value: 'studio_ghibli' },
  { id: 6, name: '3D 스타일', description: '현실감과 생동감 있는 이미지', value: '3d_style' },
  { id: 7, name: '티셔츠 디자인', description: '티셔츠에 프린트하기 적합한 단순한 디자인', value: 'tshirt_design' },
  { id: 8, name: '동화책', description: '동화책 삽화처럼 따뜻하고 환상적인 분위기', value: 'storybook' },
  { id: 9, name: '귀여운 만화', description: '단순하고 귀여운 캐릭터', value: 'cute_cartoon' },
  { id: 10, name: '스케치', description: '연필이나 펜으로 그린 듯한 거친 질감', value: 'sketch' },
  { id: 11, name: '로고', description: '특징을 간결하고 명확하게 표현', value: 'logo' },
  { id: 12, name: '사실주의', description: '실제 사물이나 풍경을 최대한 비슷하게 묘사.', value: 'realism' },
  { id: 13, name: '사진', description: '실제 사진처럼 표현.', value: 'photo' },
]

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

// loading 상태일 때 보여줄 스켈레톤 컴포넌트
const LoadingSkeleton = () => (
  <Stack direction="column" spacing={2} sx={{ width: '100%', p: 3 }}>
    {/* 제목 스켈레톤 */}
    <Skeleton variant="text" width="60%" height={60} />
    <Divider sx={{ mb: 4 }} />

    {/* 장르 태그 스켈레톤 */}
    <Skeleton variant="text" width="20%" height={40} />
    <Stack direction="row" spacing={1}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="rounded" width={80} height={36} />
      ))}
    </Stack>

    {/* 제목 입력 스켈레톤 */}
    <Skeleton variant="text" width="20%" height={40} />
    <Skeleton variant="rounded" width="100%" height={56} />

    {/* 세계관 입력 스켈레톤 */}
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Skeleton variant="text" width="20%" height={40} />
      <Skeleton variant="rounded" width={100} height={36} />
    </Stack>
    <Skeleton variant="rounded" width="100%" height={120} />

    {/* 기본 줄거리 입력 스켈레톤 */}
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Skeleton variant="text" width="20%" height={40} />
      <Skeleton variant="rounded" width={100} height={36} />
    </Stack>
    <Skeleton variant="rounded" width="100%" height={120} />

    {/* 한줄 요약 입력 스켈레톤 */}
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Skeleton variant="text" width="20%" height={40} />
      <Skeleton variant="rounded" width={100} height={36} />
    </Stack>
    <Skeleton variant="rounded" width="100%" height={80} />

    {/* 저장/삭제 버튼 스켈레톤 */}
    <Stack direction="row" spacing={1}>
      <Skeleton variant="rounded" width={100} height={36} />
      <Skeleton variant="rounded" width={100} height={36} />
    </Stack>

    <Divider sx={{ my: 4 }} />

    {/* 캐릭터 섹션 스켈레톤 */}
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Skeleton variant="text" width="30%" height={40} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={120} height={36} />
      </Stack>
    </Stack>
    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" width={280} height={400} />
      ))}
    </Stack>
  </Stack>
)

// AI 생성 버튼 컴포넌트
const AIGenerateButton = ({ onClick, loading, sx = {} }) => {
  const defaultSx = {
    fontWeight: 500,
    fontSize: '1rem',
    borderRadius: 2,
    px: 2,
    py: 0.5,
    whiteSpace: 'nowrap',
    ...(loading
      ? {
          backgroundColor: 'grey.200',
          color: 'grey.600',
          border: '1px solid',
          borderColor: 'grey.600',
        }
      : {
          backgroundColor: '#FFA000',
          color: 'white',
          '&:hover': {
            backgroundColor: '#FF8F00',
          },
        }),
    ...sx,
  }

  return (
    <Button startIcon={<AutoAwesomeIcon />} onClick={onClick} loading={loading} sx={defaultSx}>
      AI 생성
    </Button>
  )
}

// PropTypes 정의
AIGenerateButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  sx: PropTypes.object,
}

// SaveButton 컴포넌트 추가
const SaveButton = ({ onClick, loading, isEdit = false, sx = {} }) => {
  const defaultSx = {
    fontWeight: 500,
    fontSize: '1rem',
    borderRadius: 2,
    px: 2,
    py: 0.5,
    whiteSpace: 'nowrap',
    ...(loading
      ? {
          backgroundColor: 'grey.200',
          color: 'grey.600',
          border: '1px solid',
          borderColor: 'grey.600',
        }
      : {
          backgroundColor: '#111111',
          color: 'white',
          '&:hover': {
            backgroundColor: '#404040',
          },
        }),
    ...sx,
  }

  return (
    <Button startIcon={<SaveIcon />} onClick={onClick} loading={loading} sx={defaultSx}>
      수정
    </Button>
  )
}

SaveButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  isEdit: PropTypes.bool,
  sx: PropTypes.object,
}

// CharacterInput 컴포넌트
const CharacterInput = ({ type, character, onChange, onDelete, novelId, showMessage, fetchCharacterData }) => {
  const [isSaving, setIsSaving] = useState(false)

  // 캐릭터 저장 (Create)
  const handleSaveCharacter = async () => {
    setIsSaving(true)
    try {
      const characterData = {
        name: character.name,
        role: character.role,
        age: character.age,
        sex: character.sex,
        job: character.job,
        profile: character.profile,
      }

      let response
      if (character.character_pk) {
        // 기존 캐릭터 수정 (Update)
        response = await axios.put(
          `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/novel/character/${character.character_pk}`,
          characterData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      } else {
        // 새 캐릭터 생성 (Create)
        response = await axios.post(
          `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/novel/character/${novelId}`,
          characterData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }

      if (response.status === 200) {
        showMessage(
          character.character_pk ? '캐릭터가 성공적으로 수정되었습니다.' : '캐릭터가 성공적으로 저장되었습니다.'
        )
        if (onChange) {
          onChange({
            ...character,
            character_pk: response.data.character_pk || character.character_pk,
          })
        }
      }
    } catch (error) {
      console.error('Error saving/updating character:', error)
      showMessage(
        character.character_pk ? '캐릭터 수정 중 오류가 발생했습니다.' : '캐릭터 저장 중 오류가 발생했습니다.',
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // 캐릭터 삭제 핸들러 수정
  const handleDeleteCharacter = async () => {
    try {
      if (character.character_pk) {
        // 서버에 삭제 요청 전에 먼저 UI 업데이트
        onDelete(character.character_pk)

        const response = await axios.delete(
          `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/novel/character/${character.character_pk}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.status === 200) {
          showMessage('캐릭터가 성공적으로 삭제되었습니다.')
        }
      } else {
        // 저장되지 않은 캐릭터 삭제
        onDelete(character.id)
        showMessage('캐릭터가 삭제되었습니다.')
      }
    } catch (error) {
      console.error('Error deleting character:', error)
      showMessage('캐릭터 삭제 중 오류가 발생했습니다.', 'error')

      // 삭제 실패 시 캐릭터 목록 다시 불러오기
      if (novelId) {
        fetchCharacterData(novelId)
      }
    }
  }

  // 캐릭터 정보 변경 핸들러
  const handleChange = (field) => (event) => {
    const updatedCharacter = { ...character, [field]: event.target.value }
    if (onChange) {
      onChange(updatedCharacter)
    }
  }

  return (
    <Card
      sx={{
        Width: 350,
        border: `1px solid hsla(0, 0%, 77%)`,
        backgroundColor: '#white',
        borderRadius: 2,
        p: 3,
        flex: '0 0 auto',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="캐릭터 유형(조력자, 적대자 등)"
          value={character.role}
          onChange={handleChange('role')}
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
          slotProps={{
            inputLabel: {
              shrink: true,
              sx: { fontWeight: 'bold' },
            },
          }}
        />
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="이름"
            value={character.name}
            onChange={handleChange('name')}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: { fontWeight: 'bold' },
              },
            }}
          />
          <TextField
            label="성별"
            value={character.sex}
            onChange={handleChange('sex')}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: { fontWeight: 'bold' },
              },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="나이"
            value={character.age}
            onChange={handleChange('age')}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: { fontWeight: 'bold' },
              },
            }}
          />
          <TextField
            label="직업"
            value={character.job}
            onChange={handleChange('job')}
            fullWidth
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: { fontWeight: 'bold' },
              },
            }}
          />
        </Box>
        <TextField
          label="프로필"
          value={character.profile}
          onChange={handleChange('profile')}
          multiline
          rows={4}
          fullWidth
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
          slotProps={{
            inputLabel: {
              shrink: true,
              sx: { fontWeight: 'bold' },
            },
          }}
        />
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        <Button
          startIcon={<SaveIcon />}
          onClick={handleSaveCharacter}
          loading={isSaving}
          sx={{
            fontWeight: 500,
            fontSize: '1rem',
            borderRadius: 2,
            px: 2,
            py: 0.5,
            whiteSpace: 'nowrap',
            ...(isSaving
              ? {
                  backgroundColor: 'grey.200',
                  color: 'grey.600',
                  border: '1px solid',
                  borderColor: 'grey.600',
                }
              : {
                  backgroundColor: '#111111',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#404040',
                  },
                }),
          }}
        >
          {character.character_pk ? '수정' : '저장'}
        </Button>
        <Button
          startIcon={<DeleteIcon />}
          onClick={handleDeleteCharacter}
          loading={isSaving}
          sx={{
            fontWeight: 500,
            fontSize: '1rem',
            borderRadius: 2,
            px: 2,
            py: 0.5,
            whiteSpace: 'nowrap',
            backgroundColor: '#D32F2F',
            color: 'white',
            '&:hover': {
              backgroundColor: '#A82525',
            },
          }}
        >
          삭제
        </Button>
      </Stack>
    </Card>
  )
}

CharacterInput.propTypes = {
  type: PropTypes.string.isRequired,
  character: PropTypes.shape({
    id: PropTypes.number.isRequired,
    character_pk: PropTypes.number,
    name: PropTypes.string.isRequired,
    sex: PropTypes.string.isRequired,
    age: PropTypes.string.isRequired,
    job: PropTypes.string.isRequired,
    profile: PropTypes.string.isRequired,
    role: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  novelId: PropTypes.string,
  showMessage: PropTypes.func.isRequired,
  fetchCharacterData: PropTypes.func.isRequired,
}

const NovelBackgroundEditor = () => {
  const [selectedGenre, setSelectedGenre] = useState([])
  const [title, setTitle] = useState('')
  const [worldView, setWorldView] = useState('')
  const [background, setBackground] = useState('')
  const [characters, setCharacters] = useState([
    { id: nanoid(), character_pk: null, role: '', name: '', sex: '', age: '', job: '', profile: '' },
  ])
  const [generationType, setGenerationType] = useState('default')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState([])
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [results, setResults] = useState([])
  const [isGenerating, setIsGenerating] = useState({
    worldview: false,
    synopsis: false,
    character: false,
    summary: false,
    cover: false,
  })
  const [uploadLoading, setUploadLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Save State
  const [loading, setLoading] = useState(true) // Add loading state
  const [summary, setSummary] = useState('') // New state for summary
  const { novelId } = useParams()
  const [novelPk, setNovelPk] = useState(null)
  const CreatedNovelPk = useRef([])
  useEffect(() => {
    CreatedNovelPk.current = novelPk
    console.log('CreatedNovelPk.current', CreatedNovelPk.current)
  }, [novelPk])
  // const [currentImageName, setCurrentImageName] = useState(null);
  const currentImageName = useRef(null);
  useEffect(() => {
    if (results.length > 0 && results[0].image_name) {
      currentImageName.current = results[0].image_name;
      console.log('useEffect - currentImageName updated:', currentImageName.current);
    }
  }, [results]);
  
  const location = useLocation() // useLocation 훅 사용

  const genres = ['판타지', '무협', '액션', '로맨스', '스릴러', '드라마', 'SF', '기타']
  const navigate = useNavigate()
  const [novelData, setNovelData] = useState(null) // 소설 데이터 상태 추가

  useEffect(() => {
    console.log('currentImageName', currentImageName.current)
    if (currentImageName.current) {
      handleSaveGeneratedImage()
    }
  }, [currentImageName])

  axios.defaults.withCredentials = true
  // novelId가 변경될 때마다 실행되는 useEffect
  useEffect(() => {
    if (location.state && location.state.novelInfo) {
      const data = location.state.novelInfo
      setNovelData(data)
      setTitle(data.title || '')
      setWorldView(data.worldview || '')
      setBackground(data.synopsis || '')
      setSelectedGenre(data.genres || [])
      setSummary(data.summary || '')

      // novel_pk로 캐릭터 데이터 가져오기
      if (data.novel_pk) {
        fetchCharacterData(data.novel_pk)
      }

      setLoading(false)
    } else if (novelId) {
      const fetchNovelData = async () => {
        setLoading(true)
        try {
          const response = await axios.get(`${BACKEND_URL}/api/v1/novel/${novelId}`)
          const data = response.data
          setNovelData(data)
          setTitle(data.title || '')
          setWorldView(data.worldview || '')
          setBackground(data.synopsis || '')
          setSelectedGenre(data.genres || [])
          setSummary(data.summary || '')

          // novel_pk로 캐릭터 데이터 가져오기
          if (data.novel_pk) {
            await fetchCharacterData(data.novel_pk)
          }
        } catch (error) {
          console.error('Error fetching novel data:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchNovelData()
    } else {
      setLoading(false)
      setTitle('')
      setWorldView('')
      setBackground('')
      setSelectedGenre([])
      setSummary('')
    }
  }, [novelId, location.state])

  // 캐릭터 데이터를 가져오는 함수
  const fetchCharacterData = async (novel_pk) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/novel/character/${novel_pk}`)
      if (response.data && Array.isArray(response.data)) {
        // 서버에서 받은 데이터로 캐릭터 배열 업데이트
        const updatedCharacters = response.data.map((serverChar) => ({
          id: nanoid(),
          character_pk: serverChar.character_pk || null,
          name: serverChar.name || '',
          role: serverChar.role || '',
          age: serverChar.age || '',
          sex: serverChar.sex || '',
          job: serverChar.job || '',
          profile: serverChar.profile || '',
        }))
        setCharacters(updatedCharacters)
      } else {
        // 데이터가 없는 경우 빈 캐릭터로 초기화
        setCharacters([
          {
            id: nanoid(),
            character_pk: null,
            name: '',
            role: '',
            age: '',
            sex: '',
            job: '',
            profile: '',
          },
        ])
      }
    } catch (error) {
      console.error('Error fetching character data:', error)
      // 에러 발생 시 빈 캐릭터로 초기화
      setCharacters([
        {
          id: nanoid(),
          character_pk: null,
          name: '',
          role: '',
          age: '',
          sex: '',
          job: '',
          profile: '',
        },
      ])
    }
  }

  const handleGenreClick = (genre) => {
    if (selectedGenre.includes(genre)) {
      // 이미 선택된 장르인 경우, 제거
      setSelectedGenre(selectedGenre.filter((g) => g !== genre))
    } else {
      // 선택되지 않은 장르인 경우, 추가
      setSelectedGenre([...selectedGenre, genre])
    }
  }

  const handleWorldviewGenerate = async () => {
    setIsGenerating((prev) => ({ ...prev, worldview: true }))
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/ai/worldview`,
        {
          genre: selectedGenre.join(', '),
          title: title,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      setWorldView(response.data.worldview)
    } catch (error) {
      console.error('Error generating worldview:', error)
    } finally {
      setIsGenerating((prev) => ({ ...prev, worldview: false }))
    }
  }

  // 캐릭터 삭제 핸들러 수정
  const handleCharacterDelete = (characterId) => {
    // 즉시 UI 업데이트를 위해 filter 사용
    setCharacters((prevCharacters) =>
      prevCharacters.filter((char) => (char.character_pk ? char.character_pk !== characterId : char.id !== characterId))
    )
  }

  // CharacterInput 컴포넌트에서 사용할 onChange 핸들러 수정
  const handleCharacterChange = (characterId) => (newCharacterData) => {
    setCharacters((prevCharacters) =>
      prevCharacters.map((char) =>
        char.character_pk === characterId || char.id === characterId ? { ...char, ...newCharacterData } : char
      )
    )
  }

  const onAddCharacter = () => {
    setCharacters((prev) => [
      ...prev,
      {
        id: nanoid(),
        name: '',
        role: '',
        age: '',
        sex: '',
        job: '',
        profile: '',
      },
    ])
  }

  const handleKeywordInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (keywordInput.trim()) {
        setKeywords((prev) => [...prev, keywordInput.trim()])
        setKeywordInput('')
      }
    }
  }

  const handleDeleteKeyword = (keywordToDelete) => {
    setKeywords(keywords.filter((k) => k !== keywordToDelete))
  }

  const handleSynopsisGenerate = async () => {
    setIsGenerating((prev) => ({ ...prev, synopsis: true }))
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/ai/synopsis`,
        {
          genre: selectedGenre.join(', '),
          title: title,
          worldview: worldView,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
      setBackground(response.data.synopsis)
    } catch (error) {
      console.error('Error generating synopsis:', error)
    } finally {
      setIsGenerating((prev) => ({ ...prev, synopsis: false }))
    }
  }

  // 알림 메시지를 위한 state 추가
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'error', 'warning', 'info', 'success'
  })

  // 알림 메시지 표시 함수
  const showMessage = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    })
  }

  // 알림 메시지 닫기 함수
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  // Save Function
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const dataToSend = {
        title: title,
        worldview: worldView,
        synopsis: background,
        genres: selectedGenre,
        summary: summary,
      }

      let response
      if (novelId) {
        // novelId가 있을 경우 수정 (PUT)
        response = await axios.put(`${BACKEND_URL}/api/v1/novel/${novelId}`, dataToSend, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } else {
        console.log('저장 데이터:', dataToSend)
        // novelId가 없을 경우 저장 (POST)
        response = await axios.post(`${BACKEND_URL}/api/v1/novel`, dataToSend, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }
      // 성공 처리 (예: 사용자에게 알림)
      if (response.status === 200) {
        setNovelPk(response.data.novel_pk)
        CreatedNovelPk.current = response.data.novel_pk
        console.log('Novel Pk value:', response.data.novel_pk)
        showMessage(novelId ? '소설이 수정되었습니다.' : '소설이 저장되었습니다.')
      }
    } catch (error) {
      console.error('Error saving/updating novel:', error)
      if (error.response) {
        console.error('Error details:', error.response.data)
        showMessage('소설 저장/수정 중 오류가 발생했습니다.', 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAICharacterGenerate = async () => {
    setIsGenerating((prev) => ({ ...prev, character: true }))
    let endpoint = `${BACKEND_URL}/api/v1/ai/`

    try {
      // 빈 캐릭터 데이터 필터링
      const filteredCharacters = characters.filter(
        (char) => char.name || char.sex || char.age || char.job || char.profile || char.role
      )

      const hasCharacterData = filteredCharacters.length > 0

      const requestData = {
        genre: selectedGenre.join(' '),
        title: title,
        worldview: worldView,
        synopsis: background,
        characters: hasCharacterData ? filteredCharacters : [],
      }

      endpoint += hasCharacterData ? 'characters-new' : 'characters'

      // // API 호출 전 데이터 검증
      // if (filteredCharacters.length === 0) {
      //   showMessage('유효한 캐릭터 정보가 없습니다. 모든 필드를 입력해주세요.', 'warning')
      //   return
      // }

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.data) {
        let newCharactersJSON = null
        if (hasCharacterData) {
          newCharactersJSON = response.data.new_characters
        } else {
          newCharactersJSON = response.data.characters
        }

        let newCharacters = [] // 기본값으로 빈 배열 설정

        try {
          if (newCharactersJSON) {
            // JSON 파싱 시도
            const parsedData = JSON.parse(newCharactersJSON)

            // 파싱된 데이터가 배열인지 확인
            if (Array.isArray(parsedData)) {
              newCharacters = parsedData
            } else {
              console.warn('Parsed character data is not an array, using empty array instead')
            }
          } else {
            console.warn('Character data is null or undefined, using empty array instead')
          }
        } catch (error) {
          console.error('Failed to parse character data:', error)
          console.error('Raw data:', newCharactersJSON)
          console.warn('Using empty array instead')
        }

        const formattedCharacters = newCharacters
          .map((char) => {
            // 필수 필드가 모두 있는지 확인
            if (
              !char.name?.trim() ||
              !char.role?.trim() ||
              !char.age?.trim() ||
              !char.sex?.trim() ||
              !char.job?.trim() ||
              !char.profile?.trim()
            ) {
              return null // 누락된 필드가 있으면 제외
            }

            const formattedChar = {
              id: nanoid(),
              name: char.name.trim(),
              role: char.role.trim(),
              age: char.age.trim(),
              sex: char.sex.trim(),
              job: char.job.trim(),
              profile: char.profile.trim(),
            }
            return formattedChar
          })
          .filter((char) => char !== null) // null 제거

        // 기존의 의미 있는 캐릭터 데이터와 새로운 캐릭터 데이터를 합침
        setCharacters([...filteredCharacters, ...formattedCharacters])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      if (error.response?.status === 422) {
        showMessage('캐릭터 정보가 올바르지 않습니다. 모든 필드를 입력했는지 확인해주세요.', 'error')
      } else {
        showMessage('캐릭터 생성 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error')
      }
      console.error('Error in character generation:', error)
    } finally {
      setIsGenerating((prev) => ({ ...prev, character: false }))
    }
  }

  const handleAISummaryGenerate = async () => {
    setIsGenerating((prev) => ({ ...prev, summary: true }))
    try {
      const requestData = {
        genre: selectedGenre.join(', '),
        title: title,
        worldview: worldView,
        synopsis: background,
      }
      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/summary`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      setSummary(response.data.summary)
    } catch (error) {
      console.error('Error generating summary:', error)
      // Handle error (e.g., display an error message)
    } finally {
      setIsGenerating((prev) => ({ ...prev, summary: false }))
    }
  }

  const handleFileUpload = async (file) => {
    if (!file || !CreatedNovelPk.current) {
      alert('소설을 먼저 저장해주세요.')
      return
    }

    setUploadLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await axios.post(`${BACKEND_URL}/api/v1/upload-image/${CreatedNovelPk.current}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.status === 200) {
        console.log(response)
        console.log('File uploaded successfully:', response.data)
        alert('표지 이미지가 성공적으로 업로드되었습니다.')
      }
    } catch (error) {
      console.error('File upload error:', error)
      alert('표지 이미지 업로드에 실패했습니다.')
      if (error.response) {
        console.log('Server responded with:', error.response.status, error.response.data)
      }
    } finally {
      setUploadLoading(false)
    }
  }
  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      if (currentImageName) {
        try {
          await axios.delete(`${BACKEND_URL}/api/v1/static_delete`, {
            data: { img_name: currentImageName },
          })
        } catch (error) {
          console.error('Error deleting previous image:', error)
        }
      }

      const selectedStyleObject = stylePresets.find((style) => style.id === selectedStyle)
      const styleValue = selectedStyleObject ? selectedStyleObject.value : 'watercolor'

      const requestData = {
        genre: selectedGenre.join(', '),
        style: styleValue,
        title: title,
        worldview: worldView,
        keywords: keywords,
      }
      const response = await axios.post(`${BACKEND_URL}/api/v1/image/generate/${CreatedNovelPk.current}/newfunction`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 200) {
        // 응답 데이터에 따라 결과 처리
        setResults([response.data]); // 또는 적절한 데이터 처리
        console.log('이미지 생성 완료', response.data)
        // 여기서 엑시오스 불러주자. 
        // setCurrentImageName(response.data.image_name);
        currentImageName.current = response.data.image_name
        console.log('저장된 이미지 이름:', currentImageName)
      }
    } catch (error) {
      console.error('Image generation error:', error)
      alert('이미지 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }
  const handleSaveGeneratedImage = async () => {
    if (!CreatedNovelPk.current || !currentImageName) {
      console.log('currentImageName.current', currentImageName)
      alert('소설을 먼저 저장하거나 이미지를 생성해주세요.')
      return
    }

    try {
      const response = await axios.put(`${BACKEND_URL}/api/v1/save_gen_img/${CreatedNovelPk}`, {
        img_name: currentImageName,
      })

      if (response.status === 200) {
        alert('AI 생성 이미지가 표지로 저장되었습니다.')
        // 저장 후 이미지 이름 초기화
        currentImageName.current = null
      }
    } catch (error) {
      console.error('Error saving generated image:', error)
      alert('이미지 저장 중 오류가 발생했습니다.')
    }
  }

  // 버튼 스타일 공통 속성 정의
  const buttonSx = {
    fontWeight: 500,
    fontSize: '1rem',
    borderRadius: 2,
    px: 2,
    py: 0.5,
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: '#FF8F00',
    },
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, overflowX: 'hidden', overflowY: 'auto', height: '100vh' }}>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Stack direction="column" spacing={2} sx={{ width: '100%', p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 950 }}>
              작품의 배경에 대한 정보를 입력해주세요.
            </Typography>
          </Stack>
          <Divider sx={{ mb: 4 }} />
          {/* 장르 선택 버튼들 */}
          <Typography variant="h3" sx={{ mb: 1, fontSize: '1.5rem', fontWeight: 700 }}>
            장르 태그
          </Typography>
          <Box
            sx={{
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#FFA000',
                borderRadius: '4px',
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                minWidth: 'min-content',
                flexWrap: 'nowrap',
              }}
            >
              {genres.map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenre.includes(genre) ? 'contained' : 'outlined'}
                  onClick={() => handleGenreClick(genre)}
                  sx={{
                    color: selectedGenre.includes(genre) ? 'white' : 'grey.700',
                    fontWeight: 600,
                    backgroundColor: selectedGenre.includes(genre) ? '#FFA000' : 'transparent',
                    whiteSpace: 'nowrap',
                    borderRadius: '20px',
                    minWidth: 'auto',
                    width: 'fit-content',
                    py: 1,
                    px: 2,
                    flex: '0 0 auto',
                    '&:hover': {
                      backgroundColor: selectedGenre.includes(genre) ? '#FFA000' : 'rgba(255, 160, 0, 0.1)',
                    },
                    borderColor: selectedGenre.includes(genre) ? '#FFA000' : 'grey.300',
                  }}
                >
                  {genre}
                </Button>
              ))}
            </Stack>
          </Box>
          {/* 제목 입력 */}
          <Stack direction="column" spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                제목
              </Typography>
              {/* 삭제: 제목 옆 AI 생성 버튼 */}
            </Stack>
            <TextField
              fullWidth
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
              placeholder="제목을 입력해주세요. AI 생성 후 수정도 가능합니다."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: 'white',
                },
              }}
            />
          </Stack>
          {/* 희망하는 세계관 입력 */}
          <Stack direction="column" spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                세계관
              </Typography>
              <AIGenerateButton onClick={handleWorldviewGenerate} loading={isGenerating.worldview} />
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={12}
              value={worldView}
              onChange={(e) => setWorldView(e.target.value)}
              placeholder="세계관을 입력해주세요. AI 생성 후 수정도 가능합니다."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: 'white',
                },
              }}
            />
          </Stack>
          {/* 기본 동기/배경 입력 */}
          <Stack direction="column" spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                기본 줄거리
              </Typography>
              <AIGenerateButton onClick={handleSynopsisGenerate} loading={isGenerating.synopsis} />
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={12}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="기본 줄거리를 입력해주세요. AI 생성 후 수정도 가능합니다."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: 'white',
                },
              }}
            />
            {/* Summary Input Field */}
            <Stack direction="column" spacing={1} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  한줄 요약
                </Typography>
                <AIGenerateButton onClick={handleAISummaryGenerate} loading={isGenerating.summary} />
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="작품의 한줄 요약을 입력해주세요. AI 생성 후 수정도 가능합니다."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: 'white',
                  },
                }}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <SaveButton onClick={handleSave} loading={isSaving} isEdit={!!novelId} />
              <Button
                startIcon={<DeleteIcon />}
                sx={{
                  ...buttonSx,
                  backgroundColor: '#D32F2F',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#A82525',
                  },
                }}
              >
                삭제
              </Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 4 }} /> {/* 구분선 */}
          {/* 캐릭터 입력 섹션 */}
          <Stack direction="column" spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h3" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                등장인물 정보를 입력해주세요
              </Typography>
              <Stack direction="row" spacing={1}>
                <AIGenerateButton onClick={handleAICharacterGenerate} loading={isGenerating.character} />
                <Button
                  startIcon={<AddIcon />}
                  onClick={onAddCharacter}
                  sx={{
                    ...buttonSx,
                    backgroundColor: '#1c1c1c',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#333333',
                    },
                  }}
                >
                  캐릭터 추가
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                overflowX: 'auto',
                pb: 2,
                '&::-webkit-scrollbar': {
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#FFA000',
                  borderRadius: '4px',
                },
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  minWidth: 'min-content',
                  px: 1,
                }}
              >
                {characters.map((character) => (
                  <CharacterInput
                    key={character.id || character.character_pk}
                    type={character.role}
                    character={character}
                    onChange={handleCharacterChange(character.id || character.character_pk)}
                    onDelete={handleCharacterDelete}
                    novelId={CreatedNovelPk.current}
                    showMessage={showMessage}
                    fetchCharacterData={fetchCharacterData}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
          <Divider sx={{ my: 4 }} />
          {/* 표지 생성 섹션 */}
          <Stack direction="column" spacing={4}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 950 }}>
                소설 표지 생성
              </Typography>
            </Stack>
            <Divider />

            {/* 생성 타입 선택 */}
            <Stack spacing={2}>
              <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                표지 생성 타입
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  startIcon={<CloudUploadIcon />}
                  onClick={(event) => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (event) => {
                      const file = event.target.files[0]
                      if (file) {
                        handleFileUpload(file)
                      }
                    }
                    input.click()
                  }}
                  sx={{
                    ...buttonSx,
                    backgroundColor: '#FFA000',
                    color: 'white',
                  }}
                >
                  파일 업로드
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setGenerationType('ai')}
                  sx={{
                    ...buttonSx,
                    backgroundColor: '#FFA000',
                    color: 'white',
                  }}
                >
                  AI 표지 생성
                </Button>
              </Stack>
            </Stack>

            {generationType === 'upload' && (
              <DropZone onFileSelect={handleFileUpload} accept="image/*" loading={uploadLoading} />
            )}

            {generationType === 'ai' && (
              <>
                {/* 키워드 입력 */}
                <Stack spacing={2}>
                  <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    이미지 생성 키워드
                  </Typography>
                  <TextField
                    fullWidth
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordInputKeyDown}
                    placeholder="키워드를 입력하고 Enter나 Space를 눌러주세요"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {keywords.map((keyword, index) => (
                      <Chip
                        key={index}
                        label={keyword}
                        onDelete={() => handleDeleteKeyword(keyword)}
                        sx={{
                          backgroundColor: '#FFA000',
                          color: 'white',
                          '& .MuiChip-deleteIcon': {
                            color: 'white',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Stack>

                {/* 스타일 선택 */}
                <Stack spacing={2}>
                  <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    이미지 스타일 선택
                  </Typography>
                  <Grid
                    container
                    spacing={2}
                    sx={{
                      width: '100%',
                      '& .MuiGrid-item': {
                        padding: 0,
                      },
                    }}
                  >
                    {stylePresets.map((style) => (
                      <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={style.id}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: selectedStyle === style.id ? '2px solid #FFA000' : 'none',
                            '&:hover': {
                              backgroundColor: 'grey.100',
                            },
                          }}
                          onClick={() => setSelectedStyle(style.id)}
                        >
                          <Typography variant="h6">{style.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {style.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

                {/* 생성 결과 */}
                <Stack spacing={2} alignItems="center">
                  <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    AI 생성 결과물
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      width: '100%',
                      maxWidth: '600px', // Limit maximum width for better layout
                    }}
                  >
                    {results.map((result, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: '100%',
                          maxWidth: '400px', // Adjust the size of individual result slots
                        }}
                      >
                        <ResultSlot>
                          {isGenerating.cover ? (
                            <Typography color="text.secondary">생성중...</Typography>
                          ) : (
                            <img
                              src={`${BACKEND_URL}/static/${result?.image_name}`}
                              // src={`${BACKEND_URL}/static/8155.png`}
                              alt={`Generated result`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                              onLoad={(e) => {
                                console.log('이미지 경로:', e.target.src);
                              }}
                            />
                          )}
                        </ResultSlot>
                      </Box>
                    ))}
                  </Box>

                  {/* 생성 및 저장 버튼 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 4 }}>
                    <PrimaryButton
                      startIcon={
                        isGenerating.cover ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />
                      }
                      onClick={handleGenerate}
                      disabled={isGenerating.cover || keywords.length === 0 || !selectedStyle}
                      sx={{ minWidth: 180, height: '36px' }}
                    >
                      {isGenerating.cover ? '생성중...' : 'AI 표지 생성하기'}
                    </PrimaryButton>
                    <PrimaryButton
                      startIcon={<SaveIcon />}
                      onClick={handleSaveGeneratedImage}
                      // disabled={!CreatedNovelPk.current || !currentImageName.current}
                      sx={{
                        minWidth: 180,
                        height: '36px',
                        backgroundColor: '#FFA000',
                        '&:hover': {
                          backgroundColor: '#FF8F00',
                        },
                      }}
                    >
                      이미지 저장
                    </PrimaryButton>
                  </Box>
                </Stack>
              </>
            )}
          </Stack>
        </Stack>
      )}

      {/* Snackbar 컴포넌트 추가 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default NovelBackgroundEditor
