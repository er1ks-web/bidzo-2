import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/supabase'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, ArrowLeft, Trash2, ImagePlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function dedup(msgs) {
  const seen = new Set();
  return msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

export default function Messages() {
  const { t } = useI18n();
  const params = new URLSearchParams(window.location.search);
  const messagesEndRef = useRef(null);
  const userRef = useRef(null);

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(params.get('conv') || null);
  const [newMessage, setNewMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(params.get('to') || '');
  const [recipientName, setRecipientName] = useState(params.get('toName') || '');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  // Map email -> { username, avatar } from UserProfile
  const [profileMap, setProfileMap] = useState({});
  const isMobile = useIsMobile();

  // 1. Load user + messages on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.log(error)

      const authUser = data?.user
      if (!authUser) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .limit(1)

      if (profileError) console.log(profileError)

      const profile = Array.isArray(profileData) ? (profileData[0] || null) : null
      const u = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
        created_date: authUser.created_at,
      }

      userRef.current = u
      setUser(u)

      try {
        const [sent, received] = await Promise.all([
          base44.entities.Message.filter({ sender_email: u.email }, '-created_date', 200),
          base44.entities.Message.filter({ recipient_email: u.email }, '-created_date', 200),
        ])
        const all = dedup([...(sent || []), ...(received || [])])
        setMessages(all)

        // Collect unique other-party emails to resolve usernames
        const emails = new Set();
        all.forEach(m => {
          if (m.sender_email !== u.email) emails.add(m.sender_email);
          if (m.recipient_email !== u.email) emails.add(m.recipient_email);
        });
        resolveProfiles([...emails]);
      } catch (e) {
        console.log(e)
        setMessages([])
      }
    })().catch((e) => {
      console.log(e)
    })
  }, []);

  const resolveProfiles = async (emails) => {
    if (!emails.length) return;
    const results = await Promise.all(
      emails.map(e => base44.entities.UserProfile.filter({ user_email: e }).catch(() => []))
    );
    const map = {};
    results.forEach((res, i) => {
      const p = res[0];
      if (p) map[emails[i]] = { username: p.username, avatar: p.profile_picture_url };
    });
    setProfileMap(prev => ({ ...prev, ...map }));
  };

  const getDisplayName = (email, fallbackName) => {
    if (profileMap[email]?.username) return profileMap[email].username;
    if (fallbackName && !fallbackName.includes('@')) return fallbackName;
    return email?.split('@')[0] || 'User';
  };

  const getAvatar = (email) => profileMap[email]?.avatar || null;

  // 2. Subscribe to ALL message changes
  useEffect(() => {
    const unsub = base44.entities.Message.subscribe((event) => {
      const u = userRef.current;
      if (!u) return;
      const msg = event.data;

      if (event.type === 'create' && msg) {
        if (msg.sender_email !== u.email && msg.recipient_email !== u.email) return;
        setMessages(prev => dedup([...prev, msg]));
        // Resolve username if new contact
        const otherEmail = msg.sender_email !== u.email ? msg.sender_email : msg.recipient_email;
        resolveProfiles([otherEmail]);
      } else if (event.type === 'update' && msg) {
        if (msg.sender_email !== u.email && msg.recipient_email !== u.email) return;
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });
    return unsub;
  }, []);

  // 3. Mark messages as read when opening a conversation
  useEffect(() => {
    if (!activeConv || !userRef.current) return;
    setMessages(prev => {
      const toMark = prev.filter(
        m => m.conversation_id === activeConv && m.recipient_email === userRef.current.email && !m.read
      );
      toMark.forEach(m => base44.entities.Message.update(m.id, { read: true }));
      return prev.map(m => toMark.some(u => u.id === m.id) ? { ...m, read: true } : m);
    });
  }, [activeConv]);

  // Scroll to bottom
  const activeMessages = activeConv
    ? messages.filter(m => m.conversation_id === activeConv)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const lastActiveMessageId = activeMessages[activeMessages.length - 1]?.id;
  useEffect(() => {
    if (lastActiveMessageId && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTop = container.scrollHeight;
    }
  }, [lastActiveMessageId]);

  // Build conversation list
  const convMap = {};
  messages.forEach(msg => {
    if (!msg.conversation_id) return;
    const ex = convMap[msg.conversation_id];
    if (!ex || new Date(msg.created_date) > new Date(ex.lastMessage.created_date)) {
      const otherEmail = msg.sender_email === user?.email ? msg.recipient_email : msg.sender_email;
      const otherFallback = msg.sender_email === user?.email ? msg.recipient_name : msg.sender_name;
      convMap[msg.conversation_id] = {
        id: msg.conversation_id,
        otherParty: otherEmail,
        otherPartyName: getDisplayName(otherEmail, otherFallback),
        lastMessage: msg,
      };
    }
  });

  const convList = Object.values(convMap).sort(
    (a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
  );

  const unreadByConv = {};
  messages.forEach(m => {
    if (m.recipient_email === user?.email && !m.read) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] || 0) + 1;
    }
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !imageFile) return;
    if (!user || sending) return;
    setSending(true);

    let uploadedImageUrl = null;
    if (imageFile) {
      setUploadingImage(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      uploadedImageUrl = file_url;
      setUploadingImage(false);
    }

    const convId = activeConv || [user.email, recipientEmail].sort().join('_');
    const recipient = recipientEmail || convMap[activeConv]?.otherParty;
    const content = newMessage.trim();

    const optimistic = {
      id: `temp_${Date.now()}`,
      conversation_id: convId,
      sender_email: user.email,
      sender_name: user.full_name,
      recipient_email: recipient,
      content,
      image_url: uploadedImageUrl || imagePreview,
      read: false,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    clearImage();
    if (!activeConv) setActiveConv(convId);

    const created = await base44.entities.Message.create({
      conversation_id: convId,
      listing_id: params.get('listing') || '',
      sender_email: user.email,
      sender_name: user.full_name,
      recipient_email: recipient,
      content,
      image_url: uploadedImageUrl || '',
      read: false,
    });

    setMessages(prev => dedup(prev.map(m => m.id === optimistic.id ? created : m)));
    setSending(false);
  };

  const handleDeleteChat = async (convId) => {
    const toDelete = messages.filter(m => m.conversation_id === convId);
    await Promise.all(toDelete.map(m => base44.entities.Message.delete(m.id).catch(() => {})));
    setMessages(prev => prev.filter(m => m.conversation_id !== convId));
    if (activeConv === convId) {
      setActiveConv(null);
      setRecipientEmail('');
      setRecipientName('');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const activeRecipientDisplay = getDisplayName(recipientEmail, recipientName);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-display font-bold mb-6">{t('messages.title')}</h1>

      <div className="bg-card rounded-xl border overflow-hidden h-[70vh] flex">
        {/* Conversation list */}
        <div className={cn(
          "w-full sm:w-80 border-r flex flex-col",
          isMobile
            ? (activeConv ? "hidden" : "flex")
            : "flex"
        )}>
          <div className="p-3 border-b">
            <p className="text-sm font-medium text-muted-foreground">{convList.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {t('messages.noMessages')}
              </div>
            ) : (
              convList.map(conv => {
                const unread = unreadByConv[conv.id] || 0;
                const displayName = getDisplayName(conv.otherParty, conv.otherPartyName);
                return (
                  <div key={conv.id} className="group relative">
                    <button
                      onClick={() => {
                        setActiveConv(conv.id);
                        setRecipientEmail(conv.otherParty);
                        setRecipientName(displayName);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left pr-10",
                        activeConv === conv.id && "bg-muted"
                      )}
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        {conv.otherParty === 'system@bidzo.app' ? (
                          <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-base">
                            🔔
                          </div>
                        ) : getAvatar(conv.otherParty) ? (
                          <img src={getAvatar(conv.otherParty)} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        {unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[9px] font-bold text-accent-foreground">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm truncate", unread > 0 ? "font-bold" : "font-medium")}>
                          {displayName}
                        </p>
                        <p className={cn("text-xs truncate", unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {conv.lastMessage.content || (conv.lastMessage.image_url ? '📷 Photo' : '')}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(conv.lastMessage.created_date), 'MMM d')}
                      </span>
                    </button>
                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete all messages with {displayName}. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDeleteChat(conv.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={cn(
          "flex-1 flex flex-col",
          isMobile
            ? (activeConv || recipientEmail ? "flex" : "hidden")
            : "flex"
        )}>
          {activeConv || recipientEmail ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b">
                <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => { setActiveConv(null); setRecipientEmail(''); setRecipientName(''); }}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {getAvatar(recipientEmail) ? (
                  <img src={getAvatar(recipientEmail)} alt={activeRecipientDisplay} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <Link
                  to={`/seller/${encodeURIComponent(recipientEmail)}`}
                  className="font-semibold text-sm hover:text-accent transition-colors flex-1"
                >
                  {activeRecipientDisplay}
                </Link>
                {activeConv && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all messages with {activeRecipientDisplay}. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDeleteChat(activeConv)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ overflowAnchor: 'none' }}>
                <AnimatePresence initial={false}>
                  {activeMessages.map((msg) => {
                    const isMine = msg.sender_email === user.email;
                    const isSystem = msg.sender_email === 'system@bidzo.app';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn("flex", isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start")}
                      >
                        {isSystem ? (
                          <div className="max-w-[85%] rounded-2xl text-sm bg-accent/10 border border-accent/30 px-4 py-3">
                            <p className="text-[10px] font-bold text-accent mb-1 uppercase tracking-wide">🔔 Bidzo Team</p>
                            <p className="text-foreground">{msg.content}</p>
                            {msg.listing_id && (
                              <Link
                                to={`/listing/${msg.listing_id}`}
                                className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:underline"
                              >
                                <span>→ View Listing</span>
                              </Link>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(msg.created_date), 'HH:mm')}</p>
                          </div>
                        ) : (
                          <div className={cn(
                            "max-w-[75%] rounded-2xl text-sm overflow-hidden",
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm",
                            msg._optimistic && "opacity-60"
                          )}>
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                className="max-w-full max-h-60 object-cover w-full"
                              />
                            )}
                            <div className="px-4 py-2.5">
                              {msg.content && <p>{msg.content}</p>}
                              <p className={cn(
                                "text-[10px] mt-1",
                                isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.created_date), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {recipientEmail === 'system@bidzo.app' ? (
                <div className="border-t p-3 text-center text-xs text-muted-foreground">
                  This is a notifications channel from Bidzo Team — you cannot reply here.
                </div>
              ) : <div className="border-t">
                {imagePreview && (
                  <div className="px-4 pt-3 flex items-start gap-2">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border" />
                      <button
                        onClick={clearImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="p-4 flex gap-2 items-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <ImagePlus className="w-5 h-5" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={t('messages.typeMessage')}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    disabled={sending || uploadingImage || (!newMessage.trim() && !imageFile)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                  >
                    {uploadingImage ? <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>{t('messages.noMessages')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}