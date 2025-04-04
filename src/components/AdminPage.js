import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { firestore } from '../firebase';
import { playButtonSound } from '../utils/sound';
import './AdminPage.css';

function AdminPage() {
  const [formData, setFormData] = useState({
    collection: 'keyIdeas',
    name: '',
    text: ''
  });
  const [items, setItems] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const isDevelopment = process.env.NODE_ENV === 'development';
  const auth = getAuth();

  useEffect(() => {
    // Check authentication state
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setIsAuthenticated(!!user);
      if (user) {
        try {
          // Force refresh the token to get the latest claims
          await user.getIdToken(true);
          // Get the ID token to check admin claim
          const idTokenResult = await user.getIdTokenResult();
          const hasAdminClaim = idTokenResult.claims.admin === true;
          console.log('User admin status:', hasAdminClaim);
          console.log('User claims:', idTokenResult.claims);
          setIsAdmin(hasAdminClaim);
          
          if (hasAdminClaim) {
            // Only fetch items if user is admin
            fetchItems(formData.collection);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setError('Error checking admin status. Please try logging in again.');
        }
      }
    });

    return () => unsubscribe();
  }, [auth, formData.collection]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      // Force refresh the token after login
      await userCredential.user.getIdToken(true);
      setSuccess('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error.message}`);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!loginForm.email) {
      setError("Please enter your email address");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, loginForm.email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error('Password reset error:', error);
      setError(`Password reset failed: ${error.message}`);
    }
  };

  const fetchItems = async (collectionName) => {
    setError(null);
    try {
      console.log(`Fetching items from collection: ${collectionName}`);
      const querySnapshot = await getDocs(collection(firestore, collectionName));
      console.log(`Fetched ${querySnapshot.docs.length} items`);
      const itemsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(itemsList);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError(`Error fetching items: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    playButtonSound();
    
    if (!formData.name.trim() || !formData.text.trim()) {
      setError("Name and text are required");
      return;
    }
    
    try {
      console.log(`Adding item to collection: ${formData.collection}`, formData);
      
      // Create the document data, adding a development flag if in development mode
      const docData = {
        name: formData.name,
        text: formData.text,
        devMode: isDevelopment
      };
      
      console.log('Document data:', docData);
      console.log('Current user:', auth.currentUser);
      if (auth.currentUser) {
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        console.log('Current user claims:', idTokenResult.claims);
      }
      
      const docRef = await addDoc(collection(firestore, formData.collection), docData);
      console.log(`Document added with ID: ${docRef.id}`);
      setFormData({ ...formData, name: '', text: '' });
      setSuccess(`Item "${formData.name}" added successfully!`);
      fetchItems(formData.collection);
    } catch (error) {
      console.error('Error adding document:', error);
      setError(`Error adding document: ${error.message}`);
    }
  };

  const initiateDelete = (item) => {
    playButtonSound();
    setDeleteConfirm(item);
  };

  const cancelDelete = () => {
    playButtonSound();
    setDeleteConfirm(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setError(null);
    setSuccess(null);
    playButtonSound();
    
    try {
      console.log(`Deleting document with ID: ${deleteConfirm.id} from collection: ${formData.collection}`);
      await deleteDoc(doc(firestore, formData.collection, deleteConfirm.id));
      console.log('Document successfully deleted');
      setSuccess(`Item "${deleteConfirm.name}" deleted successfully!`);
      fetchItems(formData.collection);
    } catch (error) {
      console.error('Error deleting document:', error);
      setError(`Error deleting document: ${error.message}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <h1 className="admin-title">Admin Login</h1>
        {error && (
          <div className="error-message" style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffeeee', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="success-message" style={{ color: 'green', margin: '10px 0', padding: '10px', backgroundColor: '#eeffee', borderRadius: '4px' }}>
            {success}
          </div>
        )}
        <form className="admin-form" onSubmit={handleLogin}>
          <input
            className="admin-input"
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
          />
          <input
            className="admin-input"
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button type="submit" className="btn submit-btn" style={{ flex: 1 }}>Login</button>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="btn"
              style={{ 
                flex: 1,
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Forgot Password
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <h1 className="admin-title">Access Denied</h1>
        <div className="error-message" style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffeeee', borderRadius: '4px' }}>
          Your account does not have admin privileges. Please contact the system administrator.
        </div>
        <button 
          onClick={() => auth.signOut()} 
          className="btn"
          style={{ 
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">Admin Panel</h1>
      
      {isDevelopment && (
        <div className="dev-mode-indicator" style={{ 
          backgroundColor: '#28a745', 
          color: 'white', 
          padding: '5px 10px', 
          borderRadius: '4px',
          marginBottom: '10px',
          display: 'inline-block'
        }}>
          Development Mode
        </div>
      )}
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={() => auth.signOut()} 
          className="btn"
          style={{ 
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
      
      {error && (
        <div className="error-message" style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffeeee', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message" style={{ color: 'green', margin: '10px 0', padding: '10px', backgroundColor: '#eeffee', borderRadius: '4px' }}>
          {success}
        </div>
      )}
      
      <form className="admin-form" onSubmit={handleSubmit}>
        <select
          className="admin-select"
          value={formData.collection}
          onChange={(e) => {
            playButtonSound();
            setFormData({ ...formData, collection: e.target.value });
          }}
        >
          <option value="keyIdeas">Key Ideas</option>
          <option value="conventions">Conventions</option>
          <option value="rules">Rules</option>
        </select>
        <input
          className="admin-input"
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <textarea
          className="admin-textarea"
          placeholder="Text (Use • at the start of a line for bullet points)"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
        />
        <button type="submit" className="btn submit-btn">Add Item</button>
      </form>
      <div className="items-list-container">
        <h2 className="items-title">Current Items</h2>
        <div className="items-grid">
          {items.length === 0 ? (
            <p>No items found in this collection.</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="item-card">
                <h3 className="item-name">{item.name}</h3>
                <button
                  className="btn delete-btn"
                  onClick={() => initiateDelete(item)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {deleteConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete "{deleteConfirm.name}"?</p>
            <p className="delete-warning">This action cannot be undone!</p>
            <div className="delete-modal-buttons">
              <button
                className="btn cancel-btn"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className="btn confirm-delete-btn"
                onClick={confirmDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;

