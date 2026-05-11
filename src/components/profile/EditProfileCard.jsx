import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/supabase'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, User, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AVATAR_BUCKET = 'profile-avatars'

const LABELS = {
  lv: {
    title: 'Personīgā informācija',
    fullName: 'Vārds Uzvārds',
    username: 'Lietotājvārds',
    phone: 'Tālrunis',
    city: 'Pilsēta',
    bio: 'Bio',
    email: 'E-pasts',
    memberSince: 'Dalībnieks kopš',
    save: 'Saglabāt',
    saving: 'Saglabā...',
    saved: 'Saglabāts!',
    uploadPhoto: 'Augšupielādēt foto',
    accountInfo: 'Konta informācija',
    errors: {
      fullNameRequired: 'Vārds ir obligāts',
      usernameRequired: 'Lietotājvārds ir obligāts',
      usernameTaken: 'Šis lietotājvārds jau ir aizņemts',
      phoneinvalid: 'Nepareizs tālruņa numurs',
    },
  },
  en: {
    title: 'Personal Information',
    fullName: 'Full Name',
    username: 'Username',
    phone: 'Phone Number',
    city: 'City',
    bio: 'Bio',
    email: 'Email',
    memberSince: 'Member since',
    save: 'Save Changes',
    saving: 'Saving...',
    saved: 'Saved!',
    uploadPhoto: 'Upload Photo',
    accountInfo: 'Account Info',
    errors: {
      fullNameRequired: 'Full name is required',
      usernameRequired: 'Username is required',
      usernameTaken: 'This username is already taken',
      phoneinvalid: 'Invalid phone number',
    },
  },
};

export default function EditProfileCard({ user, profile, lang, onProfileSaved }) {
  const L = LABELS[lang] || LABELS.en;

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    username: profile?.username || '',
    phone_number: profile?.phone_number || '',
    city: profile?.city || '',
    profile_picture_url: profile?.profile_picture_url || '',
    bio: profile?.bio || '',
  });
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (hydrated) return;
    if (!user?.id) return;

    setForm({
      full_name: user?.full_name || '',
      username: profile?.username || '',
      phone_number: profile?.phone_number || '',
      city: profile?.city || '',
      profile_picture_url: profile?.profile_picture_url || '',
      bio: profile?.bio || '',
    });
    setHydrated(true);
  }, [hydrated, user?.id, user?.full_name, profile?.username, profile?.phone_number, profile?.city, profile?.profile_picture_url, profile?.bio]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile) return;

    setForm((f) => {
      // Only fill missing fields from profile/user; don't clobber user edits.
      const next = { ...f };
      if (!next.username && profile?.username) next.username = profile.username;
      if (!next.phone_number && profile?.phone_number) next.phone_number = profile.phone_number;
      if (!next.city && profile?.city) next.city = profile.city;
      if (!next.profile_picture_url && profile?.profile_picture_url) next.profile_picture_url = profile.profile_picture_url;
      if (!next.bio && profile?.bio) next.bio = profile.bio;
      if (!next.full_name && user?.full_name) next.full_name = user.full_name;
      return next;
    });
  }, [hydrated, profile, user?.full_name]);

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = L.errors.fullNameRequired;
    if (!form.username.trim()) errs.username = L.errors.usernameRequired;
    if (form.phone_number && !/^[+\d\s\-()]{6,20}$/.test(form.phone_number)) {
      errs.phone_number = L.errors.phoneinvalid;
    }
    return errs;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name || '').split('.').pop() || 'jpg'
      const filePath = `avatars/${user?.id || 'user'}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.log(uploadError)
        toast.error('Failed to upload photo')
        return
      }

      const { data: publicData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath)

      setForm(f => ({ ...f, profile_picture_url: publicData?.publicUrl || '' }));
    } catch (err) {
      console.log(err)
      toast.error('Failed to upload photo')
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    // Check username uniqueness (skip if unchanged)
    if (form.username !== profile?.username) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username.trim())
        .limit(1)

      if (error) console.log(error)

      const existingId = Array.isArray(data) ? data[0]?.id : null
      if (existingId && existingId !== user.id) {
        setErrors({ username: L.errors.usernameTaken });
        setSaving(false);
        return;
      }
    }

    const nextUsername = form.username.trim();
    const nextPhone = form.phone_number.trim();
    const nextCity = form.city.trim();
    const nextBio = form.bio.trim();
    const nextAvatar = form.profile_picture_url;

    const willUpdateAuthName = form.full_name !== user.full_name;
    const willUpdateProfile = !!(
      nextUsername !== (profile?.username || '') ||
      nextPhone !== (profile?.phone_number || '') ||
      nextCity !== (profile?.city || '') ||
      nextBio !== (profile?.bio || '') ||
      nextAvatar !== (profile?.profile_picture_url || '')
    );

    let profileSaved = false;
    let authNameSaved = false;

    if (willUpdateProfile) {
      const profileData = {
        username: nextUsername,
        phone_number: nextPhone,
        city: nextCity,
        profile_picture_url: nextAvatar,
        bio: nextBio,
      };

      const { data: updatedRow, error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (profileError) {
        console.log(profileError)
        toast.error(profileError.message || 'Failed to save profile')
      } else if (!updatedRow?.id) {
        toast.error('Failed to save profile (not authorized)')
      } else {
        profileSaved = true;
      }
    }

    if (willUpdateAuthName) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: form.full_name,
        },
      })

      if (authUpdateError) {
        console.log(authUpdateError)
        toast.error(authUpdateError.message || 'Failed to save name')
      } else {
        authNameSaved = true;
      }
    }

    if ((willUpdateProfile && !profileSaved) || (willUpdateAuthName && !authNameSaved)) {
      setSaving(false);
      return
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast.success(L.saved);
    onProfileSaved?.();
  };

  const avatarUrl = form.profile_picture_url;

  return (
    <div className="bg-card rounded-xl border p-6 space-y-6">
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md hover:bg-accent/80 transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" /> : <Camera className="w-4 h-4 text-accent-foreground" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-display font-bold">{form.full_name || user?.full_name}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs text-accent hover:underline"
          >
            {L.uploadPhoto}
          </button>
        </div>
      </div>

      {/* Personal fields */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">{L.title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={L.fullName} error={errors.full_name}>
            <Input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder={L.fullName}
              className={errors.full_name ? 'border-destructive' : ''}
            />
          </Field>

          <Field label={L.username} error={errors.username}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={form.username}
                onChange={e => !profile?.username && setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                placeholder="username"
                readOnly={!!profile?.username}
                className={cn('pl-7', profile?.username ? 'bg-muted text-muted-foreground cursor-not-allowed' : '', errors.username ? 'border-destructive' : '')}
              />
            </div>
            {profile?.username && <p className="text-xs text-muted-foreground">Username cannot be changed once set.</p>}
          </Field>

          <Field label={L.phone} error={errors.phone_number}>
            <Input
              value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
              placeholder="+371 20000000"
              type="tel"
              className={errors.phone_number ? 'border-destructive' : ''}
            />
          </Field>

          <Field label={L.city} error={errors.city}>
            <Input
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Rīga"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={L.bio} error={errors.bio}>
              <Textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder=""
                className={cn('min-h-[120px] resize-none', errors.bio ? 'border-destructive' : '')}
                maxLength={500}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Account info (read-only) */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">{L.accountInfo}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={L.email}>
            <Input value={user?.email || ''} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
          </Field>
          <Field label={L.memberSince}>
            <Input
              value={user?.created_date ? new Date(user.created_date).toLocaleDateString() : '—'}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
          </Field>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className={cn(
            'gap-2 min-w-[140px]',
            saved ? 'bg-green-600 hover:bg-green-600' : 'bg-accent hover:bg-accent/90 text-accent-foreground'
          )}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{L.saving}</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" />{L.saved}</>
          ) : (
            <><Save className="w-4 h-4" />{L.save}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}