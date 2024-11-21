import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'TaskFolderSelect';

function TaskFolderSelect({ aiType, currentFolder, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [recentFolders, setRecentFolders] = useState([]);
    const [availableFolders, setAvailableFolders] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load recent folders from localStorage based on AI type
        const recent = JSON.parse(localStorage.getItem(`${aiType}AI.recentTaskFolders`) || '[]');
        setRecentFolders(recent);
    }, [aiType]);

    useEffect(() => {
        if (isOpen) {
            fetchAvailableFolders();
        }
    }, [isOpen]);

    const fetchAvailableFolders = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const basePath = aiType === 'kodu' 
                ? 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks'
                : 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/cline-ai.cline-dev/tasks';

            const encodedPath = encodeURIComponent(basePath);
            const response = await fetch(`http://localhost:3002/api/get-subfolders?path=${encodedPath}`, {
                credentials: 'include'
            });

            debugLogger.log(DEBUG_LEVELS.DEBUG, COMPONENT, 'Folders response received', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get folders');
            }

            setAvailableFolders(data.entries || []);
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Folders fetched successfully', {
                aiType,
                folderCount: data.entries?.length
            });
        } catch (error) {
            setError('Failed to load subfolders: ' + error.message);
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error fetching folders', {
                aiType,
                error: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (folder) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Selected task folder', {
            aiType,
            folder
        });
        
        // Update recent folders for this AI
        const recent = JSON.parse(localStorage.getItem(`${aiType}AI.recentTaskFolders`) || '[]');
        const updated = [folder, ...recent.filter(f => f !== folder)].slice(0, 5);
        localStorage.setItem(`${aiType}AI.recentTaskFolders`, JSON.stringify(updated));
        setRecentFolders(updated);
        
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
                    {error && (
                        <div className="p-2 text-sm text-red-600 bg-red-50 border-b">
                            {error}
                        </div>
                    )}
                    <div className="py-1">
                        {isLoading ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                Loading folders...
                            </div>
                        ) : availableFolders.length > 0 ? (
                            <>
                                {availableFolders.map((folder, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSelect(folder)}
                                        className={`
                                            w-full px-4 py-2 text-left text-sm 
                                            hover:bg-gray-100
                                            ${currentFolder === folder ? 'bg-blue-50 text-blue-600' : ''}
                                        `}
                                    >
                                        {folder}
                                    </button>
                                ))}
                                {recentFolders.length > 0 && (
                                    <div className="border-t mt-1 pt-1">
                                        <div className="px-4 py-1 text-xs text-gray-500 uppercase">
                                            Recent
                                        </div>
                                        {recentFolders.map((folder, index) => (
                                            <button
                                                key={`recent-${index}`}
                                                onClick={() => handleSelect(folder)}
                                                className={`
                                                    w-full px-4 py-2 text-left text-sm 
                                                    hover:bg-gray-100
                                                    ${currentFolder === folder ? 'bg-blue-50 text-blue-600' : ''}
                                                `}
                                            >
                                                {folder}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No folders found for {aiType === 'kodu' ? 'Kodu' : 'Cline'} AI
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

TaskFolderSelect.propTypes = {
    aiType: PropTypes.oneOf(['kodu', 'cline']).isRequired,
    currentFolder: PropTypes.string,
    onSelect: PropTypes.func.isRequired
};

export default TaskFolderSelect;
