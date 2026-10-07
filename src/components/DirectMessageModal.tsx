import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Users, UserPlus, Send, Search, Check, Trash2, 
  Smile, Loader2, Sparkles, Circle, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { apiFetch } from '../services/api';

interface Friend {
  id: string;
  username: string;
  avatar: string;
  is_online: boolean;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

interface FriendRequest {
  id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_id: string;
  receiver_name: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface DirectMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  receiver_id: string;
  receiver_name: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface UserSearchResult {
  id: string | number;
  username: string;
  email?: string;
  avatar?: string;
  source: string;
}

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFriendId?: string | null;
}

const QUICK_EMOJIS = ['🍿', '❤️', '🔥', '👍', '😂', '🎉', '🙌', '😍', '👀', '✨'];

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  initialFriendId
}) => {
  const [activeTab, setActiveTab] = useState<'messages' | 'friends' | 'add'>('messages');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<FriendRequest[]>([]);
  const [requestsSent, setRequestsSent] = useState<FriendRequest[]>([]);
  
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Email-based Search states for MySQL database connection
  const [emailQuery, setEmailQuery] = useState('');
  const [emailSearchResult, setEmailSearchResult] = useState<{
    user: { id: string | number; username: string; email: string; avatar?: string };
    friendship_status: 'self' | 'accepted' | 'pending' | 'rejected' | 'none';
    request_id: number | null;
  } | null>(null);
  const [emailSearchLoading, setEmailSearchLoading] = useState(false);
  const [emailSearchError, setEmailSearchError] = useState<string | null>(null);
  const [emailSearchSuccess, setEmailSearchSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Email search API trigger
  const handleSearchByEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = emailQuery.trim().toLowerCase();
    if (!targetEmail) {
      setEmailSearchError('Please enter an email address.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setEmailSearchError('Please enter a valid email address.');
      return;
    }

    setEmailSearchLoading(true);
    setEmailSearchError(null);
    setEmailSearchResult(null);
    setEmailSearchSuccess(null);

    try {
      const res = await apiFetch(`/friends/search-email?email=${encodeURIComponent(targetEmail)}`);
      if (res && res.user) {
        setEmailSearchResult(res);
        setEmailSearchSuccess('User found');
      } else {
        setEmailSearchError('No registered account found');
      }
    } catch (err: any) {
      setEmailSearchError(err?.message || 'No registered account found');
    } finally {
      setEmailSearchLoading(false);
    }
  };

  // Send friend request to email search result user
  const handleSendEmailFriendRequest = async () => {
    if (!emailSearchResult) return;
    const { user } = emailSearchResult;

    try {
      const res = await apiFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target_id: user.id, target_username: user.username })
      });
      if (res && res.success) {
        setNotice({ text: 'Friend request sent', type: 'success' });
        setEmailSearchResult(prev => {
          if (!prev) return null;
          return {
            ...prev,
            friendship_status: 'pending'
          };
        });
        setEmailSearchSuccess('Friend request sent');
        fetchFriendsData(); // Refresh requests list in background
      }
    } catch (err: any) {
      setNotice({ text: err?.message || 'Failed to send request', type: 'error' });
    } finally {
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Auto scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Fetch friends and requests list
  const fetchFriendsData = async () => {
    try {
      const data = await apiFetch('/friends');
      if (data) {
        setFriends(data.friends || []);
        setRequestsReceived(data.requests_received || []);
        setRequestsSent(data.requests_sent || []);

        // If initialFriendId provided or friend selected, update activeFriend
        if (initialFriendId && !activeFriend) {
          const target = (data.friends || []).find((f: Friend) => String(f.id) === String(initialFriendId));
          if (target) {
            setActiveFriend(target);
            setActiveTab('messages');
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch friends', e);
    }
  };

  // Fetch thread messages for active friend
  const fetchMessages = async (friendId: string) => {
    try {
      const data = await apiFetch(`/messages/${friendId}`);
      if (data && data.messages) {
        setMessages(data.messages);
        scrollToBottom(false);
      }
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  };

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchFriendsData().finally(() => setLoading(false));
    }
  }, [isOpen, initialFriendId]);

  // Synchronized polling when active friend chat is open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchFriendsData();
      if (activeFriend) {
        fetchMessages(activeFriend.id);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, activeFriend]);

  // When active friend changes, load messages immediately
  useEffect(() => {
    if (activeFriend) {
      fetchMessages(activeFriend.id);
      // Mark as read in local state
      setFriends(prev => prev.map(f => f.id === activeFriend.id ? { ...f, unread_count: 0 } : f));
    }
  }, [activeFriend]);

  // User Search for adding friends
  useEffect(() => {
    if (activeTab !== 'add') return;
    
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await apiFetch(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeFriend || !inputMessage.trim() || sending) return;

    const bodyText = inputMessage.trim();
    setInputMessage('');
    setShowEmojiPicker(false);
    setSending(true);

    // Optimistic UI message
    const tempMsg: DirectMessage = {
      id: Date.now(),
      sender_id: 'me',
      sender_name: 'You',
      sender_avatar: '🍿',
      receiver_id: activeFriend.id,
      receiver_name: activeFriend.username,
      body: bodyText,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await apiFetch(`/messages/${activeFriend.id}`, {
        method: 'POST',
        body: JSON.stringify({ body: bodyText })
      });
      if (res && res.message) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.message : m));
      }
    } catch (err: any) {
      setNotice({ text: err?.message || 'Failed to send message', type: 'error' });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const handleSendFriendRequest = async (targetId?: string | number, targetUsername?: string) => {
    try {
      const res = await apiFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target_id: targetId, target_username: targetUsername })
      });
      if (res && res.message) {
        setNotice({ text: res.message, type: 'success' });
        fetchFriendsData();
      }
    } catch (err: any) {
      setNotice({ text: err?.message || 'Failed to send request', type: 'error' });
    } finally {
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleRespondRequest = async (requestId: number, action: 'accept' | 'decline') => {
    try {
      const res = await apiFetch('/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, action })
      });
      if (res && res.message) {
        setNotice({ text: res.message, type: 'success' });
        fetchFriendsData();
      }
    } catch (err: any) {
      setNotice({ text: err?.message || 'Failed to respond to request', type: 'error' });
    } finally {
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      await apiFetch(`/friends/${friendId}`, { method: 'DELETE' });
      if (activeFriend?.id === friendId) setActiveFriend(null);
      fetchFriendsData();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const totalUnread = friends.reduce((sum, f) => sum + (f.unread_count || 0), 0) + requestsReceived.length;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[90vh] max-h-[720px] bg-[#0A1428] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row cursor-default"
      >
        {/* Global Persistent Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-50 p-2 text-slate-400 hover:text-white bg-black/60 hover:bg-rose-500/20 hover:border-rose-500/40 rounded-2xl transition-all border border-white/10 cursor-pointer shadow-xl group flex items-center gap-1 text-xs font-bold"
          title="Close Direct Messages"
        >
          <X className="w-4 h-4 text-slate-300 group-hover:text-rose-300" />
          <span className="hidden sm:inline text-[11px] text-slate-400 group-hover:text-rose-200">Close</span>
        </button>

        {/* Notice Toast */}
        {notice && (
          <div className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 border flex items-center gap-2",
            notice.type === 'success' 
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-900/50" 
              : "bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-900/50"
          )}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{notice.text}</span>
          </div>
        )}

        {/* Left / Sidebar Navigation Panel */}
        <div className={cn(
          "w-full md:w-80 bg-[#050A14] border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0",
          activeFriend && "hidden md:flex"
        )}>
          {/* Modal Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                <MessageSquare className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  Direct Messages
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px]">
                      {totalUnread}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">Connect & Chat with Friends</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('add')}
                className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/30 text-cyan-300 hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Add Friend by Email"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Add Friend</span>
              </button>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors md:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-2 gap-1 border-b border-white/5 bg-black/40">
            <button
              onClick={() => setActiveTab('messages')}
              className={cn(
                "flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'messages' 
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,245,255,0.3)] font-extrabold" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={cn(
                "flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative cursor-pointer",
                activeTab === 'friends' 
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,245,255,0.3)] font-extrabold" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends</span>
              {requestsReceived.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-2 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={cn(
                "flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'add' 
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,245,255,0.3)] font-extrabold" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Sidebar Tab Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs">Loading connections...</span>
              </div>
            ) : activeTab === 'messages' ? (
              friends.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400">No friends added yet.</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Add Friends Now
                  </button>
                </div>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend.id}
                    onClick={() => setActiveFriend(friend)}
                    className={cn(
                      "group p-3 rounded-2xl cursor-pointer transition-all border flex items-center gap-3 relative",
                      activeFriend?.id === friend.id 
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_15px_rgba(0,245,255,0.1)]" 
                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-lg shadow-inner">
                        {friend.avatar || '🍿'}
                      </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050A14]",
                        friend.is_online ? "bg-emerald-400" : "bg-slate-500"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-white truncate group-hover:text-cyan-300">
                          {friend.username}
                        </span>
                        {friend.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black font-black text-[10px] animate-pulse">
                            {friend.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {friend.last_message || (friend.is_online ? 'Online now' : 'Tap to start chat')}
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === 'friends' ? (
              <div className="space-y-4 p-1">
                {/* Pending Requests Section */}
                {requestsReceived.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-amber-400 tracking-wider uppercase px-2">
                      Pending Requests ({requestsReceived.length})
                    </span>
                    {requestsReceived.map(req => (
                      <div key={req.id} className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{req.sender_avatar || '🍿'}</span>
                          <span className="text-xs font-bold text-white truncate">{req.sender_name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleRespondRequest(req.id, 'accept')}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Accept Request"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRespondRequest(req.id, 'decline')}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Decline Request"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Friends */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase px-2">
                    My Friends ({friends.length})
                  </span>
                  {friends.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-2">No friends yet.</p>
                  ) : (
                    friends.map(friend => (
                      <div key={friend.id} className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg">{friend.avatar || '🍿'}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{friend.username}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Circle className={cn("w-2 h-2 fill-current", friend.is_online ? "text-emerald-400" : "text-slate-500")} />
                              {friend.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setActiveFriend(friend);
                              setActiveTab('messages');
                            }}
                            className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black rounded-lg transition-all cursor-pointer"
                            title="Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                            title="Remove Friend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Add Friend Tab */
              <div className="space-y-4 p-1">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Add Friend by Email</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Connect with friends by searching their exact registered email address on the secure database.
                  </p>

                  <form onSubmit={handleSearchByEmail} className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="Enter registered email address..."
                        value={emailQuery}
                        onChange={(e) => setEmailQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={emailSearchLoading}
                      className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-1 shrink-0"
                    >
                      {emailSearchLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Search</span>
                      )}
                    </button>
                  </form>

                  {/* Feedback Status / Alerts */}
                  {emailSearchLoading && (
                    <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span className="text-xs">Searching secure database...</span>
                    </div>
                  )}

                  {emailSearchError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <X className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{emailSearchError}</span>
                    </div>
                  )}

                  {emailSearchSuccess && emailSearchResult && (
                    <div className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[11px] rounded-lg inline-flex items-center gap-1 font-bold">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{emailSearchSuccess}</span>
                    </div>
                  )}

                  {/* Search Result Card */}
                  {emailSearchResult && (
                    <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-cyan-500/20 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-inner">
                          {emailSearchResult.user.avatar || '🍿'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block truncate">
                            {emailSearchResult.user.username}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {emailSearchResult.user.email}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-medium">Friendship Status:</span>
                        
                        {emailSearchResult.friendship_status === 'self' ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                            You
                          </span>
                        ) : emailSearchResult.friendship_status === 'accepted' ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                            Already Friends
                          </span>
                        ) : emailSearchResult.friendship_status === 'pending' ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                            Request Pending
                          </span>
                        ) : (
                          <button
                            onClick={handleSendEmailFriendRequest}
                            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 animate-pulse"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search by Username / Recent Room Members Section (Optional fallback list for local ease of access) */}
                <div className="space-y-2.5 pt-1">
                  <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase px-2">
                    Or Search Username
                  </span>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>

                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span className="text-xs text-slate-500">Searching...</span>
                    </div>
                  ) : searchResults.length > 0 && (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                      {searchResults.map(userItem => {
                        const isAlreadyFriend = friends.some(f => String(f.id) === String(userItem.id));
                        const isRequested = requestsSent.some(r => String(r.receiver_id) === String(userItem.id));

                        return (
                          <div key={userItem.id} className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm shrink-0">{userItem.avatar || '🍿'}</span>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate">{userItem.username}</span>
                                <span className="text-[9px] text-slate-400 capitalize">{userItem.source}</span>
                              </div>
                            </div>

                            {isAlreadyFriend ? (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                Already Friends
                              </span>
                            ) : isRequested ? (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                                Request Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendFriendRequest(userItem.id, userItem.username)}
                                className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <UserPlus className="w-2.5 h-2.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right / Main Direct Messaging Chat Canvas */}
        <div className="flex-1 flex flex-col bg-[#0A1428] relative min-w-0">
          {activeFriend ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-white/10 bg-[#050A14]/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveFriend(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 md:hidden cursor-pointer"
                  >
                    ←
                  </button>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-lg shadow-md">
                      {activeFriend.avatar || '🍿'}
                    </div>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A1428]",
                      activeFriend.is_online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                      {activeFriend.username}
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-full", activeFriend.is_online ? "bg-emerald-400" : "bg-slate-500")} />
                      {activeFriend.is_online ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors hidden md:block cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scrollable Container */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gradient-to-b from-black/20 to-black/40"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">Start your conversation with {activeFriend.username}!</p>
                    <p className="text-[11px] text-slate-500">Messages are synced across devices in real-time.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = String(msg.sender_id) !== String(activeFriend.id);

                    return (
                      <div
                        key={msg.id || idx}
                        className={cn(
                          "flex gap-2.5 max-w-[85%] sm:max-w-[75%] animate-in fade-in slide-in-from-bottom-1",
                          isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                        )}
                      >
                        <div className="w-7 h-7 rounded-xl bg-cyan-950 border border-white/10 flex items-center justify-center text-xs shrink-0 self-end shadow">
                          {msg.sender_avatar || (isMe ? '🍿' : activeFriend.avatar || '🍿')}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div
                            className={cn(
                              "p-3 rounded-2xl text-xs leading-relaxed shadow-lg break-words",
                              isMe 
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold rounded-br-none shadow-[0_0_15px_rgba(0,245,255,0.2)]" 
                                : "bg-white/10 border border-white/10 text-slate-100 rounded-bl-none backdrop-blur-md"
                            )}
                          >
                            {msg.body}
                          </div>
                          <span className={cn(
                            "text-[9px] text-slate-500 block px-1",
                            isMe ? "text-right" : "text-left"
                          )}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Emoji Quick Picker Bar */}
              {showEmojiPicker && (
                <div className="p-2 border-t border-white/10 bg-[#050A14] flex items-center gap-1 overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setInputMessage(prev => prev + emoji)}
                      className="p-1.5 hover:bg-white/10 rounded-xl text-lg transition-transform active:scale-125 cursor-pointer shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <form 
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-white/10 bg-[#050A14] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  title="Emoji Reactions"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder={`Message ${activeFriend.username}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className={cn(
                    "p-2.5 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center cursor-pointer",
                    inputMessage.trim() && !sending
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,245,255,0.4)] active:scale-95"
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  )}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-base font-extrabold text-white">Select a Chat or Add a Friend</h3>
                <p className="text-xs text-slate-400">
                  Choose a friend from the left panel to start a direct chat, or send friend requests to start messaging!
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer hidden md:block"
              >
                Close Window
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
