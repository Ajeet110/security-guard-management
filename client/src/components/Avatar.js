import React, { useState } from 'react';
import { avatarColor, initials } from '../utils/helpers';
import { getFileURL } from '../config/api';

const Avatar = ({ user, size = 'md', online = false, style = {} }) => {
  const [imageError, setImageError] = useState(false);

  // Handle undefined user
  if (!user) {
    return null;
  }

  const sizeClass = size === 'sm' ? 'avatar sm' : 
                    size === 'md' ? 'avatar md' : 
                    size === 'lg' ? 'avatar lg' : 
                    size === 'xl' ? 'avatar xl' : 'avatar';

  // Use getFileURL to get proper URL for profile photo
  const profilePhotoUrl = getFileURL(user.profile_photo);
  const showImage = profilePhotoUrl && !imageError;

  return (
    <div 
      className={`${sizeClass} ${online ? 'online' : ''}`}
      style={{
        background: showImage ? 'transparent' : avatarColor(user.name),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      {showImage ? (
        <img
          src={profilePhotoUrl}
          alt={user.name || 'User'}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: '50%',
          }}
        />
      ) : (
        initials(user.name)
      )}
    </div>
  );
};

export default Avatar;
