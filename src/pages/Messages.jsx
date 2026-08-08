import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n.jsx';
import { formatLastSeen } from '@/lib/presence';
import { supabase } from '@/supabase'
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, ArrowLeft, Trash2, ImagePlus, X, MessageCircle, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import FullscreenImageViewer from '@/components/listings/FullscreenImageViewer';
import { pageBackgroundStyle, pageBackgroundClassName } from '@/lib/pageBackground';
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

function isIdBasedConvId(convId) {
  return typeof convId === 'string' && convId.includes('_') && convId.split('_').every(isUuid);
}

// A message stays hidden from a user's own view once they've deleted their
// side of the conversation -- the other person's copy is never touched.
function isHiddenForMe(msg, myId) {
  if (msg.sender_id === myId && msg.deleted_by_sender) return true;
  if (msg.recipient_id === myId && msg.deleted_by_recipient) return true;
  return false;
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
  const [recipientId, setRecipientId] = useState(params.get('toId') || null);
  const [recipientName, setRecipientName] = useState(params.get('toName') || '');
  const [sending, setSending] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const MAX_MESSAGE_IMAGES = 5;
  const imageInputRef = useRef(null);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const openImageViewer = (images, index) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleCopyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId((id) => (id === msg.id ? null : id)), 1500);
    } catch (e) {
      console.log(e);
      toast.error(t('messages_extra.copyFailed'));
    }
  };
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
        .select('id,username,profile_picture_url,can_bid,bid_restricted_until,can_create_listings,listing_restricted_until,restricted_until,strikes_count')
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

      // Resolve initial recipient id (supports both ?toId=<uuid> and legacy ?to=<email>)
      const toIdParam = params.get('toId')
      const toEmailParam = params.get('to')

      if (toIdParam && isUuid(toIdParam)) {
        setRecipientId(toIdParam)

        const urlConv = params.get('conv')
        const looksIdBased = typeof urlConv === 'string' && urlConv.includes('_') && urlConv.split('_').every(isUuid)
        if (!looksIdBased) {
          const derived = [u.id, toIdParam].sort().join('_')
          setActiveConv(derived)
        }
      } else if (toEmailParam) {
        // Legacy path: email-based recipient lookup is intentionally disabled.
        // Use ?toId=<uuid> so the database doesn't need to expose emails publicly.
      }

      try {
        const { data: allRows, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${u.id},recipient_id.eq.${u.id}`)
          .order('created_at', { ascending: false })
          .limit(200)

        if (msgError) console.log(msgError)

        const all = dedup((Array.isArray(allRows) ? allRows : [])
          .filter(m => !isHiddenForMe(m, u.id))
          .map(m => ({
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
      .from('public_profiles')
      .select('id, username, profile_picture_url, last_seen_at')
      .in('id', ids)

    if (error) {
      console.log(error)
      return
    }

    const rows = Array.isArray(data) ? data : []
    const map = {}
    rows.forEach((p) => {
      if (!p?.id) return
      map[p.id] = { email: null, username: p.username, avatar: p.profile_picture_url, lastSeenAt: p.last_seen_at }
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
  const getLastSeen = (userId) => profileMap[userId]?.lastSeenAt || null;

  // 2. Subscribe to ALL message changes
  useEffect(() => {
    const u = userRef.current
    if (!u?.id) return;

    const upsertFromPayload = (row) => {
      if (!row) return
      if (row.sender_id !== u.id && row.recipient_id !== u.id) return
      if (isHiddenForMe(row, u.id)) {
        setMessages(prev => prev.filter(m => m.id !== row.id));
        return
      }
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
    const toMark = (Array.isArray(messages) ? messages : [])
      .filter(m => m.conversation_id === activeConv && m.recipient_id === u.id && !m.is_read)

    // Bail out with no state update at all when there's nothing new to mark.
    // Without this, setMessages below would run on every single render this
    // effect causes (since it always returns a new array reference, even when
    // nothing actually changed) -- which changes `messages`, which re-triggers
    // this very effect via its dependency array, forever. That self-inflicted
    // loop was almost certainly why live "Seen" updates weren't landing: the
    // component was busy re-rendering in a tight loop instead of settling
    // long enough for the real realtime update to be reflected.
    if (toMark.length === 0) return;

    const idSet = new Set(toMark.map(m => m.id))

    supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', [...idSet])
      .then(({ error }) => { if (error) console.log(error) })

    setMessages(prev => prev.map(m => idSet.has(m.id) ? { ...m, is_read: true } : m));
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

  // Which listing is this conversation currently about -- the most recent
  // message that was sent with a listing attached (a conversation with the
  // same person can span multiple items over time).
  const activeListingId = (() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i]?.listing_id) return activeMessages[i].listing_id;
    }
    return null;
  })();

  const [activeListingPreview, setActiveListingPreview] = useState(null);
  useEffect(() => {
    if (!activeListingId) { setActiveListingPreview(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,images,price,current_bid,listing_type,is_deleted')
        .eq('id', activeListingId)
        .limit(1)

      if (error) console.log(error)
      const row = Array.isArray(data) ? (data[0] || null) : null
      setActiveListingPreview(row && !row.is_deleted ? row : null)
    })()
  }, [activeListingId]);

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
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setImageFiles(prev => {
      const remaining = MAX_MESSAGE_IMAGES - prev.length;
      if (remaining <= 0) {
        toast.error(`You can attach up to ${MAX_MESSAGE_IMAGES} images.`);
        return prev;
      }
      const toAdd = files.slice(0, remaining);
      if (files.length > toAdd.length) {
        toast.error(`Only added ${toAdd.length} — max ${MAX_MESSAGE_IMAGES} images per message.`);
      }
      setImagePreviews(prevPreviews => [...prevPreviews, ...toAdd.map(f => URL.createObjectURL(f))]);
      return [...prev, ...toAdd];
    });
  };

  const removeImageAt = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() && imageFiles.length === 0) return;
    if (!user || sending) return;
    setSending(true);

    let uploadedImageUrls = [];
    if (imageFiles.length > 0) {
      setUploadingImage(true);
      const results = await Promise.all(imageFiles.map(async (file, i) => {
        try {
          const ext = (file.name || 'png').split('.').pop() || 'png'
          const path = `messages/${user.id}/${Date.now()}_${i}.${ext}`
          const { error: uploadError } = await supabase
            .storage
            .from('message-images')
            .upload(path, file, { upsert: false })

          if (uploadError) throw uploadError

          const { data: pub } = supabase
            .storage
            .from('message-images')
            .getPublicUrl(path)

          return pub?.publicUrl || null
        } catch (e) {
          console.log(e)
          return null
        }
      }))

      uploadedImageUrls = results.filter(Boolean)
      const failedCount = imageFiles.length - uploadedImageUrls.length
      if (failedCount > 0) {
        toast.error(uploadedImageUrls.length > 0
          ? `${failedCount} image${failedCount > 1 ? 's' : ''} failed to attach — sending the rest`
          : 'Failed to attach images — sending message without them')
      }
      setUploadingImage(false);
    }

    const recipient = recipientEmail;
    const content = newMessage.trim();

    let recipientUserId = recipientId

    if (!recipientUserId) {
      toast.error('Recipient not found. Please open chat using a profile link or listing Contact Seller button.')
      setSending(false)
      return
    }

    const derivedConvId = [user.id, recipientUserId].sort().join('_')
    const convId = !isIdBasedConvId(activeConv) ? derivedConvId : (activeConv || derivedConvId)
    if (!convId) {
      setSending(false)
      return
    }

    if (activeConv !== convId) {
      setActiveConv(convId)
    }

    const optimistic = {
      id: `temp_${Date.now()}`,
      conversation_id: convId,
      sender_id: user.id,
      recipient_id: recipientUserId,
      content,
      image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : (imagePreviews.length > 0 ? imagePreviews : null),
      is_read: false,
      created_date: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    clearImages();
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
          image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
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
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (convId) => {
    // Only hides the conversation from this user's own view -- the other
    // person's copy of these messages is never touched.
    const { error } = await supabase.rpc('delete_conversation_for_me', { p_conversation_id: convId })

    if (error) {
      console.log(error)
      toast.error('Failed to delete conversation')
      return
    }

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
    <div className={pageBackgroundClassName} style={pageBackgroundStyle}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-display font-bold mb-6">{t('messages.title')}</h1>

        <div className="bg-card/40 backdrop-blur-md border border-border/60 shadow-xl shadow-black/20 rounded-xl overflow-hidden h-[70vh] flex">
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
                          {conv.lastMessage.content || (
                            conv.lastMessage.image_urls?.length > 1
                              ? `📷 ${conv.lastMessage.image_urls.length} Photos`
                              : (conv.lastMessage.image_urls?.length === 1 || conv.lastMessage.image_url) ? '📷 Photo' : ''
                          )}
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
                            This removes the conversation from your inbox. {displayName} will still see their copy of it.
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
                  className="flex-1 min-w-0 hover:text-accent transition-colors"
                >
                  <p className="font-semibold text-sm truncate">{activeRecipientDisplay}</p>
                  {getLastSeen(recipientId) && (
                    <p className="text-[11px] text-muted-foreground">{formatLastSeen(getLastSeen(recipientId), t)}</p>
                  )}
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
                          This removes the conversation from your inbox. {activeRecipientDisplay} will still see their copy of it.
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

              {activeListingPreview && (
                <Link
                  to={`/listing/${activeListingPreview.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <img
                    src={activeListingPreview.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop'}
                    alt={activeListingPreview.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">About this listing</p>
                    <p className="text-sm font-medium truncate">{activeListingPreview.title}</p>
                  </div>
                  <span className="text-sm font-bold text-accent shrink-0">
                    €{(activeListingPreview.listing_type === 'auction'
                      ? (activeListingPreview.current_bid ?? activeListingPreview.price)
                      : activeListingPreview.price
                    )?.toFixed(2)}
                  </span>
                </Link>
              )}

              <div
                className="flex-1 overflow-y-auto p-4 space-y-3"
                style={{
                  overflowAnchor: 'none',
                  backgroundImage: 'radial-gradient(circle at 50% 0%, hsl(var(--accent) / 0.06), transparent 55%)',
                }}
              >
                {activeMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2 px-6">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-1">
                      <MessageCircle className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-sm">
                      Say hello to <span className="font-semibold text-foreground">{activeRecipientDisplay}</span> — pick a quick question below or write your own.
                    </p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {activeMessages.map((msg, idx) => {
                    const isMine = msg.sender_id === user.id;
                    const isSystem = false;
                    // "Seen"/"Sent" only show under the very last thing you
                    // sent -- same convention as iMessage/WhatsApp, not on
                    // every message.
                    const isLastMine = isMine && !activeMessages
                      .slice(idx + 1)
                      .some(m => m.sender_id === user.id);
                    const isLastMineRead = isLastMine && msg.is_read;
                    const isLastMineSent = isLastMine && !msg.is_read && !msg._optimistic;
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
                          <div className={cn("flex flex-col max-w-[75%]", isMine ? "items-end" : "items-start")}>
                            <div className={cn(
                              "rounded-2xl text-sm overflow-hidden",
                              isMine
                                ? "bg-accent/15 border border-accent/30 text-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm",
                              msg._optimistic && "opacity-60"
                            )}>
                              {(() => {
                                // New messages use image_urls (array, up to 5);
                                // old messages only ever had the single image_url.
                                const imgs = msg.image_urls?.length ? msg.image_urls : (msg.image_url ? [msg.image_url] : []);
                                if (imgs.length === 0) return null;
                                if (imgs.length === 1) {
                                  return (
                                    <img
                                      src={imgs[0]}
                                      alt="attachment"
                                      onClick={() => openImageViewer(imgs, 0)}
                                      className="max-w-full max-h-60 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                  );
                                }
                                return (
                                  <div className="grid grid-cols-2 gap-0.5">
                                    {imgs.map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt={`attachment ${i + 1}`}
                                        onClick={() => openImageViewer(imgs, i)}
                                        className="w-full h-28 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    ))}
                                  </div>
                                );
                              })()}
                              <div className="px-4 py-2.5">
                                {msg.content && <p>{msg.content}</p>}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <p className="text-[10px] text-muted-foreground">
                                    {format(new Date(msg.created_date), 'HH:mm')}
                                  </p>
                                  {msg.content && !isMine && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMessage(msg)}
                                      aria-label={t('messages_extra.copyMessage')}
                                      className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                    >
                                      {copiedMsgId === msg.id ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isLastMineRead && (
                              <span className="text-[10px] text-muted-foreground mt-1 mr-1">Seen</span>
                            )}
                            {isLastMineSent && (
                              <span className="text-[10px] text-muted-foreground/70 mt-1 mr-1">Sent</span>
                            )}
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
                {imagePreviews.length > 0 && (
                  <div className="px-4 pt-3 flex items-start gap-2 overflow-x-auto">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="relative inline-block shrink-0">
                        <img src={preview} alt={`preview ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border" />
                        <button
                          onClick={() => removeImageAt(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < MAX_MESSAGE_IMAGES && (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="h-20 w-20 shrink-0 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span className="text-[10px]">{imagePreviews.length}/{MAX_MESSAGE_IMAGES}</span>
                      </button>
                    )}
                  </div>
                )}
                {activeMessages.length === 0 && (
                  <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
                    {['Is this still available?', 'Would you take a lower offer?', 'What condition is it in?', 'Can you ship this?'].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setNewMessage(suggestion)}
                        className="shrink-0 text-xs font-medium text-foreground bg-muted hover:bg-accent/15 hover:text-accent border border-border rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 flex gap-2 items-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending || imageFiles.length >= MAX_MESSAGE_IMAGES}
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
                    disabled={sending || uploadingImage || (!newMessage.trim() && imageFiles.length === 0)}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                  >
                    {uploadingImage ? <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>}
            </>
          ) : (
            <div className="flex-1 hidden sm:flex flex-col items-center justify-center text-center text-muted-foreground px-6 gap-2">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-1">
                <MessageCircle className="w-7 h-7 text-accent" />
              </div>
              <p className="font-medium text-foreground">Your conversations live here</p>
              <p className="text-sm max-w-xs">Pick a chat on the left, or say hello to a seller from any listing to get started.</p>
            </div>
          )}
        </div>
        </div>
      </div>

      <FullscreenImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}