import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './FormViewer.css';

const shouldShowQuestion = (rules, answersSoFar) => {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return true;
  }

  const evaluateCondition = (condition, answers) => {
    const fieldKey = condition.fieldKey || condition.questionKey;
    const operator = condition.comparisonType || condition.operator;
    const expectedValue = condition.expectedValue !== undefined ? condition.expectedValue : condition.value;
    
    if (!fieldKey) return false;
    
    const answer = answers[fieldKey];

    if (answer === undefined || answer === null) {
      return false;
    }

    const normalizedOperator = operator === 'is_equal' ? 'equals' :
                               operator === 'not_equal' ? 'notEquals' :
                               operator === 'contains_text' ? 'contains' :
                               operator;

    switch (normalizedOperator) {
      case 'equals':
        if (Array.isArray(answer)) {
          return answer.includes(expectedValue);
        }
        return answer === expectedValue;

      case 'notEquals':
        if (Array.isArray(answer)) {
          return !answer.includes(expectedValue);
        }
        return answer !== expectedValue;

      case 'contains':
        if (typeof answer === 'string') {
          return answer.toLowerCase().includes(String(expectedValue).toLowerCase());
        }
        if (Array.isArray(answer)) {
          return answer.some(item => 
            String(item).toLowerCase().includes(String(expectedValue).toLowerCase())
          );
        }
        return false;

      default:
        return false;
    }
  };

  const results = rules.conditions.map(condition => 
    evaluateCondition(condition, answersSoFar)
  );

  const logic = rules.logic || rules.operator || 'AND';
  if (logic === 'OR') {
    return results.some(result => result === true);
  }

  return results.every(result => result === true);
};

function FormViewer() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      const res = await axios.get(`/api/forms/${formId}`);
      setForm(res.data.form);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (questionKey, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
    
    if (errors[questionKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionKey];
        return newErrors;
      });
    }
  };

  const handleMultiSelectChange = (questionKey, option, checked) => {
    setAnswers(prev => {
      let current = prev[questionKey] || [];
      if (checked) {
        return { ...prev, [questionKey]: [...current, option] };
      } else {
        return { ...prev, [questionKey]: current.filter(o => o !== option) };
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    const visibleAnswers = {};
    const formFields = form.formFields || form.questions || [];

    for (let field of formFields) {
      const rules = field.visibilityRules || field.conditionalRules;
      const isVisible = shouldShowQuestion(rules, visibleAnswers);

      if (!isVisible) continue;

      const fieldKey = field.fieldKey || field.questionKey;
      const answer = answers[fieldKey];

      if (field.isRequired && (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0))) {
        const label = field.displayLabel || field.label;
        newErrors[fieldKey] = `${label} is required`;
      } else if (answer !== undefined && answer !== null && answer !== '') {
        visibleAnswers[fieldKey] = answer;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      await axios.post('/api/responses/submit', {
        formId: form._id,
        answers
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading form...</div>;
  }

  if (!form) {
    return <div className="container">Form not found</div>;
  }

  if (submitted) {
    return (
      <div className="container">
        <div className="success-message">
          <h2>✓ Submitted!</h2>
          <p>Thank you for your response.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="form-viewer">
        <h1>{form.formTitle || form.name}</h1>
        {(form.formDescription || form.description) && (
          <p className="form-desc">{form.formDescription || form.description}</p>
        )}

        <form onSubmit={handleSubmit}>
          {(form.formFields || form.questions || []).map(field => {
            const fieldKey = field.fieldKey || field.questionKey;
            const fieldType = field.fieldType || field.type;
            const rules = field.visibilityRules || field.conditionalRules;
            const isVisible = shouldShowQuestion(rules, answers);
            if (!isVisible) return null;

            return (
              <div key={fieldKey} className="form-question">
                <label>
                  {field.displayLabel || field.label}
                  {field.isRequired && <span className="required">*</span>}
                </label>

                {fieldType === 'singleLineText' && (
                  <input
                    type="text"
                    value={answers[fieldKey] || ''}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                  />
                )}

                {fieldType === 'multilineText' && (
                  <textarea
                    value={answers[fieldKey] || ''}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                    rows="4"
                  />
                )}

                {fieldType === 'singleSelect' && (
                  <select
                    value={answers[fieldKey] || ''}
                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {(field.selectOptions || field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {fieldType === 'multipleSelects' && (
                  <div className="checkbox-group">
                    {(field.selectOptions || field.options || []).map(opt => (
                      <label key={opt} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={(answers[fieldKey] || []).includes(opt)}
                          onChange={(e) => handleMultiSelectChange(fieldKey, opt, e.target.checked)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {fieldType === 'multipleAttachments' && (
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      console.log('File upload not fully implemented');
                    }}
                  />
                )}

                {errors[fieldKey] && (
                  <div className="error">{errors[fieldKey]}</div>
                )}
              </div>
            );
          })}

          <button type="submit" disabled={submitting} className="primary">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormViewer;
