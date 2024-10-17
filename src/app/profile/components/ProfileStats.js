import React from 'react';
import styles from '../ProfilePage.module.css';

const ProfileStats = () => {
  return (
    <div className={styles.statsSection}>
      <div className={styles.stat}>
        <strong>12</strong>
        <p>Followers</p>
      </div>
      <div className={styles.stat}>
        <strong>20</strong>
        <p>Following</p>
      </div>
      <div className={styles.stat}>
        <strong>05</strong>
        <p>Attended</p>
      </div>
      <div className={styles.stat}>
        <strong>xx</strong>
        <p>Hosted</p>
      </div>
    </div>
  );
};

export default ProfileStats;
