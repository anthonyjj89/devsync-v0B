import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'TaskFolderSelect';

const AI_PATHS = {
    kodu: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/kodu-ai.claude-dev-experimental/tasks',
    cline: 'C:/Users/antho/AppData/Roaming/Code/User/globalStorage/cline-ai.cline-dev/tasks'
};

function TaskFolderSelect({ aiType, currentFolder, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [recentFolders, setRecentFolders] = useState([]);
    const [availableFolders, setAvailableFolders] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load recent folders
    useEffect(() => {
        try {
            const recentKey = `${aiType}AI.recentTaskFolders`;
            const recent = JSON.parse(localStorage.getItem(recentKey) || '[]');
            
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Loaded recent folders', {
                aiType,
                recentCount: recent.length,
                recentFolders: recent
            });
            
            setRecentFolders(recent);
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error loading recent folders', {
                aiType,
                error: error.message
            });
            setRecentFolders([]);
        }
    }, [aiType]);

    // Get base path for AI type
    const getBasePath = useCallback(() => {
        const storedPath = localStorage.getItem(`${aiType}AI.path`);
        const defaultPath = AI_PATHS[aiType];
        const basePath = storedPath || defaultPath;

        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Resolved base path', {
            aiType,
            storedPath,
            defaultPath,
            usedPath: basePath
        });

        return basePath;
    }, [aiType]);

    // Fetch available folders
    const fetchAvailableFolders = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const basePath = getBasePath();
            if (!basePath) {
                throw new Error('No base path configured');
            }

            const encodedPath = encodeURIComponent(basePath);
            
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Fetching folders', {
                aiType,
                basePath,
                encodedPath
            });

            const response = await fetch(
                `http://localhost:3002/api/get-subfolders?path=${encodedPath}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to get folders');
            }

            const folders = data.entries || [];
            setAvailableFolders(folders);
            
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Folders fetched successfully', {
                aiType,
                folderCount: folders.length,
                folders
            });

            // Validate current folder exists in available folders
            if (currentFolder && !folders.includes(currentFolder)) {
                debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Current folder not found in available folders', {
                    currentFolder,
                    availableFolders: folders
                });
            }
        } catch (error) {
            const errorMsg = 'Failed to load folders: ' + error.message;
            setError(errorMsg);
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error fetching folders', {
                aiType,
                error: error.message,
                stack: error.stack
            });
        } finally {
            setIsLoading(false);
        }
    }, [aiType, currentFolder, getBasePath]);

    // Fetch folders when dropdown opens
    useEffect(() => {
        if (isOpen) {
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Dropdown opened, fetching folders', {
                aiType,
                currentFolder
            });
            fetchAvailableFolders();
        }
    }, [isOpen, fetchAvailableFolders]);

    const handleSelect = useCallback((folder) => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Folder selection initiated', {
            aiType,
            selectedFolder: folder,
            currentFolder
        });

        if (!folder) {
            debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Attempted to select empty folder');
            return;
        }
        
        try {
            // Update recent folders for this AI
            const recentKey = `${aiType}AI.recentTaskFolders`;
            const recent = JSON.parse(localStorage.getItem(recentKey) || '[]');
            const updated = [folder, ...recent.filter(f => f !== folder)].slice(0, 5);
            
            localStorage.setItem(recentKey, JSON.stringify(updated));
            setRecentFolders(updated);
            
            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Recent folders updated', {
                aiType,
                updatedRecent: updated
            });
            
            onSelect(folder);
            setIsOpen(false);

            debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Folder selection completed', {
                aiType,
                selectedFolder: folder
            });
        } catch (error) {
            debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Error during folder selection', {
                aiType,
                folder,
                error: error.message
            });
        }
    }, [aiType, currentFolder, onSelect]);

    return (
        <div className="relative">
            <button
                onClick={() => {
                    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Dropdown toggle clicked', {
                        aiType,
                        currentState: isOpen,
                        newState: !isOpen
                    });
                    setIsOpen(!isOpen);
                }}
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
