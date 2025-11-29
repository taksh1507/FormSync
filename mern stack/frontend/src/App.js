import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

const apiBase = process.env.REACT_APP_API_BASE_URL;
if (apiBase) {
  axios.defaults.baseURL = apiBase;
} else {
  const isProd = window.location.hostname !== 'localhost';
  if (isProd) {
    axios.defaults.baseURL = 'https://formsync-73z5.onrender.com';
  }
}
axios.defaults.withCredentials = true;

import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import FormBuilderPage from './pages/FormBuilder';
import FormViewerPage from './pages/FormViewer';
import ResponsesPage from './pages/ResponseList';
import AuthCallbackPage from './pages/AuthCallback';
import NavigationBar from './components/Navbar';

const FormBuilderApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  
  useEffect(() => {
    verifyAuthentication();
  }, []);

  const verifyAuthentication = async () => {
    try {
      const response = await axios.get('/api/auth/me', { 
        withCredentials: true 
      });
      
      if (response.data?.user) {
        setCurrentUser(response.data.user);
      }
    } catch (authError) {
      console.log('User not authenticated');
      setCurrentUser(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Initializing application...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="form-builder-application">
        {currentUser && (
          <NavigationBar 
            user={currentUser} 
            onUserChange={setCurrentUser} 
          />
        )}
        
        <main className="main-content">
          <Routes>
           
            <Route 
              path="/" 
              element={
                currentUser ? 
                <Navigate to="/dashboard" replace /> : 
                <LoginPage />
              } 
            />
            
           
            <Route 
              path="/auth/callback" 
              element={<AuthCallbackPage setUser={setCurrentUser} />} 
            />
            
            
            <Route 
              path="/dashboard" 
              element={
                currentUser ? 
                <DashboardPage /> : 
                <Navigate to="/" replace />
              } 
            />
            
            <Route 
              path="/forms/create" 
              element={
                currentUser ? 
                <FormBuilderPage /> : 
                <Navigate to="/" replace />
              } 
            />
            
            <Route 
              path="/forms/:formId/edit" 
              element={
                currentUser ? 
                <FormBuilderPage /> : 
                <Navigate to="/" replace />
              } 
            />
            
            <Route 
              path="/form/:formId" 
              element={<FormViewerPage />} 
            />
            
            <Route 
              path="/forms/:formId/responses" 
              element={
                currentUser ? 
                <ResponsesPage /> : 
                <Navigate to="/" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default FormBuilderApp;
