import React, { FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import RestaurantSearchInput from './RestaurantSearchInput';
import type { MessageInputProps } from '../types';

const MessageInput: React.FC<MessageInputProps> = ({
  sendMessage,
  focusMode,
  optimizationMode,
  messages,
}) => {
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || !message.trim()) return;

    const currentMessage = message;
    setMessage('');
    setLoading(true);

    try {
      await sendMessage({
        query: currentMessage,
        focusMode,
        optimizationMode,
        history: messages.map((msg) => [
          msg.role === 'user' ? 'human' : 'assistant',
          msg.content,
        ]),
      });
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while sending the message');
    } finally {
      setLoading(false);
    }
  };

  if (focusMode === 'restaurantSearch') {
    return (
      <div className="flex flex-col w-full gap-2 px-4 py-2">
        <RestaurantSearchInput 
          onSubmit={async (restaurantName: string, address: string) => {
            setLoading(true);
            try {
              await sendMessage({
                query: JSON.stringify({ restaurantName, address }),
                focusMode,
                optimizationMode,
                history: messages.map((msg) => [
                  msg.role === 'user' ? 'human' : 'assistant',
                  msg.content,
                ]),
              });
            } catch (error) {
              console.error('Error:', error);
              setError('An error occurred while analyzing the restaurant');
            } finally {
              setLoading(false);
            }
          }}
        />
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full gap-2">
      <TextareaAutosize
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        maxRows={5}
        className="w-full p-2 rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary resize-none"
        disabled={loading}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
