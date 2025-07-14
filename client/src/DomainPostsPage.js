import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './App.css';

function DomainPostsPage() {
  const { domainName } = useParams();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("https://communitypost-5g0u.onrender.com/api/links")
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(link => link.domain === domainName);
        setPosts(filtered);
      });
  }, [domainName]);

  const isFileLink = (url) =>
    url.startsWith("https://s3") || url.includes(".amazonaws.com");

  return (
    <div className="view-container">
      <h2 className="view-title">📌 {domainName} Posts</h2>
      {posts.length === 0 ? (
        <p>No posts found for this domain.</p>
      ) : (
        posts.map(link => (
          <div key={link._id} className="link-card">
            <h3>{link.title}</h3>
            <p>{link.description}</p>
            {isFileLink(link.url) ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" download>
                ⬇️ Download File
              </a>
            ) : (
              <a href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer">
                🔗 {link.url}
              </a>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default DomainPostsPage;
