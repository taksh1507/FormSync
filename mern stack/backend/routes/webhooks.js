const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const Form = require('../models/Form');

router.post('/airtable', async (req, res) => {
  try {
    const data = req.body;

    if (data.base && data.webhook) {
      const { changedTablesById } = data.webhook;

      if (changedTablesById) {
        for (let tableId in changedTablesById) {
          const changes = changedTablesById[tableId];
          
          if (changes.createdRecordsById) {
            await handleCreatedRecords(changes.createdRecordsById, tableId);
          }

          if (changes.changedRecordsById) {
            await handleChangedRecords(changes.changedRecordsById, tableId);
          }

          if (changes.destroyedRecordIds) {
            await handleDestroyedRecords(changes.destroyedRecordIds, tableId);
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleCreatedRecords(records, tableId) {
}

async function handleChangedRecords(records, tableId) {
  try {
    for (let recordId in records) {
      const change = records[recordId];
      const response = await Response.findOne({ airtableRecordId: recordId });

      if (response && change.current && change.current.cellValuesByFieldId) {
        const answers = { ...response.fieldResponses };
        const form = await Form.findById(response.parentForm);
        
        if (form && form.formFields) {
          for (let fieldId in change.current.cellValuesByFieldId) {
            const field = form.formFields.find(f => f.airtableFieldId === fieldId);
            if (field) {
              answers[field.fieldKey] = change.current.cellValuesByFieldId[fieldId];
            }
          }
        }

        response.fieldResponses = answers;
        response.syncStatus = 'synced';
        await response.save();
      }
    }
  } catch (error) {
    console.error('Error handling changed records:', error);
  }
}

async function handleDestroyedRecords(recordIds, tableId) {
  try {
    for (let recordId of recordIds) {
      await Response.updateMany(
        { airtableRecordId: recordId },
        { 
          isDeletedInAirtable: true,
          syncStatus: 'synced'
        }
      );
    }
  } catch (error) {
    console.error('Error handling destroyed records:', error);
  }
}

module.exports = router;
