import type { Profile } from '@/types/profile';
import { ProfileCard } from './ProfileCard';
import { LayoutView } from '@/stores/settingsStore';


interface ProfileGridProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  layoutView?: LayoutView;
}

export function ProfileGrid({ profiles, onEdit, onDelete, layoutView = 'grid' }: ProfileGridProps) {
  if (profiles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-2">No profiles yet</p>
        <p className="text-muted-foreground text-sm">Create your first GitHub profile to get started</p>
      </div>
    );
  }

  const gridClasses = {
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6',
    list: 'flex flex-col gap-4',
    compact: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3',
  };

  return (
    <div className={gridClasses[layoutView]}>
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onEdit={onEdit}
          onDelete={onDelete}
          layoutView={layoutView}
        />
      ))}
    </div>
  );
}
