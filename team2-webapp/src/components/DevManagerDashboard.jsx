import { useState } from 'react';
import PropTypes from 'prop-types';
import MessageList from './MessageList';

const DevManagerDashboard = ({ messages = [] }) => {
  const [email, setEmail] = useState('');
  const [emailContent, setEmailContent] = useState('');

  const handleSendEmail = async () => {
    // TODO: Implement email sending functionality
    console.log('Sending email to:', email, 'Content:', emailContent);
    // Reset form
    setEmail('');
    setEmailContent('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-semibold">Dev Manager Dashboard</h1>
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

        {/* Email Panel */}
        <div className="w-80 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-100 p-3 border-b">
            <h2 className="font-semibold">Send Email</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Email Content
              </label>
              <textarea
                id="content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your email content..."
              />
            </div>
            <button
              onClick={handleSendEmail}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

DevManagerDashboard.propTypes = {
  messages: PropTypes.array
};

export default DevManagerDashboard;
