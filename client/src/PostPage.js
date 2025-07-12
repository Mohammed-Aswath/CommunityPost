import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

function PostPage() {
  const { token, logout } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [editId, setEditId] = useState(null);

  const api = "https://communitypost-5g0u.onrender.com/api/links";

  const fetchLinks = async () => {
    const res = await fetch(api);
    const data = await res.json();
    setLinks(data);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSubmit = async () => {
    if (!title || !description || !url) {
      alert("Please fill all fields");
      return;
    }

    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `${api}/${editId}` : api;

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, url }),
    });

    if (res.ok) {
      alert(editId ? "Link updated" : "Link posted");
      setTitle('');
      setDescription('');
      setUrl('');
      setEditId(null);
      fetchLinks();
    } else {
      alert("Error while posting/updating");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;

    const res = await fetch(`${api}/${id}`, {
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
          style={{ marginBottom: "1rem", padding: "0.5rem", width: "100%" }}
        />
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

      <div className="section-title" style={{ marginTop: "2rem" }}>📎 All Links</div>
      {links.length === 0 ? (
        <p>No links found.</p>
      ) : (
        links.map(link => (
          <div key={link._id} className="link-card">
            <h3>{link.title}</h3>
            <p>{link.description}</p>
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
