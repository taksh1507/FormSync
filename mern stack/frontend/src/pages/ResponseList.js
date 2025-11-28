import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ResponseList.css';

function ResponseList() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    try {
      const [formRes, responsesRes] = await Promise.all([
        axios.get(`/api/forms/${formId}`, { withCredentials: true }),
        axios.get(`/api/responses/forms/${formId}`, { withCredentials: true })
      ]);

      setForm(formRes.data.form);
      setResponses(responsesRes.data.responses);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading responses...</div>;
  }

  if (!form) {
    return <div className="container">Form not found</div>;
  }

  return (
    <div className="container">
      <div className="response-header">
        <div>
          <h1>Responses for "{form.formTitle || form.name}"</h1>
          <p className="response-count">{responses.length} total responses</p>
        </div>
        <Link to="/dashboard" className="btn-back">
          ← Back to Dashboard
        </Link>
      </div>

      {responses.length === 0 ? (
        <div className="empty-state">
          <p>No responses yet.</p>
          <Link to={`/form/${formId}`}>View Form</Link>
        </div>
      ) : (
        <div className="responses-container">
          {responses.map(response => (
            <div key={response._id} className="response-card">
              <div className="response-meta">
                <span className="response-id">#{response._id.slice(-6)}</span>
                <span className="response-date">
                  {new Date(response.createdAt).toLocaleString()}
                </span>
                {response.isDeletedInAirtable && (
                  <span className="deleted-badge">Deleted in Airtable</span>
                )}
              </div>

              <div className="response-answers">
                {response.fieldResponses && Object.entries(response.fieldResponses).map(([key, value]) => {
                  const formFields = form.formFields || form.questions || [];
                  const field = formFields.find(f => 
                    (f.fieldKey || f.questionKey) === key
                  );
                  if (!field) return null;

                  const label = field.displayLabel || field.label || key;

                  return (
                    <div key={key} className="answer-item">
                      <strong>{label}:</strong>
                      <span>
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResponseList;
