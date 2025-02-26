export default function ActivityFeed() {
  // Mock activity data - replace with real data from your API
  const activities = [
    {
      id: 1,
      type: 'score',
      title: 'Scored Fury vs. Usyk',
      date: 'May 18, 2023',
      details: 'Scored 116-112 for Fury'
    },
    {
      id: 2,
      type: 'comment',
      title: 'Commented on "Canelo vs. Charlo Preview"',
      date: 'May 15, 2023',
      details: 'Great analysis! Looking forward to this fight.'
    },
    {
      id: 3,
      type: 'post',
      title: 'Created a new post',
      date: 'May 10, 2023',
      details: 'My thoughts on upcoming UFC 300 card'
    },
    {
      id: 4,
      type: 'event',
      title: 'Joined live scoring for Joshua vs. Wilder',
      date: 'May 5, 2023'
    }
  ];

  const getActivityIcon = (type) => {
    switch(type) {
      case 'score':
        return '📊';
      case 'comment':
        return '💬';
      case 'post':
        return '📝';
      case 'event':
        return '🎯';
      default:
        return '📌';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <p className="text-gray-500">No recent activity to show.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {activities.map(activity => (
            <li key={activity.id} className="py-4">
              <div className="flex items-start">
                <span className="text-2xl mr-3">{getActivityIcon(activity.type)}</span>
                <div>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-gray-500">{activity.date}</p>
                  {activity.details && (
                    <p className="text-gray-700 mt-1">{activity.details}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 