import { useNavigate } from 'react-router-dom'

import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
      }}
    >
      <img
        src="/logo/graphic-logo.svg"
        alt="MOMOSO"
        style={{
          width: 'auto',
        }}
      />
      <Typography variant="h1" sx={{ fontSize: '120px', color: '#FFB347', fontWeight: 950 }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mb: 2, color: '#1E1E1E' }}>
        페이지를 찾을 수 없습니다
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: '#666666' }}>
        요청하신 페이지가 존재하지 않거나, 잘못된 경로입니다.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{
          backgroundColor: '#FFB347',
          '&:hover': {
            backgroundColor: '#FFA022',
          },
        }}
      >
        메인으로 돌아가기
      </Button>
    </Container>
  )
}

export default NotFound
