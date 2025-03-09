import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'

import { NovelProvider } from './contexts/NovelContext'
import DiscussionList from './pages/DiscussionList'
import MainPage from './pages/MainPage'
import NavbarLayout from '/src/components/layout/NavbarLayout'
import SidebarLayout from '/src/components/layout/SidebarLayout'
import { AuthProvider } from '/src/hooks/useAuth'
import DiscussionRoom from '/src/pages/DiscussionRoom'
import DiscussionSummary from '/src/pages/DiscussionSummary'
import DiscussionSummaryList from '/src/pages/DiscussionSummaryList'
import NotFound from '/src/pages/NotFound'
import NovelBackgroundEditor from '/src/pages/NovelBackgroundEditor'
import NovelEditor from '/src/pages/NovelEditor'
import NovelEditorEpisode from '/src/pages/NovelEditorEpisode'
import NovelEditorNovelDetail from '/src/pages/NovelEditorNovelDetail'
import NovelEpisodeList from '/src/pages/NovelEpisodeList'
import NovelEpisodeViewer from '/src/pages/NovelEpisodeViewer'
import NovelList from '/src/pages/NovelList'
import UserChangeInfo from '/src/pages/UserChangeInfo'
import UserFindId from '/src/pages/UserFindId'
import UserFindPassword from '/src/pages/UserFindPassword'
import UserLogin from '/src/pages/UserLogin'
import UserMypage from '/src/pages/UserMypage'
import UserResetPassword from '/src/pages/UserResetPassword'
import UserSignUp from '/src/pages/UserSignUp'
import theme from '/src/styles/theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <NovelProvider>
            <Routes>
              {/* Navbar Layout */}
              <Route element={<NavbarLayout />}>
                {/* Auth routes */}
                <Route path="/" element={<MainPage />} />
                <Route path="/auth">
                  <Route path="login" element={<UserLogin />} />
                  <Route path="signup" element={<UserSignUp />} />
                  <Route path="find-id" element={<UserFindId />} />
                  <Route path="find-password" element={<UserFindPassword />} />
                  <Route path="reset-password" element={<UserResetPassword />} />
                  <Route path="change-info" element={<UserChangeInfo />} />
                  <Route path="mypage" element={<UserMypage />} />
                </Route>

                <Route path="/novel">
                  <Route path="" element={<NovelList />} />
                  <Route path=":novelId" element={<NovelEpisodeList />} />
                  <Route path=":novelId/:episodeId" element={<NovelEpisodeViewer />} />
                </Route>
              </Route>

              {/* Sidebar Layout */}
              <Route element={<SidebarLayout />}>
                <Route path="/discussion">
                  <Route path="" element={<DiscussionList />} />
                  <Route path=":discussionId" element={<DiscussionRoom />} />
                  <Route path=":discussionId/summary" element={<DiscussionSummary />} />
                </Route>

                <Route path="/novel/edit">
                  <Route path="" element={<NovelEditor />} />
                  <Route path="episodelist/:novelId" element={<NovelEditorNovelDetail />} />
                  <Route path="background" element={<NovelBackgroundEditor />} />
                  <Route path="background/:novelId" element={<NovelBackgroundEditor />} />
                  <Route path="episode/:novelId" element={<NovelEditorEpisode />} />
                  <Route path="episode/:novelId/:episodeId" element={<NovelEditorEpisode />} />
                  <Route path="idea/notes" element={<DiscussionSummaryList />} />
                  <Route path="idea/:noteId" element={<DiscussionSummary />} />
                </Route>
              </Route>

              {/* Not Found Page - 모든 정의되지 않은 경로에 대해 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NovelProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
