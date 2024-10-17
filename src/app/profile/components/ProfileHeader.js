import React from 'react';
import styles from '../ProfilePage.module.css';

const ProfileHeader = () => {
  return (
    <div className={styles.profileHeader}>
      <img
        src="/path/to/profile-picture.jpg"
        alt="Profile"
        className={styles.profilePicture}
      />
      <div className={styles.profileInfo}>
        <h1>James Bailey <span className={styles.verifiedIcon}>✔️</span></h1>
        <p className={styles.profileTitle}>Product Manager</p>
      </div>
      <div className={styles.settingsIcon}>
        <span>⚙️</span>
      </div>
    </div>
  );
};

export default ProfileHeader;
