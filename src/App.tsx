import "./App.css";
import { ThemeProvider } from 'next-themes';
import { Routes, Route, HashRouter } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateProfilePage } from './pages/CreateProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { ProfileViewPage } from './pages/ProfileViewPage';
import { PermissionPage } from './pages/PermissionPage';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HashRouter>
        <Routes>
          {/* Permission gate — shown in a separate BrowserWindow before main UI */}
          <Route path="/permission" element={<PermissionPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<CreateProfilePage />} />
          <Route path="/view/:id" element={<ProfileViewPage />} />
          <Route path="/:id" element={<EditProfilePage />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
