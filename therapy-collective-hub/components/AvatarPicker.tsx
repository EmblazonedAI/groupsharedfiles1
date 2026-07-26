'use client';

// Anonymous emoji avatars used in place of real names. The chosen emoji is
// stored in the same text fields that used to hold names, so no migration
// is needed and older entries with typed names still display fine.
export const AVATAR_EMOJIS = ['🌿', '🌸', '🦋', '🌙', '☀️', '🌊', '🍄', '🕊️', '🦉', '🐢', '🌻', '⭐', '🫖', '🧸'];

export const isEmojiAvatar = (value?: string | null) =>
  !!value && AVATAR_EMOJIS.includes(value);

export default function AvatarPicker({
  value,
  onChange,
  label = 'Post as (anonymous avatar)',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-[#6B6B6B] mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {AVATAR_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(value === emoji ? '' : emoji)}
            aria-pressed={value === emoji}
            title={value === emoji ? 'Tap to clear' : 'Post as this avatar'}
            className={`w-10 h-10 rounded-full text-lg flex items-center justify-center transition-all ${
              value === emoji
                ? 'bg-[#8F9F8A] ring-2 ring-[#8F9F8A] ring-offset-2 scale-110'
                : 'bg-[#F0EFEA] hover:bg-[#E8E6E1] hover:scale-105'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#8C8C8C] mt-2">
        {value ? `Posting as ${value}` : 'Pick an avatar, or leave blank to post as Anonymous.'}
      </p>
    </div>
  );
}
