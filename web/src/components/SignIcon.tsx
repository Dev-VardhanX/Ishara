import React from 'react';
import {
  Hand,
  HandMetal,
  HeartHandshake,
  Heart,
  RotateCcw,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  LifeBuoy,
  Octagon,
  Utensils,
  Coffee,
  Droplets,
  UtensilsCrossed,
  Home,
  Users,
  Tag,
  Sparkles,
  Shield,
  ShieldAlert,
  Activity,
  Smartphone,
  AlertTriangle,
  GraduationCap,
  MessageSquare,
  Volume2,
  Video,
} from 'lucide-react';

export type SignGlossId =
  | 'HELLO'
  | 'THANK_YOU'
  | 'PLEASE'
  | 'SORRY'
  | 'GOODBYE'
  | 'HOW_ARE_YOU'
  | 'YES'
  | 'NO'
  | 'GOOD'
  | 'BAD'
  | 'HELP'
  | 'STOP'
  | 'EAT'
  | 'DRINK'
  | 'WATER'
  | 'FOOD'
  | 'HOME'
  | 'FRIEND'
  | 'NAME'
  | 'LOVE'
  | string;

export type EmergencyPhraseId =
  | 'help'
  | 'police'
  | 'not_safe'
  | 'medical'
  | 'communication'
  | 'family'
  | string;

interface SignIconProps {
  gloss?: SignGlossId | null;
  phraseId?: EmergencyPhraseId | null;
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Shared Sign & Emergency Phrase Icon Component.
 * Maps the 20 target vocabulary signs and 6 emergency phrases to consistent Lucide SVG icons.
 * Eliminates all raw emoji characters from the UI.
 */
export const SignIcon: React.FC<SignIconProps> = ({
  gloss,
  phraseId,
  className = 'w-6 h-6',
  size,
  strokeWidth = 2,
}) => {
  const iconProps = { className, size, strokeWidth };

  // Emergency phrase mappings
  if (phraseId) {
    switch (phraseId.toLowerCase()) {
      case 'help':
        return <LifeBuoy {...iconProps} />;
      case 'police':
        return <Shield {...iconProps} />;
      case 'not_safe':
        return <ShieldAlert {...iconProps} />;
      case 'medical':
        return <Activity {...iconProps} />;
      case 'communication':
        return <Smartphone {...iconProps} />;
      case 'family':
        return <Users {...iconProps} />;
      default:
        return <AlertTriangle {...iconProps} />;
    }
  }

  // 20 Sign Gloss mappings
  const normalized = (gloss || '').trim().toUpperCase().replace(/^(ISL_|ASL_)/, '');

  switch (normalized) {
    case 'HELLO':
      return <Hand {...iconProps} />;
    case 'THANK_YOU':
      return <HeartHandshake {...iconProps} />;
    case 'PLEASE':
      return <Sparkles {...iconProps} />;
    case 'SORRY':
      return <RotateCcw {...iconProps} />;
    case 'GOODBYE':
      return <Hand {...iconProps} />;
    case 'HOW_ARE_YOU':
      return <HelpCircle {...iconProps} />;
    case 'YES':
      return <ThumbsUp {...iconProps} />;
    case 'NO':
      return <ThumbsDown {...iconProps} />;
    case 'GOOD':
      return <Smile {...iconProps} />;
    case 'BAD':
      return <Frown {...iconProps} />;
    case 'HELP':
      return <LifeBuoy {...iconProps} />;
    case 'STOP':
      return <Octagon {...iconProps} />;
    case 'EAT':
      return <Utensils {...iconProps} />;
    case 'DRINK':
      return <Coffee {...iconProps} />;
    case 'WATER':
      return <Droplets {...iconProps} />;
    case 'FOOD':
      return <UtensilsCrossed {...iconProps} />;
    case 'HOME':
      return <Home {...iconProps} />;
    case 'FRIEND':
      return <Users {...iconProps} />;
    case 'NAME':
      return <Tag {...iconProps} />;
    case 'LOVE':
      return <Heart {...iconProps} />;

    // Contextual gestures & UI actions
    case 'SIGN':
    case 'SIGN_TO_VOICE':
      return <Video {...iconProps} />;
    case 'VOICE':
    case 'VOICE_TO_SIGN':
      return <Volume2 {...iconProps} />;
    case 'LEARN':
    case 'EDUCATION':
      return <GraduationCap {...iconProps} />;
    case 'CHAT':
    case 'MESSAGE':
      return <MessageSquare {...iconProps} />;
    case 'FAMILY':
      return <Users {...iconProps} />;
    case 'HOSPITAL':
    case 'DOCTOR':
      return <Activity {...iconProps} />;

    default:
      return <HandMetal {...iconProps} />;
  }
};
