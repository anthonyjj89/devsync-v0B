import { useState } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'Sidebar';

const sections = [
  {
    title: 'AI Assistants',
    items: [
      { id: 'kodu', label: 'Kodu AI Dev', icon: '🤖' },
      { id: 'cline', label: 'Cline AI Dev', icon: '🦾' }
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'dev-manager', label: 'Dev Manager', icon: '👨‍💻' },
      { id: 'project-manager', label: 'Project Manager', icon: '📊' }
    ]
  },
  {
    title: 'Tools',
    items: [
      { id: 'files', label: 'Project Files', icon: '📁' }
    ]
  }
];

const Sidebar = ({ activeTab, onTabChange }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleTabClick = (tabId) => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Tab clicked', {
      tabId,
      previousTab: activeTab
    });
    onTabChange(tabId);
  };

  const toggleCollapse = () => {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Sidebar collapse toggled', {
      wasCollapsed: collapsed
    });
    setCollapsed(!collapsed);
  };

  return (
    <div 
      className={`
        bg-gray-800 
        text-white 
        transition-all 
        duration-300 
        ease-in-out
        flex 
        flex-col
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo Section */}
      <div className={`
        p-4 
        border-b 
        border-gray-700 
        flex 
        items-center 
        justify-center
        bg-gray-900
      `}>
        {collapsed ? (
          <div className="text-2xl font-bold text-blue-500">D</div>
        ) : (
          <div className="text-2xl font-bold">
            <span className="text-blue-500">Dev</span>
            <span className="text-gray-300">Sync</span>
          </div>
        )}
      </div>

      <button
        onClick={toggleCollapse}
        className="p-4 hover:bg-gray-700 text-gray-400 self-end"
      >
        {collapsed ? '→' : '←'}
      </button>

      <nav className="flex-1">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            {section.items.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className={`
                  w-full 
                  p-4 
                  flex 
                  items-center 
                  gap-3 
                  hover:bg-gray-700
                  transition-colors
                  ${activeTab === id ? 'bg-gray-700' : ''}
                  ${collapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <span className="text-xl">{icon}</span>
                {!collapsed && (
                  <span className="text-sm font-medium">{label}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 text-xs text-gray-400 border-t border-gray-700">
          DevSync v0.2.0
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  activeTab: PropTypes.oneOf(sections.flatMap(s => s.items.map(i => i.id))).isRequired,
  onTabChange: PropTypes.func.isRequired
};

export default Sidebar;
