import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  imageUrl?: string;
}

export default function ChatBox({ errandId, viewerRole = 'runner' }: { errandId: string, viewerRole?: 'buyer' | 'runner' }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chats', errandId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [errandId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chats', errandId, 'messages'), {
        text: newMessage,
        senderId: user?.uid || 'buyer',
        senderName: viewerRole === 'buyer' ? 'Buyer' : 'Runner',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Convert file to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Content = reader.result as string;

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              files: [
                {
                  name: file.name,
                  content: base64Content
                }
              ]
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            const imageUrl = data.results?.[0]?.url || data.url || data.secure_url || data.data?.url;
            
            if (imageUrl) {
              await addDoc(collection(db, 'chats', errandId, 'messages'), {
                text: '',
                imageUrl,
                senderId: user?.uid || 'buyer',
                senderName: viewerRole === 'buyer' ? 'Buyer' : 'Runner',
                createdAt: serverTimestamp()
              });
            }
          } else {
            console.error("Upload failed with status:", res.status);
          }
        } catch (error) {
          console.error("Error uploading image: ", error);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      
      reader.onerror = () => {
        console.error("Error reading file");
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file: ", error);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner mt-4">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 text-sm">
            Send a message to start verification...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = viewerRole === 'buyer' ? msg.senderName === 'Buyer' : msg.senderName !== 'Buyer';
            const timeString = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`}>
                <span className="text-[10px] text-slate-400 mb-1 px-1 font-medium">{msg.senderName}</span>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-nomba-yellow text-nomba-dark rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'}`}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="attached" className="w-full rounded-lg mb-2 object-cover" />
                  )}
                  {msg.text && <p>{msg.text}</p>}
                </div>
                {timeString && <span className="text-[9px] text-slate-400 mt-1 px-1">{timeString}</span>}
              </div>
            );
          })
        )}
        {isUploading && (
          <div className="flex flex-col items-end mb-2">
            <span className="text-[10px] text-slate-400 mb-1 px-1 font-medium">Uploading</span>
            <div className="max-w-[75%] px-4 py-2 rounded-2xl text-sm bg-nomba-yellow text-nomba-dark rounded-tr-none flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-nomba-dark border-t-transparent rounded-full animate-spin"></div>
              <span>Sending image...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`p-2 rounded-full transition-colors ${isUploading ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-nomba-dark hover:bg-slate-100'}`}
          title="Upload image"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <ImageIcon className="w-5 h-5" />
          )}
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-slate-100 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-nomba-yellow focus:bg-white transition-all text-sm"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="p-2 bg-nomba-dark text-nomba-yellow rounded-full hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
