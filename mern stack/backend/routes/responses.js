const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Form = require('../models/Form');
const axios = require('axios');
const { isFieldVisible } = require('../utils/conditionalLogic');

router.post('/submit', async (req, res) => {
  try {
    const { formId, answers } = req.body;

    if (!formId || !answers) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const form = await Form.findById(formId).populate('formOwner');
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const errors = validateAnswers(form, answers);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const user = form.formOwner;
    const airtableFields = transformAnswersForAirtable(form, answers);

    const airtableResponse = await axios.post(
      `https://api.airtable.com/v0/${form.connectedBaseId}/${form.connectedTableId}`,
      { fields: airtableFields },
      {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const airtableRecord = airtableResponse.data;

    const response = new Response({
      parentForm: form._id,
      airtableRecordId: airtableRecord.id,
      fieldResponses: answers
    });

    await response.save();

    res.status(201).json({
      success: true,
      response,
      airtableRecordId: airtableRecord.id
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/forms/:formId', async (req, res) => {
  try {
    const { formId } = req.params;

    const responses = await Response.findActive(formId);

    res.json({ responses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:responseId', async (req, res) => {
  try {
    const response = await Response.findById(req.params.responseId);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function validateAnswers(form, answers) {
  const errors = [];
  const answeredQuestions = {};

  for (const field of form.formFields) {
    const isVisible = isFieldVisible(
      field.visibilityRules,
      answeredQuestions
    );

    if (!isVisible) continue;

    const answer = answers[field.fieldKey];

    if (field.isRequired && (answer === undefined || answer === null || answer === '')) {
      errors.push(`${field.displayLabel || field.fieldKey} is required`);
      continue;
    }

    if (answer !== undefined && answer !== null && answer !== '') {
      answeredQuestions[field.fieldKey] = answer;

      if (field.fieldType === 'singleSelect' && field.selectOptions) {
        if (!field.selectOptions.includes(answer)) {
          errors.push(`Invalid option for ${field.displayLabel}`);
        }
      }

      if (field.fieldType === 'multipleSelects' && field.selectOptions) {
        if (!Array.isArray(answer)) {
          errors.push(`${field.displayLabel} must be an array`);
        } else {
          const invalidOptions = answer.filter(opt => !field.selectOptions.includes(opt));
          if (invalidOptions.length > 0) {
            errors.push(`Invalid options for ${field.displayLabel}: ${invalidOptions.join(', ')}`);
          }
        }
      }
    }
  }

  return errors;
}

function transformAnswersForAirtable(form, answers) {
  const fields = {};

  for (let field of form.formFields) {
    const answer = answers[field.fieldKey];
    if (answer !== undefined && answer !== null && answer !== '') {
      fields[field.airtableFieldId] = answer;
    }
  }

  return fields;
}

module.exports = router;
