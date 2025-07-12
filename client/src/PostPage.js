import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

function PostPage() {
  const { token, logout } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [editId, setEditId] = useState(null); // for editing

  const api = "https://communitypost-5g0u.onrender.com/api/links";

  // 🔄 Fetch links
  const fetchLinks = async () => {
    const res = await fetch(api);
    const data = await res.json();
    setLinks(data);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // ➕ Add or ✏️ Update link
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

  // 🗑️ Delete link
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

  // 📝 Load link for editing
  const handleEdit = (link) => {
    setEditId(link._id);
    setTitle(link.title);
    setDescription(link.description);
    setUrl(link.url);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>{editId ? "Edit Link" : "Post Link"}</h2>
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} /><br /><br />
      <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><br /><br />
      <input placeholder="Link URL" value={url} onChange={e => setUrl(e.target.value)} /><br /><br />
      <button onClick={handleSubmit}>{editId ? "Update" : "Post"}</button>
      {editId && <button onClick={() => { setEditId(null); setTitle(""); setDescription(""); setUrl(""); }}>Cancel Edit</button>}
      <button onClick={logout} style={{ marginLeft: "1rem" }}>Logout</button>

      <hr />

      <h3>All Links</h3>
      {links.length === 0 ? (
        <p>No links found.</p>
      ) : (
        <ul>
          {links.map(link => (
            <li key={link._id} style={{ marginBottom: "1rem" }}>
              <strong>{link.title}</strong><br />
              {link.description}<br />
              <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer">
                {link.url}
              </a><br />
              <button onClick={() => handleEdit(link)}>Edit</button>
              <button onClick={() => handleDelete(link._id)} style={{ marginLeft: "0.5rem", color: "red" }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PostPage;
