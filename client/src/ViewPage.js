import React, { useEffect, useState } from 'react';
import './App.css'; // Ensure the styles are included

function ViewPage() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    fetch("https://communitypost-5g0u.onrender.com/api/links")
      .then(res => res.json())
      .then(data => setLinks(data));
  }, []);

  return (
    <div className="view-container">
      <h2 className="view-title">📌 Important Links</h2>
      {links.map(link => (
        <div key={link._id} className="link-card">
          <h3>{link.title}</h3>
          <p>{link.description}</p>
          <a
            href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 {link.url}
          </a>
        </div>
      ))}
    </div>
  );
}

export default ViewPage;
