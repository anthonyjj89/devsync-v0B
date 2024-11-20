import { useState } from 'react';
import PropTypes from 'prop-types';
import MessageList from './MessageList';

const ProjectOwnerDashboard = ({ messages = [] }) => {
  const [projectGoal, setProjectGoal] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      // Add file to uploaded files list
      setUploadedFiles(prev => [...prev, {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        uploadedAt: new Date().toISOString()
      }]);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleGoalSubmit = () => {
    if (projectGoal.trim()) {
      console.log('New project goal:', projectGoal);
      setProjectGoal('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-semibold">Project Owner Dashboard</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Message Feed */}
        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-100 p-3 border-b">
            <h2 className="font-semibold">Message Feed</h2>
          </div>
          <div className="h-[calc(100%-3rem)]">
            <MessageList messages={messages} type="claude" />
          </div>
        </div>

        {/* Project Management Panel */}
        <div className="w-96 flex flex-col gap-4">
          {/* Goals Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-100 p-3 border-b">
              <h2 className="font-semibold">Project Goals</h2>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                className="w-full px-3 py-2 border rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project goals..."
              />
              <button
                onClick={handleGoalSubmit}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Update Goals
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-100 p-3 border-b">
              <h2 className="font-semibold">File Upload</h2>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`w-full py-2 px-4 rounded-md ${
                  selectedFile
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Upload File
              </button>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="text-sm bg-gray-50 p-2 rounded-md">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-gray-500">
                          {new Date(file.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectOwnerDashboard.propTypes = {
  messages: PropTypes.array
};

export default ProjectOwnerDashboard;
