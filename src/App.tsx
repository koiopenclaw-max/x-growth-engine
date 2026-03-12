import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import AnalyticsPage from './pages/Analytics'
import ArticleEditorPage from './pages/ArticleEditor'
import ArticlesPage from './pages/Articles'
import CalendarPage from './pages/Calendar'
import CreatePostPage from './pages/CreatePost'
import DashboardPage from './pages/Dashboard'
import LoginPage from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:id" element={<ArticleEditorPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
