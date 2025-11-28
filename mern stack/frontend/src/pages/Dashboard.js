import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const res = await axios.get('/api/forms', { withCredentials: true });
      setForms(res.data.forms);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (formId) => {
    if (!window.confirm('Delete this form?')) return;

    try {
      await axios.delete(`/api/forms/${formId}`, {
        withCredentials: true
      });
      setForms(forms.filter(f => f._id !== formId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete');
    }
  };

  if (loading) {
    return <div className="loading">Loading forms...</div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>My Forms</h1>
        <Link to="/forms/create" className="btn-create">
          + Create New Form
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <p>No forms yet. Create your first form!</p>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map(form => (
            <div key={form._id} className="form-card">
              <h3>{form.formTitle || form.name}</h3>
              {(form.formDescription || form.description) && (
                <p className="form-description">{form.formDescription || form.description}</p>
              )}
              <div className="form-meta">
                <span>{(form.formFields || form.questions || []).length} questions</span>
                <span>{new Date(form.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="form-actions">
                <Link to={`/form/${form._id}`} className="btn-view">
                  View
                </Link>
                <Link to={`/forms/${form._id}/responses`} className="btn-responses">
                  Responses
                </Link>
                <Link to={`/forms/${form._id}/edit`} className="btn-edit">
                  Edit
                </Link>
                <button 
                  onClick={() => deleteForm(form._id)} 
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
