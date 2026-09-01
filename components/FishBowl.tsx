import React, { useState, useRef, useEffect } from 'react';
import { FishBowlMessage, Role, User } from '../types';
import { Send, User as UserIcon, Shield, Waves, Info, Trash2, ShieldAlert, Reply, X } from 'lucide-react';

interface FishBowlProps {
  messages: FishBowlMessage[];
  currentUser: User;
  onPostMessage: (text: string, replyToId?: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export const FishBowl: React.FC<FishBowlProps> = ({ messages, currentUser, onPostMessage, onDeleteMessage }) => {
  const [newText, setNewText] = useState('');
  const [replyingTo, setReplyingTo] = useState<FishBowlMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = currentUser.role === Role.SuperAdmin;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Scroll to top since new messages are unshifted
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onPostMessage(newText, replyingTo?.id);
    setNewText('');
    setReplyingTo(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteMessage) {
      onDeleteMessage(id);
    }
  };

  const handleReplyClick = (msg: FishBowlMessage) => {
    if (msg.isDeleted) return;
    setReplyingTo(msg);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Anonymous Fish Bowl</h2>
            <p className="text-xs text-blue-100 opacity-80">Residents sharing thoughts freely</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          Live Feed
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-blue-50/50 px-4 py-2 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <Info className="w-3.5 h-3.5 text-blue-500" />
        <p className="text-[11px] text-blue-700 font-medium italic">
          Identity is hidden from other residents. Tap a message to reply.
        </p>
      </div>

      {/* Chat Window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f0f2f5] no-scrollbar flex flex-col-reverse"
      >
        {messages.map((msg) => {
          const parentMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
          const isOwn = msg.userId === currentUser.uid;

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isOwn ? 'items-end' : 'items-start'}`}
            >
              {/* Identity Header (Only for SuperAdmin or Own) */}
              <div className="flex items-center gap-2 mb-1 px-1">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {isSuperAdmin ? (
                      <span className="text-amber-600 font-black">{msg.userName} ({msg.wing}-{msg.apartmentNo})</span>
                    ) : (
                      isOwn ? 'You' : 'Anonymous'
                    )}
                 </span>
                 <span className="text-[9px] text-gray-300">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div 
                onClick={() => handleReplyClick(msg)}
                className={`relative max-w-[85%] md:max-w-[70%] p-3 rounded-2xl shadow-sm transition-all cursor-pointer hover:ring-2 hover:ring-blue-400/30 active:scale-[0.98] ${
                  isOwn 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                } ${msg.isDeleted ? 'bg-gray-100 text-gray-400' : ''}`}
              >
                {/* Reply Context */}
                {parentMsg && !msg.isDeleted && (
                  <div className={`mb-2 p-2 rounded-lg text-[11px] border-l-4 leading-snug truncate max-h-16 ${
                    isOwn ? 'bg-blue-700/50 border-white/50 text-blue-50' : 'bg-gray-100 border-blue-400 text-gray-600'
                  }`}>
                    <p className="font-bold opacity-70 mb-0.5">
                      {isSuperAdmin ? parentMsg.userName : 'Anonymous'}
                    </p>
                    {parentMsg.isDeleted ? 'Message deleted' : parentMsg.text}
                  </div>
                )}

                {msg.isDeleted ? (
                  <div className="flex items-center gap-2 italic text-sm">
                    <ShieldAlert className="w-4 h-4 opacity-50" />
                    <span>This message was removed.</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}

                {/* Bubble Actions */}
                <div className="absolute top-0 right-0 -mr-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 p-1">
                   {isSuperAdmin && !msg.isDeleted && (
                     <button 
                       onClick={(e) => handleDelete(msg.id, e)}
                       className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition shadow-sm"
                     >
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   )}
                   {!msg.isDeleted && (
                     <button 
                       onClick={() => handleReplyClick(msg)}
                       className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition shadow-sm"
                     >
                        <Reply className="w-3.5 h-3.5" />
                     </button>
                   )}
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
            <Waves className="w-16 h-16 mb-4 text-blue-500" />
            <p className="text-sm font-medium text-blue-900">The bowl is empty. Start a conversation!</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-3 shrink-0">
        {/* Reply Bar */}
        {replyingTo && (
          <div className="mb-2 p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
               <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Replying to {isSuperAdmin ? replyingTo.userName : 'Anonymous'}</p>
                  <p className="text-xs text-gray-500 truncate">{replyingTo.text}</p>
               </div>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 bg-gray-100 rounded-2xl p-2 flex items-end">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Share a thought..."
              className="flex-1 bg-transparent p-2 text-sm outline-none resize-none h-10 max-h-32 min-h-[40px] no-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:scale-95 text-white p-3 rounded-2xl transition shadow-lg active:scale-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};