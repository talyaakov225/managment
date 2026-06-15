import { useState } from 'react';

interface AvatarProps {
  name: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
};

const colors = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, avatar, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        title={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
