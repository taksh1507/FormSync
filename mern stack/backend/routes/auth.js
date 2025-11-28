const express = require('express');
const authRouter = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');

const genToken = (len = 32) => {
  return crypto.randomBytes(len).toString('base64url');
};

const sha256 = (input) => {
  return crypto.createHash('sha256').update(input).digest('base64url');
};

authRouter.get('/airtable', async (req, res) => {
  try {
    const oauthClientId = process.env.AIRTABLE_CLIENT_ID;
    const callbackUrl = process.env.AIRTABLE_REDIRECT_URI;
    
    if (!oauthClientId || !callbackUrl) {
      return res.status(500).json({ 
        error: 'OAuth configuration missing' 
      });
    }
    
    const oauthState = genToken(16);
    const pkceVerifier = genToken(32);
    const pkceChallenge = sha256(pkceVerifier);
    
    req.session.pkceVerifier = pkceVerifier;
    req.session.oauthState = oauthState;
    
    await new Promise((resolve, reject) => {
      req.session.save((error) => {
        if (error) {
          console.error('Session persistence failed:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
    
    const requiredScopes = [
      'data.records:read', 
      'data.records:write', 
      'schema.bases:read'
    ];
    
    const authorizationParams = new URLSearchParams({
      client_id: oauthClientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      state: oauthState,
      code_challenge: pkceChallenge,
      code_challenge_method: 'S256',
      scope: requiredScopes.join(' ')
    });
    
    const authorizationUrl = `https://airtable.com/oauth2/v1/authorize?${authorizationParams}`;
    
    res.json({ 
      authUrl: authorizationUrl, 
      state: oauthState 
    });
    
  } catch (error) {
    console.error('OAuth initiation failed:', error);
    res.status(500).json({ 
      error: 'Failed to initiate authentication' 
    });
  }
});

authRouter.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        error: 'Authorization code is required' 
      });
    }

    const storedVerifier = req.session.pkceVerifier;
    const storedState = req.session.oauthState;
    
    if (!storedVerifier || !storedState) {
      return res.status(400).json({ 
        error: 'Session expired or invalid' 
      });
    }
    
    delete req.session.pkceVerifier;
    delete req.session.oauthState;

    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
      code_verifier: storedVerifier
    });
    
    const clientCredentials = Buffer.from(
      `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
    ).toString('base64');

    const tokenExchangeResponse = await axios.post(
      'https://airtable.com/oauth2/v1/token', 
      tokenRequestBody.toString(), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${clientCredentials}`
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenExchangeResponse.data;

    const profileResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const profile = profileResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    let user = await User.findOne({ airtableUserId: profile.id });
    
    if (user) {
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.tokenExpiry = expiresAt;
      user.email = profile.email || user.email;
      user.displayName = profile.name || user.displayName;
      user.airtableProfile = profile;
    } else {
      user = new User({
        airtableUserId: profile.id,
        email: profile.email,
        displayName: profile.name,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: expiresAt,
        airtableProfile: profile
      });
    }
    
    await user.save();

    req.session.userId = user._id;
    await new Promise((resolve, reject) => {
      req.session.save((sessionError) => {
        if (sessionError) {
          reject(sessionError);
        } else {
          resolve();
        }
      });
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        airtableUserId: user.airtableUserId
      }
    });
    
  } catch (error) {
    console.error('Authentication callback error:', error);
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        error.message || 
                        'Authentication failed';
    
    res.status(500).json({ 
      error: 'Authentication failed',
      message: errorMessage
    });
  }
});

authRouter.get('/me', async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const user = await User.findById(currentUserId)
      .select('-accessToken -refreshToken')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({ 
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        airtableUserId: user.airtableUserId,
        accountCreated: user.accountCreated,
        lastActiveAt: user.lastActiveAt
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile' 
    });
  }
});

authRouter.post('/logout', (req, res) => {
  if (!req.session.userId) {
    return res.status(400).json({ 
      error: 'No active session to logout' 
    });
  }
  
  req.session.destroy((destroyError) => {
    if (destroyError) {
      console.error('Session destruction failed:', destroyError);
      return res.status(500).json({ 
        error: 'Logout process failed' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Successfully logged out'
    });
  });
});

module.exports = authRouter;
