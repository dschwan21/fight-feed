import React from 'react';
import styles from '../ProfilePage.module.css';

const ProfileBio = () => {
  return (
    <div className={styles.bioSection}>
      <h3 className={styles.bioText}>Bio</h3>
      <p className={styles.bioText}>Designer by Profession. Storyteller at heart.</p>
    </div>
  );
};

export default ProfileBio;
