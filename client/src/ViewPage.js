import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function ViewPage() {
  const [domains, setDomains] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("https://communitypost-5g0u.onrender.com/api/domains")
      .then(res => res.json())
      .then(data => setDomains(data));
  }, []);

  return (
    <div className="view-container">
      <h2 className="view-title">📚 Explore Domains</h2>
      {domains.map(domain => (
        <div
          key={domain._id}
          className="link-card"
          style={{ cursor: "pointer", transition: "0.3s" }}
          onClick={() => navigate(`/domain/${encodeURIComponent(domain.name)}`)}
        >
          <h3>{domain.name}</h3>
          <p>Click to view resources in this domain</p>
        </div>
      ))}
    </div>
  );
}

export default ViewPage;
