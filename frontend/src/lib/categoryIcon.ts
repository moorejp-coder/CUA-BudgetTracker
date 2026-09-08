import {
  Banknote,
  Car,
  CreditCard,
  Gift,
  GraduationCap,
  Heart,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Ticket,
  Tag,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

const RULES: [RegExp, LucideIcon][] = [
  [/rent|mortgage|housing|home/i, House],
  [/grocer|supermarket/i, ShoppingCart],
  [/dining|restaurant|food|coffee/i, UtensilsCrossed],
  [/transport|gas|fuel|car|auto|uber|lyft|parking/i, Car],
  [/shop|retail|amazon|clothes|clothing/i, ShoppingBag],
  [/entertain|movie|game|ticket|fun/i, Ticket],
  [/travel|flight|hotel|vacation/i, Plane],
  [/util|electric|water|power/i, Zap],
  [/internet|phone|cable|wifi/i, Wifi],
  [/subscript|streaming/i, CreditCard],
  [/insurance/i, ShieldCheck],
  [/health|medical|doctor|pharmacy|fitness|gym/i, Heart],
  [/education|school|tuition|book/i, GraduationCap],
  [/pet/i, PawPrint],
  [/gift|donat|charity/i, Gift],
  [/transfer/i, Repeat2],
  [/invest|brokerage|stock/i, Landmark],
  [/saving/i, PiggyBank],
  [/income|salary|payroll|paycheck/i, Wallet],
  [/interest|dividend/i, Banknote],
  [/misc|other/i, Sparkles],
];

export function getCategoryIcon(name: string): LucideIcon {
  const match = RULES.find(([pattern]) => pattern.test(name));
  return match ? match[1] : Tag;
}
