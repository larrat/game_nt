import React from 'react';
import {
  Activity, ArrowRight, Award, BookOpen, CalendarDays, ChevronDown, ChevronRight,
  Coins, Compass, Crosshair, Info, LockKeyhole, RefreshCw,
  CircleHelp, ClipboardList, Crown, DoorOpen, Dumbbell, Flame,
  GraduationCap, Hammer, HeartPulse, History, House, Landmark,
  LayoutDashboard, Map, PawPrint, ScrollText, Search, Shield,
  Soup, Sparkles, Swords, Target, Trophy, UserRound, UsersRound, Zap,
  Volume2, VolumeX, X
} from 'lucide-react';

// Fixed, tree-shakeable set; all icons share the same Lucide visual language.
const ICONS = {
  academy: GraduationCap,
  activity: Activity,
  arrowRight: ArrowRight,
  award: Award,
  book: BookOpen,
  calendar: CalendarDays,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  clipboard: ClipboardList,
  coins: Coins,
  compass: Compass,
  crosshair: Crosshair,
  crown: Crown,
  dashboard: LayoutDashboard,
  door: DoorOpen,
  dumbbell: Dumbbell,
  flame: Flame,
  graduation: GraduationCap,
  hammer: Hammer,
  heart: HeartPulse,
  history: History,
  info: Info,
  lock: LockKeyhole,
  home: House,
  landmark: Landmark,
  map: Map,
  paw: PawPrint,
  refresh: RefreshCw,
  scroll: ScrollText,
  search: Search,
  shield: Shield,
  soup: Soup,
  sparkles: Sparkles,
  swords: Swords,
  target: Target,
  trophy: Trophy,
  user: UserRound,
  zap: Zap,
  users: UsersRound,
  volumeOn: Volume2,
  volumeOff: VolumeX,
  close: X
};

export default function SidebarIcon({ name, size = 18 }) {
  const Icon = ICONS[name] || CircleHelp;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" focusable="false" />;
}
