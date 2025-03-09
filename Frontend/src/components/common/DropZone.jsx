import PropTypes from 'prop-types'

import { useCallback } from 'react'

import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Box, Button, Paper, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

const StyledDropZone = styled(Paper)(({ theme }) => ({
  width: '100%',
  minHeight: '300px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  border: `2px dashed ${theme.palette.grey[400]}`,
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.grey[100],
  },
  '&.drag-active': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.grey[100],
    transform: 'scale(1.01)',
  },
}))

const StyledCloudIcon = styled(CloudUploadIcon)(({ theme }) => ({
  fontSize: 64,
  color: theme.palette.grey[500],
  marginBottom: theme.spacing(2),
}))

const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}))

const DropZone = ({ onFileSelect, accept = 'image/*', loading = false }) => {
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()

      const files = event.dataTransfer?.files
      if (files?.length) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.classList.add('drag-active')
  }, [])

  const handleDragLeave = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.classList.remove('drag-active')
  }, [])

  const handleChange = useCallback(
    (event) => {
      const files = event.target.files
      if (files?.length) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <StyledDropZone
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        component="label"
        elevation={0}
      >
        <StyledCloudIcon />
        <Typography variant="h6" gutterBottom color="textSecondary">
          이미지를 드래그하여 업로드하거나
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          클릭하여 파일을 선택하세요
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
          지원 형식: JPG, PNG, GIF (최대 10MB)
        </Typography>
        <StyledButton component="span" variant="contained" startIcon={<CloudUploadIcon />} disabled={loading}>
          {loading ? '업로드 중...' : '파일 선택'}
        </StyledButton>
        <VisuallyHiddenInput type="file" onChange={handleChange} accept={accept} disabled={loading} />
      </StyledDropZone>
    </Box>
  )
}

DropZone.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  accept: PropTypes.string,
  loading: PropTypes.bool,
}

export default DropZone
