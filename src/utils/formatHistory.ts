import { BaseMessage } from '@langchain/core/messages';

export const formatChatHistoryAsString = (history: BaseMessage[]) => {
  return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join('\n');
};
