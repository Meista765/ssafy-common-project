import { useState } from 'react'

import AddIcon from '@mui/icons-material/Add'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Box, Chip, Divider, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import { PrimaryButton } from '../components/common/buttons'

// 스타일 프리셋 데이터
const stylePresets = [
  { id: 1, name: '수채화', description: '부드럽고 감성적인 수채화 스타일' },
  { id: 2, name: '유화', description: '클래식하고 고급스러운 유화 스타일' },
  { id: 3, name: '일러스트', description: '현대적이고 감각적인 일러스트 스타일' },
  { id: 4, name: '포토리얼', description: '사실적이고 생동감 있는 사진 스타일' },
  { id: 5, name: '미니멀', description: '심플하고 모던한 미니멀 스타일' },
]

// 드래그 & 드롭 영역 스타일링
const DropZone = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  border: `2px dashed ${theme.palette.grey[400]}`,
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}))

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

const CoverGeneration = () => {
  const [generationType, setGenerationType] = useState('default')
  const [keywords, setKeywords] = useState([])
  const [keywordInput, setKeywordInput] = useState('')
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState(Array(4).fill(null))

  // 키워드 추가 핸들러
  const handleAddKeyword = (event) => {
    if (event.key === 'Enter' && keywordInput.trim()) {
      setKeywords([...keywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  // 키워드 삭제 핸들러
  const handleDeleteKeyword = (keywordToDelete) => {
    setKeywords(keywords.filter((keyword) => keyword !== keywordToDelete))
  }

  // 파일 드롭 핸들러
  const handleFileDrop = (event) => {
    event.preventDefault()
    // TODO: 파일 업로드 처리 로직 구현
  }

  // AI 생성 핸들러
  const handleGenerate = () => {
    setIsGenerating(true)
    // TODO: AI 생성 로직 구현
  }

  return (
    <Stack direction="column" spacing={4} sx={{ width: '100%', p: 3 }}>
      <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 950 }}>
        소설 표지 생성
      </Typography>
      <Divider />

      {/* 생성 타입 선택 */}
      <Stack spacing={2}>
        <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
          표지 생성 타입
        </Typography>
        <Stack direction="row" spacing={2}>
          <PrimaryButton
            startIcon={<AutoFixHighIcon />}
            onClick={() => setGenerationType('default')}
            backgroundColor={generationType === 'default' ? '#FFA000' : '#grey.200'}
          >
            기본 이미지
          </PrimaryButton>
          <PrimaryButton
            startIcon={<CloudUploadIcon />}
            onClick={() => setGenerationType('upload')}
            backgroundColor={generationType === 'upload' ? '#FFA000' : '#grey.200'}
          >
            파일 업로드
          </PrimaryButton>
          <PrimaryButton
            startIcon={<AddIcon />}
            onClick={() => setGenerationType('ai')}
            backgroundColor={generationType === 'ai' ? '#FFA000' : '#grey.200'}
          >
            AI 표지 생성
          </PrimaryButton>
        </Stack>
      </Stack>

      {generationType === 'upload' && (
        <DropZone onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
          <Typography>이미지를 드래그하여 업로드하거나 클릭하여 파일을 선택하세요</Typography>
        </DropZone>
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
              onKeyPress={handleAddKeyword}
              placeholder="키워드를 입력하고 Enter를 눌러주세요 (쉼표로 구분)"
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
            <Grid container spacing={2}>
              {stylePresets.map((style) => (
                <Grid item xs={12} sm={6} md={4} key={style.id}>
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
          <Stack spacing={2}>
            <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 700 }}>
              AI 생성 결과물
            </Typography>
            <Grid container spacing={2}>
              {results.map((result, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <ResultSlot>
                    {isGenerating ? (
                      <Typography color="text.secondary">생성중...</Typography>
                    ) : (
                      <Typography color="text.secondary">결과 {index + 1}</Typography>
                    )}
                  </ResultSlot>
                </Grid>
              ))}
            </Grid>
          </Stack>

          {/* 생성 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <PrimaryButton
              startIcon={<AutoFixHighIcon />}
              onClick={handleGenerate}
              disabled={isGenerating || keywords.length === 0 || !selectedStyle}
              sx={{ minWidth: 200 }}
            >
              {isGenerating ? '생성중...' : 'AI 표지 생성하기'}
            </PrimaryButton>
          </Box>
        </>
      )}
    </Stack>
  )
}

export default CoverGeneration
