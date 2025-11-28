const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');
const axios = require('axios');

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

router.get('/bases', requireAuth, async (req, res) => {
  try {
    const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
      headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
    });
    
    res.json({ bases: response.data.bases });
  } catch (error) {
    console.error('Bases endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/bases/:baseId/tables', requireAuth, async (req, res) => {
  try {
    const { baseId } = req.params;
    const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
    });
    
    res.json({ tables: response.data.tables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bases/:baseId/tables/:tableId/fields', requireAuth, async (req, res) => {
  try {
    const { baseId, tableId } = req.params;
    
    const response = await axios.get(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
    });
    
    const table = response.data.tables.find(t => t.id === tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const supportedTypes = ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'multipleAttachments'];
    const filteredFields = table.fields.filter(field => supportedTypes.includes(field.type));
    
    res.json({ fields: filteredFields });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const formTitle = req.body.formTitle || req.body.name;
    const formDescription = req.body.formDescription || req.body.description;
    const connectedBaseId = req.body.connectedBaseId || req.body.airtableBaseId;
    const connectedTableId = req.body.connectedTableId || req.body.airtableTableId;
    const formFields = req.body.formFields || req.body.questions;
    
    if (!formTitle || !connectedBaseId || !connectedTableId) {
      return res.status(400).json({ error: 'Missing required fields: title, base ID, and table ID' });
    }

    const supportedTypes = ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'multipleAttachments'];
    
    for (let field of formFields || []) {
      const fieldType = field.fieldType || field.type;
      if (!supportedTypes.includes(fieldType)) {
        return res.status(400).json({ 
          error: `Unsupported field type: ${fieldType}` 
        });
      }
    }

    const form = new Form({
      formTitle,
      formDescription,
      formOwner: req.user._id,
      connectedBaseId,
      connectedTableId,
      formFields
    });

    await form.save();
    res.status(201).json({ form });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const forms = await Form.find({ formOwner: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ forms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:formId', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ form });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:formId', requireAuth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.formOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(form, req.body);
    await form.save();

    res.json({ form });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:formId', requireAuth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.formOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Form.deleteOne({ _id: req.params.formId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
