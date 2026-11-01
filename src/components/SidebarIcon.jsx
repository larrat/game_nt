import React from 'react';
import {
  Award, BookOpen, CalendarDays, ChevronDown, ChevronRight,
  CircleHelp, ClipboardList, Crown, DoorOpen, Dumbbell, Flame,
  GraduationCap, Hammer, HeartPulse, History, House, Landmark,
  LayoutDashboard, Map, PawPrint, ScrollText, Search, Shield,
  Soup, Sparkles, Swords, Trophy, UserRound, UsersRound,
  Volume2, VolumeX, X
} from 'lucide-react';

// Fixed, tree-shakeable set; all icons share the same Lucide visual language.
const ICONS = {
  academy: GraduationCap,
  award: Award,
  book: BookOpen,
  calendar: CalendarDays,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  clipboard: ClipboardList,
  crown: Crown,
  dashboard: LayoutDashboard,
  door: DoorOpen,
  dumbbell: Dumbbell,
  flame: Flame,
  graduation: GraduationCap,
  hammer: Hammer,
  heart: HeartPulse,
  history: History,
  home: House,
  landmark: Landmark,
  map: Map,
  paw: PawPrint,
  scroll: ScrollText,
  search: Search,
  shield: Shield,
  soup: Soup,
  sparkles: Sparkles,
  swords: Swords,
  trophy: Trophy,
  user: UserRound,
  users: UsersRound,
  volumeOn: Volume2,
  volumeOff: VolumeX,
  close: X
};

export default function SidebarIcon({ name, size = 18 }) {
  const Icon = ICONS[name] || CircleHelp;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" focusable="false" />;
}
