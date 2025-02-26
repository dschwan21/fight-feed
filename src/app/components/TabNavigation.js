export default function TabNavigation({ tabs, activeTab, onChange }) {
  return (
    <div className="flex overflow-x-auto mb-6 bg-white rounded-lg shadow-md">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 