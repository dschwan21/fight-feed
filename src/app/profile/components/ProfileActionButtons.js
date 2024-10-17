import React from 'react';
import styles from '../ProfilePage.module.css';

const ProfileActionButtons = () => {
  return (
    <div className={styles.actionButtons}>
      <button className={styles.followButton}>Follow</button>
      <button className={styles.messageButton}>💬</button>
    </div>
  );
};

export default ProfileActionButtons;
