import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { playButtonSound } from '../utils/sound';
import './MainPage.css';

function MainPage() {
  const navigate = useNavigate();
  const [keyIdeas, setKeyIdeas] = useState([]);
  const [conventions, setConventions] = useState([]);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchCollection = async (collectionName) => {
        try {
          const querySnapshot = await getDocs(collection(firestore, collectionName));
          return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error(`Error fetching ${collectionName}:`, error);
          return [];
        }
      };

      try {
        const [keyIdeasData, conventionsData, rulesData] = await Promise.all([
          fetchCollection('keyIdeas'),
          fetchCollection('conventions'),
          fetchCollection('rules')
        ]);

        setKeyIdeas(keyIdeasData);
        setConventions(conventionsData);
        setRules(rulesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleButtonClick = (path) => {
    playButtonSound();
    navigate(path);
  };

  const goToAdmin = () => {
    window.location.href = '/admin';
  };

  return (
    <div className="main-container">
      <div className="copyright-notice">
        <p>The summaries in the Rules section are based on the Blue Book and White Book published by the English Bridge Union (© The English Bridge Union Ltd, 2023). These summaries are unofficial and provided for informational purposes only. For the full and official rules, please refer to the EBU's website at <a href="http://www.ebu.co.uk" target="_blank" rel="noopener noreferrer">www.ebu.co.uk</a></p>
      </div>
      
      <div className="sections-grid">
        <section className="main-section">
          <h2 className="section-title">Key Ideas</h2>
          <div className="items-list">
            {keyIdeas.map(item => (
              <div key={item.id} className="item">
                <button 
                  className="btn item-btn"
                  onClick={() => handleButtonClick(`/content/keyIdeas/${item.id}`)}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="main-section">
          <h2 className="section-title">Conventions</h2>
          <div className="items-list">
            {conventions.map(item => (
              <div key={item.id} className="item">
                <button 
                  className="btn item-btn"
                  onClick={() => handleButtonClick(`/content/conventions/${item.id}`)}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="main-section">
          <h2 className="section-title">The Rules</h2>
          <div className="items-list">
            {rules.map(item => (
              <div key={item.id} className="item">
                <button 
                  className="btn item-btn"
                  onClick={() => handleButtonClick(`/content/rules/${item.id}`)}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Link to Bidding Practice */}
      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
        <button
          className="btn practice-btn"
          onClick={() => handleButtonClick('/bidding-practice')}
          style={{ backgroundColor: '#ffc107', color: '#212529' }} // Example styling
        >
          Go to Bidding Practice
        </button>
      </div>

      {/* Admin button for development mode */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          className="btn admin-btn"
          onClick={goToAdmin}
          style={{ marginTop: '20px', backgroundColor: '#28a745' }}
        >
          Go to Admin Page
        </button>
      )}
    </div>
  );
}

export default MainPage;
