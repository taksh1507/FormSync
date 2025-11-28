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
  try {
    const forms = await Form.find({ connectedTableId: tableId });
    if (!forms || forms.length === 0) return;

    for (let recordId in records) {
      const existing = await Response.findOne({ airtableRecordId: recordId });
      if (existing) continue;

      const record = records[recordId];
      for (const form of forms) {
        const answers = {};
        if (record && record.cellValuesByFieldId && Array.isArray(form.formFields)) {
          for (let field of form.formFields) {
            const value = record.cellValuesByFieldId[field.airtableFieldId];
            if (value !== undefined) {
              answers[field.fieldKey] = value;
            }
          }
        }
        const resp = new Response({
          parentForm: form._id,
          airtableRecordId: recordId,
          fieldResponses: answers,
          syncStatus: 'synced'
        });
        try {
          await resp.save();
          break;
        } catch (e) {
          continue;
        }
      }
    }
  } catch (error) {
    console.error('Error handling created records:', error);
  }
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
