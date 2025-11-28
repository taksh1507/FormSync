const axios = require('axios');
const User = require('../models/User');

const exchangeRefreshToken = async (user) => {
  const clientCredentials = Buffer.from(
    `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
  ).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: user.refreshToken,
  });

  const res = await axios.post(
    'https://airtable.com/oauth2/v1/token',
    body.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${clientCredentials}`,
      },
    }
  );

  const { access_token, refresh_token, expires_in } = res.data;
  user.accessToken = access_token;
  if (refresh_token) user.refreshToken = refresh_token;
  user.tokenExpiry = new Date(Date.now() + expires_in * 1000);
  await user.save();
  return user.accessToken;
};

const ensureAccessToken = async (user) => {
  if (user.isExpired && user.isExpired()) {
    await exchangeRefreshToken(user);
  }
  return user.accessToken;
};

const airtableRequest = async (user, config) => {
  await ensureAccessToken(user);
  try {
    const res = await axios({
      ...config,
      headers: {
        ...(config.headers || {}),
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    return res;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      await exchangeRefreshToken(user);
      const res = await axios({
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
      return res;
    }
    throw err;
  }
};

module.exports = { airtableRequest, ensureAccessToken };

