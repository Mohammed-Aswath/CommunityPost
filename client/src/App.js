import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import PostPage from './PostPage';
import ViewPage from './ViewPage';
import LoginPage from './LoginPage';
import { AuthProvider } from './AuthContext';
import { ThemeProvider, ThemeContext } from './ThemeContext';

import './App.css';

function ThemeEffect() {
  const { darkMode } = useContext(ThemeContext);

  React.useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  return null;
}


function Header() {
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <div className="header">
      <div className="title">
        Community Board
      </div>
      <div className="actions">
        <button
          className="button"
          onClick={() => navigate('/login')}
          title="Login"
        >
          <img
            src={
              darkMode
                ? 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/account-white-icon.png'
                : 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/account-icon.png'
            }
            alt="Login"
            style={{ width: '28px', height: '28px' }}
          />
        </button>
        <button
          className="button"
          onClick={() => setDarkMode(prev => !prev)}
          title="Toggle Theme"
        >
          {darkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<ViewPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/post" element={<PostPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeEffect />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}


export default App;
