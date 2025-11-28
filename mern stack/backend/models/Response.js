const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  parentForm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true
  },
  airtableRecordId: {
    type: String,
    required: true,
    unique: true
  },
  fieldResponses: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(responses) {
        return responses && typeof responses === 'object';
      },
      message: 'Field responses must be a valid object'
    }
  },
  submissionSource: {
    type: String,
    default: 'web_form'
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced'
  },
  isDeletedInAirtable: {
    type: Boolean,
    default: false,
    index: true
  },
  isValidSubmission: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'form_responses'
});

responseSchema.index({ 
  parentForm: 1, 
  createdAt: -1 
});

responseSchema.index({ 
  airtableRecordId: 1, 
  isDeletedInAirtable: 1 
});

responseSchema.methods.markDeleted = function() {
  this.isDeletedInAirtable = true;
  this.syncStatus = 'synced';
  return this.save();
};

responseSchema.statics.findActive = function(formId) {
  return this.find({ 
    parentForm: formId, 
    isDeletedInAirtable: false 
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Response', responseSchema);
