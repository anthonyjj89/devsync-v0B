import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { debugLogger, DEBUG_LEVELS } from '../utils/debug';

const COMPONENT = 'ChatSettings';

function ChatSettings({ isOpen, onClose, onSave }) {
    const [koduPath, setKoduPath] = useState(localStorage.getItem('koduAI.path') || '');
    const [koduTaskFolder, setKoduTaskFolder] = useState(localStorage.getItem('koduAI.taskFolder') || '');
    const [projectPath, setProjectPath] = useState(localStorage.getItem('project.path') || '');
    const [enabledAIs] = useState({
        kodu: true,
        cline: false
    });

    useEffect(() => {
        if (isOpen) {
            setKoduPath(localStorage.getItem('koduAI.path') || '');
            setKoduTaskFolder(localStorage.getItem('koduAI.taskFolder') || '');
            setProjectPath(localStorage.getItem('project.path') || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Saving settings', {
            koduPath,
            koduTaskFolder,
            projectPath,
            enabledAIs
        });

        localStorage.setItem('koduAI.path', koduPath);
        localStorage.setItem('koduAI.taskFolder', koduTaskFolder);
        localStorage.setItem('project.path', projectPath);

        onSave({
            koduPath,
            koduTaskFolder,
            projectPath,
            enabledAIs,
            clinePath: '',
            clineTaskFolder: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Chat Settings</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Path
                        </label>
                        <input
                            type="text"
                            value={koduPath}
                            onChange={(e) => setKoduPath(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter base path"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Task Folder
                        </label>
                        <input
                            type="text"
                            value={koduTaskFolder}
                            onChange={(e) => setKoduTaskFolder(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter task folder"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project Path
                        </label>
                        <input
                            type="text"
                            value={projectPath}
                            onChange={(e) => setProjectPath(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter project path"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

ChatSettings.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired
};

export default ChatSettings;
