import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Login.css';

const LoginPage = () => {
  const [oauthUrl, setOauthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeAuthentication();
  }, []);

  const initializeAuthentication = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get('/api/auth/airtable');
      
      if (response.data?.authUrl) {
        setOauthUrl(response.data.authUrl);
        
        if (response.data.state) {
          sessionStorage.setItem('oauth_verification_state', response.data.state);
        }
      } else {
        setError('Failed to initialize authentication');
      }
    } catch (authError) {
      console.error('Authentication initialization failed:', authError);
      setError('Unable to connect to authentication service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    initializeAuthentication();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Dynamic Form Builder</h1>
          <p className="login-subtitle">
            Build interactive forms using your Airtable data
          </p>
        </div>
        
        <div className="login-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Preparing authentication...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button onClick={handleRetry} className="retry-button">
                Try Again
              </button>
            </div>
          ) : oauthUrl ? (
            <div className="auth-ready">
              <p className="auth-description">
                Connect your Airtable account to start building forms
              </p>
              <a href={oauthUrl} className="airtable-login-btn">
                <span className="btn-icon">🔗</span>
                Connect with Airtable
              </a>
            </div>
          ) : (
            <div className="error-state">
              <p className="error-message">Authentication service unavailable</p>
            </div>
          )}
        </div>
        
        <div className="login-footer">
          <p className="feature-list">
            ✓ OAuth secure authentication<br/>
            ✓ Dynamic form generation<br/>
            ✓ Real-time data sync
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
