import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_PROTOCOL}://${import.meta.env.VITE_BACKEND_IP}${import.meta.env.VITE_BACKEND_PORT}`

const NovelContext = createContext()

export const useNovel = () => {
  const context = useContext(NovelContext)
  if (!context) {
    throw new Error('useNovel must be used within a NovelProvider')
  }
  return context
}

export const NovelProvider = ({ children }) => {
  // 소설 관련 상태
  const [novelData, setNovelData] = useState({
    episode: [],
    novel_info: [],
    discussion: [],
    comment: [],
  })
  const [comments, setComments] = useState([])
  const [discussions, setDiscussions] = useState([])

  // 에피소드 뷰어 관련 상태
  const [currentEpisode, setCurrentEpisode] = useState(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [rating, setRating] = useState(0)
  const [viewerSettings, setViewerSettings] = useState({
    fontSize: 16,
    fontFamily: 'Nanum Gothic',
    bgColor: '#ffffff',
  })

  // 소설 데이터 가져오기
  const fetchNovelData = useCallback(async (novelId, retryCount = 0) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/novel/${novelId}/detail`, { withCredentials: true })
      if (response.data) {
        const sortedData = {
          ...response.data,
          episode: [...response.data.episode].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
        }
        setNovelData(sortedData)
        setComments(response.data.comment)
        setDiscussions(response.data.discussion)
        return sortedData
      }
    } catch (error) {
      if (retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return fetchNovelData(novelId, retryCount + 1)
      }
      console.error('소설 데이터 로딩 실패')
      throw error
    }
  }, [])

  // 에피소드 설정 변경
  const updateViewerSettings = useCallback((settings) => {
    setViewerSettings((prev) => ({ ...prev, ...settings }))
  }, [])

  // 북마크 토글
  const toggleBookmark = useCallback(() => {
    setIsBookmarked((prev) => !prev)
    // TODO: API 호출 추가
  }, [])

  // 좋아요 토글
  const toggleLike = useCallback(() => {
    setIsLiked((prev) => !prev)
    // TODO: API 호출 추가
  }, [])

  // 평점 업데이트
  const updateRating = useCallback((newRating) => {
    setRating(newRating)
    // TODO: API 호출 추가
  }, [])

  const value = {
    novelData,
    comments,
    discussions,
    currentEpisode,
    isBookmarked,
    isLiked,
    rating,
    viewerSettings,
    fetchNovelData,
    setCurrentEpisode,
    toggleBookmark,
    toggleLike,
    updateRating,
    updateViewerSettings,
  }

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>
}

NovelProvider.propTypes = {
  children: PropTypes.node.isRequired,
} 