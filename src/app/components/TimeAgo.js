"use client";

import { useState, useEffect } from 'react';

export default function TimeAgo({ date }) {
  const [timeAgo, setTimeAgo] = useState('');
  
  useEffect(() => {
    const formatTimeAgo = (date) => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
      
      if (diffInSeconds < 60) {
        return 'just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      } else {
        return new Date(date).toLocaleDateString();
      }
    };
    
    setTimeAgo(formatTimeAgo(date));
    
    // Update time every minute for fresh comments
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(date));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [date]);
  
  return <span title={new Date(date).toLocaleString()}>{timeAgo}</span>;
}