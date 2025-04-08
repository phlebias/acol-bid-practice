import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase.js';
import './ContentPage.css';

function ContentPage() {
  const navigate = useNavigate();
  const { collection, id } = useParams();
  const [content, setContent] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(firestore, collection, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      }
    };

    fetchContent();
  }, [collection, id]);

  const formatText = (text) => {
    return text.split('\n').map((paragraph, index) => {
      if (paragraph.startsWith('• ')) {
        return <li key={index}>{paragraph.substring(2)}</li>;
      }
      return <p key={index}>{paragraph}</p>;
    });
  };

  return (
    <div className="content-container">
      <div className="content-paper">
        {content && (
          <>
            <h1 className="content-title">{content.name}</h1>
            <div className="content-text">
              {content?.text && formatText(content.text)}
            </div>
          </>
        )}
        <button 
          className="btn back-btn"
          onClick={() => navigate('/main')}
        >
          Back to Main Page
        </button>
      </div>
    </div>
  );
}

export default ContentPage;
