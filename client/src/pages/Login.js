import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(userId, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid User ID or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #040d16, #0a1929 40%, #0d2818 70%, #071520)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorations */}
      <div style={{
        content: '',
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0, 200, 83, 0.1), transparent 70%)',
        top: '-150px',
        right: '-80px',
        borderRadius: '50%'
      }} />
      <div style={{
        content: '',
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 188, 212, 0.07), transparent 70%)',
        bottom: '-100px',
        left: '-60px',
        borderRadius: '50%'
      }} />

      <div style={{
        background: 'rgba(13, 33, 55, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--bd)',
        borderRadius: '20px',
        padding: '44px 36px',
        width: '420px',
        maxWidth: '92vw',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, var(--grnD), var(--grn))',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 30px rgba(0, 200, 83, 0.3)'
        }}>
          <i className="fa-solid fa-shield-halved" style={{ fontSize: '26px', color: '#fff' }}></i>
        </div>

        <h1 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '4px', color: 'var(--t1)' }}>
          SecureGuard Connect
        </h1>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--t3)', marginBottom: '32px' }}>
          Real-time hierarchical communication platform
        </p>

        {/* Error Box */}
        {error && (
          <div style={{
            background: 'rgba(255, 82, 82, 0.12)',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--red)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User ID Field */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <i className="fa-solid fa-id-badge" style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--t3)',
              fontSize: '15px',
              pointerEvents: 'none'
            }}></i>
            <input
              type="text"
              style={{
                width: '100%',
                background: 'var(--inp)',
                border: '1px solid var(--bd)',
                borderRadius: '12px',
                padding: '14px 16px 14px 44px',
                color: 'var(--t1)',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border 0.3s'
              }}
              placeholder="Enter User ID (e.g. 2026)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'var(--grn)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--bd)'}
              required
            />
          </div>

          {/* Password Field */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <i className="fa-solid fa-lock" style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--t3)',
              fontSize: '15px',
              pointerEvents: 'none'
            }}></i>
            <input
              type={showPassword ? 'text' : 'password'}
              style={{
                width: '100%',
                background: 'var(--inp)',
                border: '1px solid var(--bd)',
                borderRadius: '12px',
                padding: '14px 44px 14px 44px',
                color: 'var(--t1)',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border 0.3s'
              }}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = 'var(--grn)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--bd)'}
              required
            />
            <i 
              className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--t3)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            ></i>
          </div>

          {/* Remember Me */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--t2)',
            marginBottom: '8px'
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: 'var(--grn)', width: '16px', height: '16px' }}
            />
            Stay logged in (30 days)
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-p"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Note */}
        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--t3)'
        }}>
          Contact your administrator for login credentials
        </p>
      </div>
    </div>
  );
};

export default Login;
