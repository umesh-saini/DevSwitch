import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { Palette, X } from 'lucide-react';

interface ProfileCustomizationProps {
  avatar?: string;
  color?: string;
  onAvatarChange: (avatar: string) => void;
  onColorChange: (color: string) => void;
}

const EMOJI_OPTIONS = [
  '👤', '💼', '🏢', '🎯', '🚀', '💻', '🔧', '⚙️', 
  '🎨', '📱', '🌟', '💡', '🔑', '🎮', '📊', '🎓'
];

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function ProfileCustomization({ 
  avatar, 
  color, 
  onAvatarChange, 
  onColorChange 
}: ProfileCustomizationProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Palette className="w-4 h-4" />
        Customization
      </h4>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Avatar Selection */}
        <div className="space-y-2">
          <Label>Avatar Emoji</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-full h-12 border border-border rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center text-2xl"
              style={{ backgroundColor: color ? `${color}10` : undefined }}
            >
              {avatar || '👤'}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-md shadow-lg z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Select emoji</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onAvatarChange(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-xl hover:bg-muted rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {avatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onAvatarChange('');
                      setShowEmojiPicker(false);
                    }}
                    className="w-full mt-2"
                  >
                    Clear avatar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <Label>Accent Color</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full h-12 border border-border rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
            >
              <div 
                className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: color || '#3b82f6' }}
              />
              <span className="text-sm font-mono">{color || '#3b82f6'}</span>
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-md shadow-lg z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Select color</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowColorPicker(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      onClick={() => {
                        onColorChange(colorOption);
                        setShowColorPicker(false);
                      }}
                      className={`h-10 rounded-md border-2 transition-all ${
                        color === colorOption
                          ? 'border-foreground scale-110'
                          : 'border-border hover:border-foreground/50'
                      }`}
                      style={{ backgroundColor: colorOption }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
