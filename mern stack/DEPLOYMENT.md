# Deployment Guide

## Environment Variables Setup

### Backend (.env file)

Create `backend/.env` with:

```env
MONGODB_URI=mongodb://localhost:27017/formbuilder
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-secret-key-change-in-production-min-32-chars
AIRTABLE_CLIENT_ID=your_airtable_client_id
AIRTABLE_CLIENT_SECRET=your_airtable_client_secret
AIRTABLE_REDIRECT_URI=http://localhost:3000/auth/callback
WEBHOOK_BASE_URL=http://localhost:5000
```

### Frontend (.env file)

Create `frontend/.env` with:

```env
REACT_APP_API_URL=http://localhost:5000
```

## Frontend Deployment

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to frontend: `cd frontend`
3. Run: `vercel`
4. Set environment variable: `REACT_APP_API_URL` = your backend URL
5. Redeploy

Or connect GitHub repo:
1. Go to vercel.com
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable `REACT_APP_API_URL`
5. Deploy

### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Navigate to frontend: `cd frontend`
3. Build: `npm run build`
4. Deploy: `netlify deploy --prod --dir=build`
5. Set environment variable: `REACT_APP_API_URL` = your backend URL

Or use Netlify dashboard:
1. Go to netlify.com
2. Connect GitHub repository
3. Set base directory to `frontend`
4. Build command: `npm run build`
5. Publish directory: `build`
6. Add environment variable `REACT_APP_API_URL`

## Backend Deployment

### Render

1. Go to render.com and create account
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - Name: `form-builder-api`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `NODE_ENV` - `production`
   - `FRONTEND_URL` - Your frontend URL (Vercel/Netlify)
   - `SESSION_SECRET` - Generate random string (32+ chars)
   - `AIRTABLE_CLIENT_ID` - Your Airtable OAuth client ID
   - `AIRTABLE_CLIENT_SECRET` - Your Airtable OAuth secret
   - `AIRTABLE_REDIRECT_URI` - `https://your-frontend-url/auth/callback`
   - `WEBHOOK_BASE_URL` - Your Render backend URL
   - `PORT` - Render auto-assigns (use env variable)
6. Deploy

### Railway

1. Go to railway.app and create account
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add service → Select "backend" directory
5. Railway auto-detects Node.js
6. Add environment variables (same as Render)
7. Deploy

## Post-Deployment Steps

1. Update Airtable OAuth App:
   - Go to airtable.com/create/oauth
   - Edit your OAuth app
   - Update redirect URI to: `https://your-frontend-url/auth/callback`

2. Update Airtable Webhooks:
   - Go to your Airtable base settings
   - Webhooks section
   - Update webhook URL to: `https://your-backend-url/api/webhooks/airtable`

3. Update Frontend Environment:
   - Set `REACT_APP_API_URL` to your backend URL
   - Redeploy frontend

## MongoDB Atlas Setup

For production MongoDB:

1. Go to mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for Render/Railway)
5. Get connection string
6. Update `MONGODB_URI` in backend environment

Connection string format:
```
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

## Testing Deployment

1. Visit frontend URL
2. Try OAuth login
3. Create a form
4. Submit form response
5. Check responses page
6. Test webhook (modify Airtable record manually)

## Troubleshooting

**CORS Errors:**
- Ensure `FRONTEND_URL` in backend matches your frontend domain exactly
- Check for trailing slashes

**OAuth Not Working:**
- Verify redirect URI matches exactly in Airtable
- Check backend logs for OAuth errors
- Ensure HTTPS URLs in production

**Database Connection:**
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check connection string format
- Verify database user credentials

**Webhooks Not Working:**
- Ensure backend URL is publicly accessible
- Check webhook URL in Airtable settings
- Verify backend logs for incoming requests

