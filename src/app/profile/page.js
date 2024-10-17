import React from 'react';
import ProfileHeader from './components/ProfileHeader';
import ProfileStats from './components/ProfileStats';
import ProfileBio from './components/ProfileBio';
import ProfileActionButtons from './components/ProfileActionButtons';
import styles from './ProfilePage.module.css';

export default function Profile() {
  return (
    <div className={styles.profileContainer}>
      <ProfileHeader />
      <ProfileActionButtons />
      <ProfileStats />
      <ProfileBio />
    </div>
  );
}
