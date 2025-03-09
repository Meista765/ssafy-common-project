import axios from 'axios'
import { useInView } from 'react-intersection-observer'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

import { useAuth } from '../hooks/useAuth'
import main1 from '/image/main1.png'
import main2 from '/image/main2.png'
import main from '/image/main.png'

// Styled components
const GradientBackground = styled(Box)({
  background: 'linear-gradient(180deg, #FFB84C 0%, #FFE4B8 35%, #FFFFFF 100%)',
  minHeight: '100vh',
  width: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
})

const HeroSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 0',
  textAlign: 'center',
  minHeight: '60vh',
})

const ContentSection = styled('section')({
  width: '100%',
  padding: '48px 0',
})

const ContentContainer = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '1200px',
  margin: '0 auto',
})

const GuideButton = styled(Button)(({ theme }) => ({
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
}))

const StatsCard = styled(Box)(({ color }) => ({
  background: color,
  borderRadius: '16px',
  padding: '20px',
  color: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minHeight: '150px',
}))

const LoggedInContent = React.memo(({ mainData, onNovelClick, onNavigateToNovel }) => {
  if (!mainData) return null

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Stats Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 3,
            mb: 6,
          }}
        >
          <StatsCard
            color="#6C5CE7"
            onClick={() => mainData?.recent_best?.pk && onNovelClick(mainData.recent_best.pk)}
            sx={{
              cursor: mainData?.recent_best?.pk ? 'pointer' : 'default',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': mainData?.recent_best?.pk
                ? {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  }
                : {},
            }}
          >
            <Typography variant="h6">실시간 인기</Typography>
            <Typography variant="body1">{mainData?.recent_best?.title || '로딩 중...'}</Typography>
          </StatsCard>

          <StatsCard
            color="#FF6B6B"
            onClick={() => mainData?.month_best?.pk && onNovelClick(mainData.month_best.pk)}
            sx={{
              cursor: mainData?.month_best?.pk ? 'pointer' : 'default',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': mainData?.month_best?.pk
                ? {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  }
                : {},
            }}
          >
            <Typography variant="h6">이달의 화제작</Typography>
            <Typography variant="body1">{mainData?.month_best?.title || '로딩 중...'}</Typography>
          </StatsCard>
        </Box>

        {/* Recent Novels Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            최근 본 작품
          </Typography>
          {mainData?.user?.recent_novels?.length > 0 ? (
            <Grid container spacing={3}>
              {mainData.user.recent_novels.map((novel) => (
                <Grid item size={{ xs: 12, sm: 6, md: 3 }} key={novel.novel_pk}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '4px',
                      transition: 'transform 0.2s ease-in-out',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  >
                    <CardActionArea onClick={() => onNovelClick(novel.novel_pk)}>
                      <CardMedia
                        component="img"
                        sx={{ aspectRatio: '3/4', objectFit: 'cover' }}
                        image={novel.novel_img || '/placeholder.png'}
                        alt={novel.title}
                        onError={(e) => {
                          e.target.onerror = null // 무한 루프 방지
                          e.target.src = '/placeholder/cover-image-placeholder.png'
                        }}
                      />
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {novel.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          {novel.is_completed ? '완결' : '연재중'}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                py: 4,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                최근 본 작품이 없습니다.
              </Typography>
              <Button
                variant="contained"
                onClick={onNavigateToNovel}
                sx={{
                  backgroundColor: '#6C5CE7',
                  '&:hover': {
                    backgroundColor: '#5344c7',
                  },
                }}
              >
                소설 보러가기
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  )
})
LoggedInContent.displayName = 'LoggedInContent'

// NonLoggedInContent를 메인 컴포넌트 외부로 이동
const NonLoggedInContent = React.memo(({ ref1, ref2, ref3, inView1, inView2, inView3, onGuideButton }) => (
  <>
    <HeroSection marginBottom={10}>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '2.5rem', md: '4rem' },
          fontWeight: 700,
          color: '#FFFFFF',
          marginBottom: 2,
        }}
      >
        MOMOSO
      </Typography>
    </HeroSection>

    <ContentSection>
      <ContentContainer
        ref={ref1}
        sx={{
          transform: `translateY(${inView1 ? '0' : '100px'})`,
          opacity: inView1 ? 1 : 0,
          transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
        }}
      >
        {/* Image */}
        <Box
          sx={{
            flex: { xs: '1', md: '0 0 auto' },
            width: { xs: '100%', md: '500px' },
            mb: 5,
          }}
        >
          <img
            src={main}
            alt="Reading illustration"
            style={{
              width: '100%',
              height: 'auto',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h3"
          textAlign="center"
          sx={{
            fontSize: { xs: '1.8rem', md: '2.2rem' },
            fontWeight: 700,
            marginBottom: 3,
          }}
        >
          모두 함께 모여 소설을 만들어 가는 공간, 모모소
        </Typography>

        {/* Text Content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: { xs: 'center' },
            maxWidth: '500px',
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', md: '1.2rem' },
              marginBottom: 4,
              color: '#555555',
            }}
          >
            자유롭게 소설에 대한 의견을 나누고, AI와 함께 작가가 되어보세요.
          </Typography>
          <GuideButton
            variant="contained"
            sx={{
              width: 'auto',
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
            }}
            onClick={onGuideButton}
          >
            📖 로그인하고 모모소 이용하기
          </GuideButton>
        </Box>
      </ContentContainer>

      {/* AI 소설 생성 섹션 */}
      <ContentContainer
        ref={ref2}
        sx={{
          marginTop: '10rem',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '60px',
          transform: `translateY(${inView2 ? '0' : '100px'})`,
          opacity: inView2 ? 1 : 0,
          transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
          '@media (max-width: 900px)': {
            flexDirection: 'column',
          },
        }}
      >
        {/* Text Content */}
        <Box
          sx={{
            flex: '1',
            maxWidth: '500px',
            order: { xs: 2, md: 1 },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '1.8rem', md: '2.2rem' },
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            AI 소설 생성
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', md: '1.2rem' },
              marginBottom: 4,
              color: '#555555',
            }}
          >
            소재는 있는데 설정이 필요하시거나, 글을 쓸 시간이 부족하셨나요?
            <br />
            AI 소설 생성 기능으로 나만의 작품을 만들어보세요.
          </Typography>
        </Box>

        {/* Illustration */}
        <Box
          sx={{
            flex: '0 0 auto',
            width: '250px',
            order: { xs: 1, md: 2 },
          }}
        >
          <img
            src={main1}
            alt="AI 소설 생성 일러스트레이션"
            style={{
              width: '100%',
              height: 'auto',
            }}
          />
        </Box>
      </ContentContainer>

      {/* 그룹 토론 섹션 */}
      <ContentContainer
        ref={ref3}
        sx={{
          marginTop: '15rem',
          marginBottom: '10rem',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '60px',
          transform: `translateY(${inView3 ? '0' : '100px'})`,
          opacity: inView3 ? 1 : 0,
          transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
          '@media (max-width: 900px)': {
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ flex: '0 0 auto', width: '300px' }}>
          <img
            src={main2}
            alt="그룹 토론 일러스트레이션"
            style={{
              width: '100%',
              height: 'auto',
            }}
          />
        </Box>

        {/* Text Content */}
        <Box
          sx={{
            flex: '1',
            maxWidth: '500px',
            order: { xs: 2, md: 1 },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '1.8rem', md: '2.2rem' },
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            그룹 토론
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', md: '1.2rem' },
              marginBottom: 4,
              color: '#555555',
            }}
          >
            소설 속의 내용에 대해 다른 사람들과 함께 이야기하고 싶으셨나요?
            <br />
            그룹 토론 기능으로 자유롭게 이야기 나누고 작가에게 아이디어를 전달해보세요.
          </Typography>
        </Box>
      </ContentContainer>
    </ContentSection>
  </>
))
NonLoggedInContent.displayName = 'NonLoggedInContent'

const MainPage = () => {
  const { isLoggedIn } = useAuth()
  const [mainData, setMainData] = useState(null)
  const navigate = useNavigate()

  // InView 관련 hooks
  const [ref1, inView1] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })
  const [ref2, inView2] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })
  const [ref3, inView3] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  const handleGuideButton = useCallback(() => {
    navigate('/auth/login')
  }, [navigate])

  const handleNovelClick = useCallback(
    (novelPk) => {
      navigate(`/novel/${novelPk}`)
    },
    [navigate]
  )

  const handleNavigateToNovel = useCallback(() => {
    navigate('/novel')
  }, [navigate])

  // 데이터 fetch - isLoggedIn이 변경될 때만 실행
  useEffect(() => {
    const fetchMainData = async () => {
      if (!isLoggedIn) return

      try {
        const response = await axios.get('/api/v1/main')
        setMainData(response.data)
        console.log(response.data)
      } catch (error) {
        console.error('메인 데이터 로드 실패:', error)
      }
    }

    fetchMainData()
  }, [isLoggedIn])

  // 메인 렌더링
  return (
    <Box
      component="main"
      sx={{
        background: isLoggedIn ? 'none' : 'linear-gradient(180deg, #FFB84C 0%, #FFE4B8 35%, #FFFFFF 100%)',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isLoggedIn ? (
        <LoggedInContent
          mainData={mainData}
          onNovelClick={handleNovelClick}
          onNavigateToNovel={handleNavigateToNovel}
        />
      ) : (
        <NonLoggedInContent
          ref1={ref1}
          ref2={ref2}
          ref3={ref3}
          inView1={inView1}
          inView2={inView2}
          inView3={inView3}
          onGuideButton={handleGuideButton}
        />
      )}
    </Box>
  )
}

export default MainPage
