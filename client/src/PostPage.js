import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

function PostPage() {
  const { token, logout } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [links, setLinks] = useState([]);
  const [domains, setDomains] = useState([]);
  const [editId, setEditId] = useState(null);

  const [newDomain, setNewDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState(null);
  const [editingDomainName, setEditingDomainName] = useState('');

  const linkAPI = "https://communitypost-5g0u.onrender.com/api/links";
  const domainAPI = "https://communitypost-5g0u.onrender.com/api/domains";

  useEffect(() => {
    fetchLinks();
    fetchDomains();
  }, []);

  const fetchLinks = async () => {
    const res = await fetch(linkAPI);
    const data = await res.json();
    setLinks(data);
  };

  const fetchDomains = async () => {
    const res = await fetch(domainAPI);
    const data = await res.json();
    setDomains(data);
  };

  const handleSubmit = async () => {
    if (!title || !description || !url || !domain) {
      alert("Please fill all fields");
      return;
    }

    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `${linkAPI}/${editId}` : linkAPI;

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, url, domain }),
    });

    if (res.ok) {
      alert(editId ? "Link updated" : "Link posted");
      setTitle('');
      setDescription('');
      setUrl('');
      setDomain('');
      setEditId(null);
      fetchLinks();
    } else {
      alert("Error while posting/updating");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    const res = await fetch(`${linkAPI}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      alert("Link deleted");
      fetchLinks();
    } else {
      alert("Delete failed");
    }
  };

  const handleEdit = (link) => {
    setEditId(link._id);
    setTitle(link.title);
    setDescription(link.description);
    setUrl(link.url);
    setDomain(link.domain);
  };

  // DOMAIN HANDLERS
  const handleAddDomain = async () => {
    if (!newDomain) return;
    const res = await fetch(domainAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newDomain }),
    });
    if (res.ok) {
      setNewDomain('');
      fetchDomains();
    } else {
      alert("Error adding domain");
    }
  };

  const handleEditDomain = async (id) => {
    const res = await fetch(`${domainAPI}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: editingDomainName }),
    });
    if (res.ok) {
      setEditingDomain(null);
      setEditingDomainName('');
      fetchDomains();
    } else {
      alert("Error updating domain");
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!window.confirm("Delete this domain?")) return;
    const res = await fetch(`${domainAPI}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      fetchDomains();
    } else {
      alert("Error deleting domain");
    }
  };

  return (
    <div className="view-container">
      <div className="section-title">📌 {editId ? "Edit Link" : "Post Link"}</div>

      <div className="link-card" style={{ maxWidth: "500px" }}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ marginBottom: "0.75rem", padding: "0.5rem", width: "100%" }}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ marginBottom: "0.75rem", padding: "0.5rem", width: "100%" }}
        />
        <input
          type="text"
          placeholder="Link URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ marginBottom: "0.75rem", padding: "0.5rem", width: "100%" }}
        />
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          style={{ marginBottom: "1rem", padding: "0.5rem", width: "100%" }}
        >
          <option value="">Select Domain</option>
          {domains.map(d => (
            <option key={d._id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="header button" onClick={handleSubmit}>
            {editId ? "Update" : "Post"}
          </button>
          {editId && (
            <button
              className="header button"
              onClick={() => {
                setEditId(null);
                setTitle('');
                setDescription('');
                setUrl('');
                setDomain('');
              }}
            >
              Cancel
            </button>
          )}
          <button className="header button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: "2rem" }}>📂 Manage Domains</div>
      <div className="link-card" style={{ maxWidth: "500px" }}>
        <input
          type="text"
          placeholder="New Domain Name"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
        />
        <button className="header button" onClick={handleAddDomain}>Add Domain</button>

        {domains.map(d => (
          <div key={d._id} style={{ marginTop: "0.75rem" }}>
            {editingDomain === d._id ? (
              <>
                <input
                  type="text"
                  value={editingDomainName}
                  onChange={e => setEditingDomainName(e.target.value)}
                />
                <button className="header button" onClick={() => handleEditDomain(d._id)}>Save</button>
                <button className="header button" onClick={() => setEditingDomain(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span>{d.name}</span>
                <button className="header button" onClick={() => {
                  setEditingDomain(d._id);
                  setEditingDomainName(d.name);
                }}>Edit</button>
                <button
                  className="header button"
                  style={{ backgroundColor: "#a31212" }}
                  onClick={() => handleDeleteDomain(d._id)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: "2rem" }}>📎 All Links</div>
      {links.length === 0 ? (
        <p>No links found.</p>
      ) : (
        links.map(link => (
          <div key={link._id} className="link-card">
            <h3>{link.title}</h3>
            <p>{link.description}</p>
            <p><strong>Domain:</strong> {link.domain}</p>
            <a
              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.url}
            </a>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
              <button className="header button" onClick={() => handleEdit(link)}>Edit</button>
              <button
                className="header button"
                style={{ backgroundColor: "#a31212" }}
                onClick={() => handleDelete(link._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default PostPage;
