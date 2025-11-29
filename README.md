# Dynamic Form Builder

Full-stack MERN app for building forms from Airtable data.

## Setup

### Install

```bash
cd backend && npm install
cd frontend && npm install
```

### Environment

Backend `.env`:
```
MONGODB_URI=mongodb://localhost:27017/formbuilder
PORT=5000
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-secret-key
AIRTABLE_CLIENT_ID=your_client_id
AIRTABLE_CLIENT_SECRET=your_client_secret
AIRTABLE_REDIRECT_URI=http://localhost:3000/auth/callback
WEBHOOK_BASE_URL=http://localhost:5000
```

Frontend `.env`:
```
REACT_APP_API_URL=http://localhost:5000
```

### Run

```bash
cd backend && npm run dev
cd frontend && npm start
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
- Frontend: Deploy `frontend` folder to Vercel/Netlify
- Backend: Deploy `backend` folder to Render/Railway

## API

**Auth**
- `GET /api/auth/airtable` - Start OAuth
- `POST /api/auth/callback` - OAuth callback
- `GET /api/auth/me` - Get user
- `POST /api/auth/logout` - Logout

**Forms**
- `GET /api/forms` - List forms
- `POST /api/forms` - Create form
- `GET /api/forms/:id` - Get form
- `PUT /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form
- `GET /api/forms/bases` - Get bases
- `GET /api/forms/bases/:baseId/tables` - Get tables
- `GET /api/forms/bases/:baseId/tables/:tableId/fields` - Get fields

**Responses**
- `POST /api/responses/submit` - Submit response
- `GET /api/responses/forms/:formId` - Get responses

**Webhooks**
- `POST /api/webhooks/airtable` - Airtable webhook

## Models

**User**: airtableUserId, email, displayName, accessToken, refreshToken, tokenExpiry

**Form**: formTitle, formOwner, connectedBaseId, connectedTableId, formFields

**Response**: parentForm, airtableRecordId, fieldResponses, syncStatus, isDeletedInAirtable

## Conditional Logic

Questions show/hide based on answers:

```javascript
{
  operator: "AND",
  conditions: [{
    fieldKey: "role",
    comparisonType: "is_equal",
    expectedValue: "Engineer"
  }]
}
```

Operators: `is_equal`, `not_equal`, `contains_text`
Logic: `AND`, `OR`

## Field Types

- singleLineText
- multilineText
- singleSelect
- multipleSelects
- multipleAttachments
![Form Builder UI](./image.png)
![Create Form Screen](./image-1.png)
![Conditional Logic Example](./image-2.png)
![Responses Dashboard](./image-3.png)
