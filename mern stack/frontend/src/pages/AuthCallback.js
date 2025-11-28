import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

function AuthCallback({ setUser }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error') || searchParams.get('error_description');
    
    if (!code) {
      setError(errorParam || 'No code found');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/auth/callback', { code, state }, { withCredentials: true });
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Auth failed');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
      {error ? (
        <div>
          <h2>Authentication Error</h2>
          <p style={{ color: 'red' }}>{error}</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            This usually happens when the authorization code expires or is used multiple times.
          </p>
          <button onClick={() => navigate('/')}>Try Again</button>
        </div>
      ) : loading ? (
        <div>
          <h2>Logging in...</h2>
          <p>Please wait while we complete your authentication...</p>
        </div>
      ) : null}
    </div>
  );
}

export default AuthCallback;
