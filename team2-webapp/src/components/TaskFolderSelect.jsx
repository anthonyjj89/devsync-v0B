import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'TaskFolderSelect';

function TaskFolderSelect({ currentFolder, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [recentFolders, setRecentFolders] = useState([]);

    useEffect(() => {
        // Load recent folders from localStorage
        const recent = JSON.parse(localStorage.getItem('recentTaskFolders') || '[]');
        setRecentFolders(recent);
    }, []);

    const handleSelect = (folder) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected task folder', { folder });
        
        // Update recent folders
        const recent = JSON.parse(localStorage.getItem('recentTaskFolders') || '[]');
        const updated = [folder, ...recent.filter(f => f !== folder)].slice(0, 5);
        localStorage.setItem('recentTaskFolders', JSON.stringify(updated));
        
        onSelect(folder);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-md"
            >
                <span>{currentFolder || 'Select Task Folder'}</span>
                <svg 
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-64 bg-white border rounded-md shadow-lg z-50">
                    <div className="py-1">
                        {recentFolders.length > 0 ? (
                            recentFolders.map((folder, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelect(folder)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                >
                                    {folder}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No recent folders
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

TaskFolderSelect.propTypes = {
    currentFolder: PropTypes.string,
    onSelect: PropTypes.func.isRequired
};

export default TaskFolderSelect;
