const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: true
  },
  comparisonType: {
    type: String,
    enum: ['is_equal', 'not_equal', 'contains_text'],
    required: true
  },
  expectedValue: mongoose.Schema.Types.Mixed
}, { _id: false });

const ruleSchema = new mongoose.Schema({
  operator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  conditions: [conditionSchema]
}, { _id: false });

const fieldSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: true,
    trim: true
  },
  airtableFieldId: {
    type: String,
    required: true
  },
  displayLabel: {
    type: String,
    required: true,
    trim: true
  },
  fieldType: {
    type: String,
    enum: ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'multipleAttachments'],
    required: true
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  selectOptions: [{
    type: String,
    trim: true
  }],
  visibilityRules: ruleSchema,
  fieldOrder: {
    type: Number,
    default: 0
  }
}, { _id: false });

const formSchema = new mongoose.Schema({
  formTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  formDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  formOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  connectedBaseId: {
    type: String,
    required: true
  },
  connectedTableId: {
    type: String,
    required: true
  },
  formFields: [fieldSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  submissionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'forms'
});

formSchema.index({ formOwner: 1, createdAt: -1 });
formSchema.index({ connectedBaseId: 1, connectedTableId: 1 });

formSchema.virtual('formUrl').get(function() {
  return `/form/${this._id}`;
});

formSchema.methods.increment = function() {
  this.submissionCount += 1;
  return this.save();
};

module.exports = mongoose.model('Form', formSchema);
