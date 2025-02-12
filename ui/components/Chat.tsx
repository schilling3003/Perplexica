'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import MessageInput from './MessageInput';
import { File, Message } from './ChatWindow';
import MessageBox from './MessageBox';
import MessageBoxLoading from './MessageBoxLoading';
import type { MessageInputProps } from '../types';

const Chat = ({
  loading,
  messages,
  sendMessage,
  messageAppeared,
  rewrite,
  fileIds,
  setFileIds,
  files,
  setFiles,
  focusMode = '',
  optimizationMode = '',
}: {
  messages: Message[];
  sendMessage: MessageInputProps['sendMessage'];
  loading: boolean;
  messageAppeared: boolean;
  rewrite: (messageId: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  focusMode?: string;
  optimizationMode?: string;
}) => {
  const [dividerWidth, setDividerWidth] = useState(0);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);
  const [currentFocusMode, setCurrentFocusMode] = useState(focusMode);

  useEffect(() => {
    const updateDividerWidth = () => {
      if (dividerRef.current) {
        setDividerWidth(dividerRef.current.scrollWidth);
      }
    };

    updateDividerWidth();
    window.addEventListener('resize', updateDividerWidth);
    return () => window.removeEventListener('resize', updateDividerWidth);
  }, []);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length === 1) {
      document.title = `${messages[0].content.substring(0, 30)} - Perplexica`;
    }
  }, [messages]);

  return (
    <div className="flex flex-col space-y-6 pt-8 pb-44 lg:pb-32 sm:mx-4 md:mx-8">
      <div className="flex justify-end space-x-2 mb-4">
        <button
          onClick={() => {
            console.log('Setting focus mode to webSearch');
            setCurrentFocusMode('webSearch');
          }}
          className={`px-4 py-2 rounded-lg ${
            currentFocusMode === 'webSearch'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Web Search
        </button>
        <button
          onClick={() => {
            console.log('Setting focus mode to restaurantSearch');
            setCurrentFocusMode('restaurantSearch');
          }}
          className={`px-4 py-2 rounded-lg ${
            currentFocusMode === 'restaurantSearch'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          Restaurant Search
        </button>
      </div>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        return (
          <Fragment key={msg.messageId}>
            <MessageBox
              message={msg}
              messageIndex={i}
              history={messages}
              loading={loading}
              dividerRef={isLast ? dividerRef : undefined}
              isLast={isLast}
              rewrite={rewrite}
              sendMessage={(message: string) => sendMessage({
                query: message,
                focusMode,
                optimizationMode,
                history: messages.map(m => [m.role === 'user' ? 'human' : 'assistant', m.content])
              })}
            />
            {!isLast && msg.role === 'assistant' && (
              <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
            )}
          </Fragment>
        );
      })}
      {loading && !messageAppeared && <MessageBoxLoading />}
      <div ref={messageEnd} className="h-0" />
      {dividerWidth > 0 && (
        <div
          className="bottom-24 lg:bottom-10 fixed z-40"
          style={{ width: dividerWidth }}
        >
          <MessageInput
            loading={loading}
            sendMessage={sendMessage}
            focusMode={currentFocusMode}
            optimizationMode={optimizationMode}
            messages={messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;
