import axios from 'axios'
import PropTypes from 'prop-types'

import { useState } from 'react'

import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

// const CHARACTER_TYPES = {
//   protagonist: '주인공',
//   supporter: '조력자',
//   antagonist: '적대자',
//   extra: '기타 인물',
// }

const CharacterInput = ({ type, character, onChange, onDelete, novelId }) => {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleChange = (field) => (event) => {
    onChange({ ...character, [field]: event.target.value })
  }

  const handleSaveClick = async () => {
    setIsSaving(true)
    try {
      const characterData = {
        name: character.name,
        role: character.type,
        age: character.age,
        sex: character.gender,
        job: character.job,
        profile: character.profile,
      }

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/novel/character/${novelId}`,
        characterData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.status === 200) {
        console.log('Character saved successfully:', response.data)
        alert('캐릭터가 성공적으로 저장되었습니다.')
      } else {
        console.error('Error saving character:', response.status, response.data)
        alert('캐릭터 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving character:', error)
      alert('캐릭터 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = async () => {
    try {
      // character.id가 있는 경우만 서버 요청
      if (character.character_pk) {
        const response = await axios.delete(
          `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}/api/v1/novel/character/${novelId}/${character.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.status === 200) {
          console.log('Character deleted successfully')
          alert('캐릭터가 성공적으로 삭제되었습니다.')
        }
      }

      // character.id 유무와 관계없이 UI에서 삭제
      if (onDelete) {
        onDelete(character.character_pk || character.id)
      }
    } catch (error) {
      console.error('Error deleting character:', error)
      alert('캐릭터 삭제 중 오류가 발생했습니다.')
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
          value={type}
          onChange={handleChange('type')}
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
            value={character.gender}
            onChange={handleChange('gender')}
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
          onClick={handleSaveClick}
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
          저장
        </Button>
        <Button
          startIcon={<DeleteIcon />}
          onClick={handleDeleteClick}
          loading={isDeleting}
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
    gender: PropTypes.string.isRequired,
    age: PropTypes.string.isRequired,
    job: PropTypes.string.isRequired,
    profile: PropTypes.string.isRequired,
    type: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  novelId: PropTypes.string,
}

export default CharacterInput
