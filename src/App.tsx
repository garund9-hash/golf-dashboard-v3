import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GolfProvider } from './context/GolfContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TrendsPage } from './pages/TrendsPage';
import { CoursesPage } from './pages/CoursesPage';
import { ImportExportPage } from './pages/ImportExportPage';

export default function App() {
  return (
    <GolfProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="import-export" element={<ImportExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GolfProvider>
  );
}
