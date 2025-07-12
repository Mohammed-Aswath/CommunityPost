import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { ThemeContext } from './ThemeContext';
import './LoginPage.css'; // We'll define this next

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username || !password) {
      alert('Please fill in all fields');
      return;
    }

    const res = await fetch('https://communitypost-5g0u.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      login(data.token);
      navigate('/post');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className={`login-container ${darkMode ? 'dark' : ''}`}>
      <div className="login-box">
        <img
          src={darkMode
            ? 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/account-white-icon.png' // White login icon
            : 'https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/account-icon.png'} // Dark mode login icon
          alt="Login"
          className="login-logo"
        />
        <h2>Teacher Login</h2>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button onClick={handleSubmit}>Login</button>
      </div>
    </div>
  );
}

export default LoginPage;
