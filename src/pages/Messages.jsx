import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { supabase } from '@/supabase'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, ArrowLeft, Trash2, ImagePlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function dedup(msgs) {
  const seen = new Set();
  return msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''));
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
  const [recipientId, setRecipientId] = useState(null);
  const [recipientName, setRecipientName] = useState(params.get('toName') || '');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  // Map user_id -> { email, username, avatar } from profiles
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

      // Resolve initial recipient id (when navigating from listing)
      if (params.get('to')) {
        try {
          const { data: recRows, error: recErr } = await supabase
            .from('profiles')
            .select('id, email, username, profile_picture_url')
            .eq('email', params.get('to'))
            .limit(1)

          if (recErr) console.log(recErr)
          const row = Array.isArray(recRows) ? (recRows[0] || null) : null
          if (row?.id) {
            setRecipientId(row.id)
            setProfileMap(prev => ({
              ...prev,
              [row.id]: { email: row.email, username: row.username, avatar: row.profile_picture_url },
            }))

            // If we didn't get an id-based conversation id in URL, derive it now
            const urlConv = params.get('conv')
            const looksIdBased = typeof urlConv === 'string' && urlConv.includes('_') && urlConv.split('_').every(isUuid)
            if (!looksIdBased) {
              const derived = [u.id, row.id].sort().join('_')
              setActiveConv(derived)
            }
          }
        } catch (e) {
          console.log(e)
        }
      }

      try {
        const { data: allRows, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${u.id},recipient_id.eq.${u.id}`)
          .order('created_at', { ascending: false })
          .limit(200)

        if (msgError) console.log(msgError)

        const all = dedup((Array.isArray(allRows) ? allRows : []).map(m => ({
          ...m,
          created_date: m.created_date || m.created_at,
        })))

        setMessages(all)

        // Collect unique other-party user ids to resolve usernames
        const ids = new Set();
        all.forEach(m => {
          if (m.sender_id && m.sender_id !== u.id) ids.add(m.sender_id);
          if (m.recipient_id && m.recipient_id !== u.id) ids.add(m.recipient_id);
        });
        resolveProfiles([...ids]);
      } catch (e) {
        console.log(e)
        setMessages([])
      }
    })().catch((e) => {
      console.log(e)
    })
  }, []);

  const resolveProfiles = async (userIds) => {
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : []
    if (!ids.length) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, profile_picture_url')
      .in('id', ids)

    if (error) {
      console.log(error)
      return
    }

    const rows = Array.isArray(data) ? data : []
    const map = {}
    rows.forEach((p) => {
      if (!p?.id) return
      map[p.id] = { email: p.email, username: p.username, avatar: p.profile_picture_url }
    })
    setProfileMap(prev => ({ ...prev, ...map }));
  };

  const getDisplayName = (userId, fallbackName) => {
    const p = userId ? profileMap[userId] : null
    if (p?.username) return p.username;
    if (p?.email) return p.email.split('@')[0];
    if (fallbackName && !fallbackName.includes('@')) return fallbackName;
    return 'User';
  };

  const getAvatar = (userId) => profileMap[userId]?.avatar || null;

  // 2. Subscribe to ALL message changes
  useEffect(() => {
    const u = userRef.current
    if (!u?.id) return;

    const upsertFromPayload = (row) => {
      if (!row) return
      if (row.sender_id !== u.id && row.recipient_id !== u.id) return
      const msg = { ...row, created_date: row.created_date || row.created_at }
      setMessages(prev => dedup(prev.some(m => m.id === msg.id) ? prev.map(m => m.id === msg.id ? msg : m) : [...prev, msg]));
      const otherId = msg.sender_id !== u.id ? msg.sender_id : msg.recipient_id
      if (otherId) resolveProfiles([otherId]);
    }

    const removeFromPayload = (row) => {
      const id = row?.id
      if (!id) return
      setMessages(prev => prev.filter(m => m.id !== id));
    }

    const chanSender = supabase
      .channel(`messages-sender-${u.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${u.id}` }, (payload) => {
        if (payload.eventType === 'DELETE') removeFromPayload(payload.old)
        else upsertFromPayload(payload.new)
      })
      .subscribe();

    const chanRecipient = supabase
      .channel(`messages-recipient-${u.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${u.id}` }, (payload) => {
        if (payload.eventType === 'DELETE') removeFromPayload(payload.old)
        else upsertFromPayload(payload.new)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chanSender)
      supabase.removeChannel(chanRecipient)
    }
  }, [user?.id]);

  // 3. Mark messages as read when opening a conversation
  useEffect(() => {
    if (!activeConv || !userRef.current) return;
    const u = userRef.current
    const toMarkIds = (Array.isArray(messages) ? messages : [])
      .filter(m => m.conversation_id === activeConv && m.recipient_id === u.id && !m.is_read)
      .map(m => m.id)

    if (toMarkIds.length) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', toMarkIds)
        .then(({ error }) => { if (error) console.log(error) })
    }

    setMessages(prev => prev.map(m => (m.conversation_id === activeConv && m.recipient_id === u.id) ? { ...m, is_read: true } : m));
  }, [activeConv, messages]);

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
      const otherId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
      const otherFallback = '';
      convMap[msg.conversation_id] = {
        id: msg.conversation_id,
        otherParty: otherId,
        otherPartyName: getDisplayName(otherId, otherFallback),
        lastMessage: msg,
      };
    }
  });

  const convList = Object.values(convMap).sort(
    (a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
  );

  const unreadByConv = {};
  messages.forEach(m => {
    if (m.recipient_id === user?.id && !m.is_read) {
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
      try {
        const ext = (imageFile.name || 'png').split('.').pop() || 'png'
        const path = `messages/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase
          .storage
          .from('message-images')
          .upload(path, imageFile, { upsert: false })

        if (uploadError) throw uploadError

        const { data: pub } = supabase
          .storage
          .from('message-images')
          .getPublicUrl(path)

        uploadedImageUrl = pub?.publicUrl || null
      } catch (e) {
        console.log(e)
        uploadedImageUrl = null
      }
      setUploadingImage(false);
    }

    const recipient = recipientEmail;
    const content = newMessage.trim();

    let recipientUserId = recipientId
    if (recipient && !recipientUserId) {
      try {
        const { data: recRows, error: recErr } = await supabase
          .from('profiles')
          .select('id, email, username, profile_picture_url')
          .eq('email', recipient)
          .limit(1)

        if (recErr) console.log(recErr)
        const row = Array.isArray(recRows) ? (recRows[0] || null) : null
        if (row?.id) {
          recipientUserId = row.id
          setRecipientId(row.id)
          setProfileMap(prev => ({
            ...prev,
            [row.id]: { email: row.email, username: row.username, avatar: row.profile_picture_url },
          }))
        }
      } catch (e) {
        console.log(e)
      }
    }

    if (!recipientUserId) {
      toast.error('Recipient not found')
      setSending(false)
      return
    }

    const convId = activeConv || (recipientUserId ? [user.id, recipientUserId].sort().join('_') : null)
    if (!convId) {
      setSending(false)
      return
    }

    const optimistic = {
      id: `temp_${Date.now()}`,
      conversation_id: convId,
      sender_id: user.id,
      recipient_id: recipientUserId,
      content,
      image_url: uploadedImageUrl || imagePreview,
      is_read: false,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    clearImage();
    if (!activeConv) setActiveConv(convId);

    try {
      const listingParam = params.get('listing') || null
      const listing_id = listingParam && isUuid(listingParam) ? listingParam : null
      const { data: createdRows, error: createError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          listing_id,
          sender_id: user.id,
          recipient_id: recipientUserId,
          content,
          image_url: uploadedImageUrl || null,
          is_read: false,
        })
        .select('*')
        .limit(1)

      if (createError) throw createError

      const created = Array.isArray(createdRows) ? (createdRows[0] || null) : null
      if (created) {
        setMessages(prev => dedup(prev.map(m => m.id === optimistic.id ? { ...created, created_date: created.created_at } : m)));
      }
    } catch (e) {
      console.log(e)
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (convId) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', convId)

    if (error) console.log(error)

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

  const activeRecipientProfile = recipientId ? profileMap[recipientId] : null
  const activeRecipientDisplay = getDisplayName(recipientId, recipientName);
  const activeRecipientEmail = activeRecipientProfile?.email || recipientEmail

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
                        const p = profileMap[conv.otherParty]
                        setRecipientId(conv.otherParty);
                        setRecipientEmail(p?.email || '');
                        setRecipientName(displayName);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left pr-10",
                        activeConv === conv.id && "bg-muted"
                      )}
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        {false ? (
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
                {getAvatar(recipientId) ? (
                  <img src={getAvatar(recipientId)} alt={activeRecipientDisplay} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <Link
                  to={`/seller/${encodeURIComponent(recipientId || recipientEmail)}`}
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
                    const isMine = msg.sender_id === user.id;
                    const isSystem = false;
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

              {false ? (
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