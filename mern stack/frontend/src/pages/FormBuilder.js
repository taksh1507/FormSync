import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './FormBuilder.css';

function FormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [availableFields, setAvailableFields] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBases();
    if (formId) loadForm();
  }, [formId]);

  const loadBases = async () => {
    try {
      const res = await axios.get('/api/forms/bases', { withCredentials: true });
      setBases(res.data.bases);
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const loadForm = async () => {
    try {
      const res = await axios.get(`/api/forms/${formId}`, { withCredentials: true });
      const form = res.data.form;
      setFormName(form.formTitle || form.name);
      setDescription(form.formDescription || form.description || '');
      setSelectedBase(form.connectedBaseId || form.airtableBaseId);
      setSelectedTable(form.connectedTableId || form.airtableTableId);
      setQuestions(form.formFields || form.questions);
      
      const baseId = form.connectedBaseId || form.airtableBaseId;
      if (baseId) {
        await loadTables(baseId);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const loadTables = async (baseId) => {
    try {
      const res = await axios.get(`/api/forms/bases/${baseId}/tables`, { withCredentials: true });
      setTables(res.data.tables);
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const loadFields = async (baseId, tableId) => {
    try {
      const res = await axios.get(`/api/forms/bases/${baseId}/tables/${tableId}/fields`, { withCredentials: true });
      setAvailableFields(res.data.fields);
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const handleBaseChange = async (e) => {
    const baseId = e.target.value;
    setSelectedBase(baseId);
    setSelectedTable('');
    setAvailableFields([]);
    setQuestions([]);
    
    if (baseId) {
      await loadTables(baseId);
    }
  };

  const handleTableChange = async (e) => {
    const tableId = e.target.value;
    setSelectedTable(tableId);
    setQuestions([]);
    
    if (tableId && selectedBase) {
      await loadFields(selectedBase, tableId);
    }
  };

  const addQuestion = (field) => {
    const questionKey = `q_${Date.now()}`;
    const newQuestion = {
      fieldKey: questionKey,
      airtableFieldId: field.id,
      displayLabel: field.name,
      fieldType: field.type,
      isRequired: false,
      selectOptions: field.options?.choices?.map(c => c.name) || [],
      visibilityRules: null,
      fieldOrder: questions.length
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, updates) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addCondition = (questionIndex) => {
    const updated = [...questions];
    if (!updated[questionIndex].visibilityRules) {
      updated[questionIndex].visibilityRules = {
        operator: 'AND',
        conditions: []
      };
    }
    updated[questionIndex].visibilityRules.conditions.push({
      fieldKey: '',
      comparisonType: 'is_equal',
      expectedValue: ''
    });
    setQuestions(updated);
  };

  const updateCondition = (questionIndex, conditionIndex, updates) => {
    let updated = [...questions];
    const mappedUpdates = {};
    if (updates.questionKey !== undefined) {
      mappedUpdates.fieldKey = updates.questionKey;
    }
    if (updates.operator !== undefined) {
      const operatorMap = {
        'equals': 'is_equal',
        'notEquals': 'not_equal',
        'contains': 'contains_text'
      };
      mappedUpdates.comparisonType = operatorMap[updates.operator] || updates.operator;
    }
    if (updates.value !== undefined) {
      mappedUpdates.expectedValue = updates.value;
    }
    
    updated[questionIndex].visibilityRules.conditions[conditionIndex] = {
      ...updated[questionIndex].visibilityRules.conditions[conditionIndex],
      ...mappedUpdates,
      ...updates
    };
    setQuestions(updated);
  };

  const removeCondition = (questionIndex, conditionIndex) => {
    const updated = [...questions];
    updated[questionIndex].visibilityRules.conditions = 
      updated[questionIndex].visibilityRules.conditions.filter((_, i) => i !== conditionIndex);
    
    if (updated[questionIndex].visibilityRules.conditions.length === 0) {
      updated[questionIndex].visibilityRules = null;
    }
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        formTitle: formName,
        formDescription: description,
        connectedBaseId: selectedBase,
        connectedTableId: selectedTable,
        formFields: questions
      };

      if (formId) {
        await axios.put(`/api/forms/${formId}`, data, { withCredentials: true });
      } else {
        await axios.post('/api/forms', data, { withCredentials: true });
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>{formId ? 'Edit Form' : 'Create New Form'}</h1>
      
      <form onSubmit={handleSubmit} className="form-builder">
        <div className="form-section">
          <label>Form Name *</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g., Contact Form"
          />
        </div>

        <div className="form-section">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows="3"
          />
        </div>

        <div className="form-section">
          <label>Select Airtable Base *</label>
          <select value={selectedBase} onChange={handleBaseChange} required>
            <option value="">-- Choose Base --</option>
            {bases.map(base => (
              <option key={base.id} value={base.id}>{base.name}</option>
            ))}
          </select>
        </div>

        {selectedBase && (
          <div className="form-section">
            <label>Select Table *</label>
            <select value={selectedTable} onChange={handleTableChange} required>
              <option value="">-- Choose Table --</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>{table.name}</option>
              ))}
            </select>
          </div>
        )}

        {availableFields.length > 0 && (
          <div className="form-section">
            <label>Available Fields</label>
            <div className="fields-list">
              {availableFields.map(field => (
                <div key={field.id} className="field-item">
                  <span>{field.name} ({field.type})</span>
                  <button 
                    type="button" 
                    onClick={() => addQuestion(field)}
                    className="btn-add-field"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {questions.length > 0 && (
          <div className="form-section">
            <h3>Form Questions</h3>
            {questions.map((q, index) => (
              <div key={q.fieldKey || q.questionKey} className="question-editor">
                <div className="question-header">
                  <h4>Question {index + 1}</h4>
                  <button 
                    type="button" 
                    onClick={() => removeQuestion(index)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>

                <div className="question-field">
                  <label>Label</label>
                  <input
                    type="text"
                    value={q.displayLabel || q.label}
                    onChange={(e) => updateQuestion(index, { displayLabel: e.target.value, label: e.target.value })}
                  />
                </div>

                <div className="question-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={q.isRequired || q.required}
                      onChange={(e) => updateQuestion(index, { isRequired: e.target.checked, required: e.target.checked })}
                    />
                    {' '}Required
                  </label>
                </div>

                <div className="question-field">
                  <label>Conditional Logic</label>
                  {q.visibilityRules && (
                    <div className="conditions-wrapper">
                      <select
                        value={q.visibilityRules.operator}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[index].visibilityRules.operator = e.target.value;
                          setQuestions(updated);
                        }}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>

                      {q.visibilityRules.conditions.map((cond, condIndex) => {
                        const displayFieldKey = cond.fieldKey || cond.questionKey || '';
                        const displayOperator = cond.comparisonType === 'is_equal' ? 'equals' :
                                               cond.comparisonType === 'not_equal' ? 'notEquals' :
                                               cond.comparisonType === 'contains_text' ? 'contains' :
                                               cond.operator || 'equals';
                        const displayValue = cond.expectedValue !== undefined ? cond.expectedValue : cond.value;
                        
                        return (
                          <div key={condIndex} className="condition-row">
                            <select
                              value={displayFieldKey}
                              onChange={(e) => updateCondition(index, condIndex, { questionKey: e.target.value, fieldKey: e.target.value })}
                            >
                              <option value="">-- Select Question --</option>
                              {questions.slice(0, index).map(prevQ => {
                                const prevKey = prevQ.fieldKey || prevQ.questionKey;
                                const prevLabel = prevQ.displayLabel || prevQ.label;
                                return (
                                  <option key={prevKey} value={prevKey}>
                                    {prevLabel}
                                  </option>
                                );
                              })}
                            </select>

                            <select
                              value={displayOperator}
                              onChange={(e) => updateCondition(index, condIndex, { operator: e.target.value })}
                            >
                              <option value="equals">equals</option>
                              <option value="notEquals">not equals</option>
                              <option value="contains">contains</option>
                            </select>

                            <input
                              type="text"
                              value={displayValue || ''}
                              onChange={(e) => updateCondition(index, condIndex, { value: e.target.value, expectedValue: e.target.value })}
                              placeholder="Value"
                            />

                            <button 
                              type="button"
                              onClick={() => removeCondition(index, condIndex)}
                              className="btn-remove-small"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <button 
                    type="button"
                    onClick={() => addCondition(index)}
                    className="btn-add-condition"
                  >
                    {q.visibilityRules ? '+ Add Condition' : '+ Add Conditional Logic'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading || questions.length === 0} className="primary">
            {loading ? 'Saving...' : (formId ? 'Update Form' : 'Create Form')}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormBuilder;
