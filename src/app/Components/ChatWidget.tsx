'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface ChatWidgetProps {
  userId: string;
  token: string;
  conversationId: number;
}

interface IMessage {
  Id: number;
  ConversationId: number;
  SenderId: number;
  Text: string;
  MediaUrl: string | null;
  CreatedAt: string;
  IsRead: string;
}

interface IEmployee {
  Id: string;
  Name: string;
  Email: string;
  Role: string;
  ProfileImagePath: string;
}

export default function ChatWidget({ userId, token, conversationId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hubProxy, setHubProxy] = useState<any>(null);
  const [connection, setConnection] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 🔹 Store user info by Id (cache to avoid multiple API calls)
  const [userCache, setUserCache] = useState<Record<string, IEmployee>>({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // =======================
  // Scroll to bottom on new message
  // =======================
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // =======================
  // Fetch user info when needed
  // =======================
  const fetchUserInfo = async (senderId: number) => {
    if (userCache[senderId]) return; // already cached

    try {
      const response = await axios.get<IEmployee>(
        `https://localhost:44323/api/user/${senderId}`,
        { headers: { Authorization: `${token}` } }
      );

      setUserCache((prev) => ({
        ...prev,
        [senderId]: response.data,
      }));
    } catch (error) {
      console.error(`Error fetching user ${senderId}:`, error);
    }
  };

  // =======================
  // Init SignalR
  // =======================
  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(`Failed to load ${src}`);
        document.body.appendChild(script);
      });

    const initSignalR = async () => {
      try {
        await loadScript('/js/jquery.min.js');
        await loadScript('/js/jquery.signalR.js');
        await loadScript('https://localhost:44323/signalR/hubs');

        const $ = (window as any).$;
        const hubConn = $.hubConnection('https://localhost:44323/', { qs: { userId } });
        const ChatHub = hubConn.createHubProxy('ChatHub');

        ChatHub.off('ReceiveMessage');
        ChatHub.on('ReceiveMessage', (msg: any) => {
          setMessages((prev) => {
            if (msg.SenderId === parseInt(userId)) {
              return prev.map((m) =>
                m.SenderId === msg.SenderId &&
                m.Text === msg.Text &&
                m.ConversationId === msg.ConversationId
                  ? msg
                  : m
              );
            }
            const exists = prev.some((m) => m.Id === msg.Id);
            if (exists) return prev;
            return [...prev, msg];
          });

          // 🔹 Fetch sender info if not cached
          fetchUserInfo(msg.SenderId);
        });

        hubConn
          .start()
          .done(() => {
            console.log('✅ SignalR connected');
            setConnection(hubConn);
            setHubProxy(ChatHub);
            setIsConnected(true);

            ChatHub.invoke('GetHistory', conversationId, 0, 50)
              .done((history: any[]) => {
                setMessages(history);
                history.forEach((msg) => fetchUserInfo(msg.SenderId));
              })
              .fail((err: any) =>
                console.error('Failed to get history:', err, conversationId)
              );
          })
          .fail((err: any) => console.error('SignalR connection failed:', err));
      } catch (err) {
        console.error('SignalR setup error:', err);
      }
    };

    initSignalR();

    return () => {
      if (connection) connection.stop();
    };
  }, [userId, token, conversationId]);

  // =======================
  // Send Message
  // =======================
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (!hubProxy || !isConnected) {
      console.warn('⚠️ Cannot send: hub not ready yet');
      return;
    }

    const messageToSend = newMessage.trim();

    const tempMessage: IMessage = {
      Id: Date.now(),
      ConversationId: conversationId,
      SenderId: parseInt(userId),
      Text: messageToSend,
      MediaUrl: null,
      CreatedAt: new Date().toISOString(),
      IsRead: 'false',
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    hubProxy
      .invoke('SendMessage', conversationId, parseInt(userId), messageToSend, null)
      .done(() => console.log('Message sent successfully'))
      .fail((err: any) => {
        console.error('Error sending message:', err);
        setMessages((prev) => prev.filter((m) => m.Id !== tempMessage.Id));
      });
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  // =======================
  // Render
  // =======================
  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white shadow-lg rounded-lg flex flex-col">
      <div className="bg-purple-600 text-white p-2 flex justify-between rounded-t">
        <span>Chat</span>
      </div>

      <div className="flex-1 p-2 overflow-y-auto max-h-64">
        {messages.map((msg, i) => {
          const isMe = msg.SenderId === parseInt(userId);
          const senderName = isMe
            ? 'You'
            : userCache[msg.SenderId]?.Name || `User ${msg.SenderId}`;

          return (
            <div key={i} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`px-3 py-2 rounded-lg max-w-xs ${
                  isMe ? 'bg-purple-600 text-white rounded-br-none'
                       : 'bg-gray-200 text-black rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.Text}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{senderName}</span>
                  {msg.CreatedAt && (
                    <span className="text-[10px] text-gray-400 ml-2">
                      {formatTimestamp(msg.CreatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="flex border-t p-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded px-2"
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button
          onClick={handleSendMessage}
          className={`ml-2 px-2 rounded ${
            isConnected
              ? 'bg-purple-600 text-white'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
          disabled={!isConnected}
        >
          Send
        </button>
      </div>
    </div>
  );
}
