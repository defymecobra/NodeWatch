import React, { useState } from 'react';
import client from '../api/client';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const TestEventButton = ({ projectId, onEventSent }) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendTest = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setIsSending(true);
    try {
      const res = await client.post('/logs/test', { project_id: projectId });
      if (res.data.success) {
        if (res.data.logs && res.data.logs.length > 1) {
          toast.success(`Sent ${res.data.logs.length} test events across all projects!`, { duration: 3000 });
        } else {
          const log = res.data.log;
          toast.success(
            `Test event sent: [${log.level.toUpperCase()}] ${log.message.substring(0, 40)}...`,
            { duration: 3000 }
          );
        }
        if (onEventSent) onEventSent();
      }
    } catch (err) {
      toast.error('Failed to send test event');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSendTest}
      disabled={isSending}
      className="inline-flex items-center px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
    >
      <Zap className={`w-4 h-4 mr-2 ${isSending ? 'animate-pulse' : ''}`} />
      {isSending ? 'Sending...' : 'Send Test Event'}
    </button>
  );
};

export default TestEventButton;
