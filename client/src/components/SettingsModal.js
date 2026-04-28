import React, { useState, useRef, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import Avatar from './Avatar';

const SettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const { user, checkAuth } = useAuth();
  
  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(
    user?.profile_photo 
      ? (user.profile_photo.startsWith('http') 
          ? user.profile_photo 
          : `/api/${user.profile_photo}`)
      : ''
  );
  
  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Document upload
  const [selectedDocType, setSelectedDocType] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState('');
  const [documents, setDocuments] = useState([]);
  
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadDocuments = async () => {
    try {
      const response = await api.get('/users/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Load documents error:', error);
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('mobile', mobile);
      formData.append('email', email);
      if (profilePhoto) {
        formData.append('profile_photo', profilePhoto);
      }

      const response = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await checkAuth(); // Refresh user data
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
      
      // Update photo preview with new path
      if (response.data.user?.profile_photo) {
        const newPhotoUrl = response.data.user.profile_photo.startsWith('http')
          ? response.data.user.profile_photo
          : `${response.data.user.profile_photo}`;
        setPhotoPreview(newPhotoUrl);
      }
      
      alert('Profile updated successfully');
      setProfilePhoto(null); // Clear the file input
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      alert('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    
    if (!selectedDocType || !docFile) {
      alert('Please select document type and file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('doc_type', selectedDocType);
      formData.append('document', docFile);

      await api.post('/users/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Document uploaded successfully');
      setSelectedDocType('');
      setDocFile(null);
      setDocPreview('');
      loadDocuments();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (docType) => {
    const doc = documents.find(d => d.doc_type === docType);
    if (!doc) return { status: 'missing', label: 'Missing', color: 'var(--red)' };
    if (doc.is_verified) return { status: 'verified', label: 'Verified', color: 'var(--grn)' };
    return { status: 'pending', label: 'Pending', color: 'var(--ylw)' };
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '600px', maxWidth: '95vw' }}>
        <div className="modal-head">
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--bd)',
          padding: '0 24px',
          gap: '8px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              color: activeTab === 'profile' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'profile' ? '2px solid var(--grn)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-user" style={{ marginRight: '6px' }}></i>
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              color: activeTab === 'password' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'password' ? '2px solid var(--grn)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i>
            Password
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 16px',
              color: activeTab === 'documents' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'documents' ? '2px solid var(--grn)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-file-lines" style={{ marginRight: '6px' }}></i>
            Documents
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile}>
              {/* Profile Photo */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--grn)'
                      }}
                    />
                  ) : (
                    <Avatar user={user} size="xl" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: 'var(--grn)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <i className="fa-solid fa-camera"></i>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '8px' }}>
                  Click camera icon to change photo
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Full Name</label>
                <input
                  type="text"
                  className="finput"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Mobile Number</label>
                <input
                  type="tel"
                  className="finput"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Email Address</label>
                <input
                  type="email"
                  className="finput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div style={{
                background: 'var(--card)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
                  User ID
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--grn)',
                  fontFamily: 'monospace'
                }}>
                  {user?.user_id}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                  Role: {user?.role}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-p"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Current Password</label>
                <input
                  type="password"
                  className="finput"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">New Password</label>
                <input
                  type="password"
                  className="finput"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="flbl">Confirm New Password</label>
                <input
                  type="password"
                  className="finput"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-p"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <>
              {/* Document Status */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  Document Status
                </div>
                {['aadhaar', 'pan', 'police_verification', 'bank_passbook'].map(docType => {
                  const status = getDocumentStatus(docType);
                  const labels = {
                    aadhaar: 'Aadhaar Card',
                    pan: 'PAN Card',
                    police_verification: 'Police Verification',
                    bank_passbook: 'Bank Passbook'
                  };
                  
                  return (
                    <div
                      key={docType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--card)',
                        borderRadius: '8px',
                        marginBottom: '6px'
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{labels[docType]}</span>
                      <span
                        className={`badge badge-${status.status === 'verified' ? 'g' : status.status === 'pending' ? 'o' : 'r'}`}
                      >
                        <i className={`fa-solid fa-${status.status === 'verified' ? 'circle-check' : status.status === 'pending' ? 'clock' : 'xmark'}`} style={{ fontSize: '9px' }}></i>
                        {' '}{status.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Upload Document */}
              <form onSubmit={handleUploadDocument}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl">Document Type</label>
                  <select
                    className="fselect"
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    required
                  >
                    <option value="">Select document type...</option>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="police_verification">Police Verification</option>
                    <option value="bank_passbook">Bank Passbook</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl">Upload Document</label>
                  <div
                    onClick={() => docInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--bd)',
                      borderRadius: '10px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: docPreview ? 'var(--card)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    {docPreview ? (
                      <img
                        src={docPreview}
                        alt="Document preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '32px', color: 'var(--t3)', marginBottom: '8px' }}></i>
                        <div style={{ fontSize: '13px', color: 'var(--t2)' }}>
                          Click to select document image
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                          JPG, PNG or PDF (Max 5MB)
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleDocFileChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-p"
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
