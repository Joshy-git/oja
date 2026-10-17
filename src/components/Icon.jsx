// Single icon set for the whole app (Lucide line icons). Data and state refer to
// icons by name so they stay serialisable (toasts, order stages, categories).
import {
  Smartphone, CookingPot, Shirt, Sparkles, Dumbbell, Car, Wrench, ToyBrick, PencilRuler, Luggage, PawPrint,
  BatteryCharging, Sun, Fan, Footprints, Watch, Glasses, Gift, ShoppingBag, ReceiptText, MapPin, ShieldCheck,
  RotateCcw, Factory, ScanSearch, Plane, Stamp, Bike, BadgeCheck, Settings, Package, Warehouse, PartyPopper,
  User, ShoppingCart, House, Search, Zap, Flame, Truck, Lock, Heart, Ruler, Flag, Ticket, Bookmark, Hand,
  SearchX, PackageX, Camera, Repeat, ThumbsUp, CircleCheck, Banknote, Tag, SlidersHorizontal, TriangleAlert,
  CreditCard, Landmark, Hash, Wallet, Link, Check, Circle, ArrowLeft, ChevronRight, LayoutDashboard, ScrollText,
  Ship, Menu, Paperclip, History, Coins, Star, X, Bell, Store, Plus, Minus, ArrowRight, TrendingDown, Hourglass, BellRing, Gamepad2, Headphones, Mail, ChevronDown, LayoutGrid, PanelLeft, CalendarDays, ArrowUpRight, ArrowDownRight, Copy, TrendingUp, Percent, LifeBuoy, WandSparkles, Users, EllipsisVertical,
  Gem, Backpack, Baby, SquareCheck, Square, Download, Table, Funnel, ArrowUpDown, ChevronUp, ChevronsUpDown, Pencil, ExternalLink, EyeOff, Eye, Ellipsis, ChevronLeft,
} from 'lucide-react'

const ICONS = {
  Smartphone, CookingPot, Shirt, Sparkles, Dumbbell, Car, Wrench, ToyBrick, PencilRuler, Luggage, PawPrint,
  BatteryCharging, Sun, Fan, Footprints, Watch, Glasses, Gift, ShoppingBag, ReceiptText, MapPin, ShieldCheck,
  RotateCcw, Factory, ScanSearch, Plane, Stamp, Bike, BadgeCheck, Settings, Package, Warehouse, PartyPopper,
  User, ShoppingCart, House, Search, Zap, Flame, Truck, Lock, Heart, Ruler, Flag, Ticket, Bookmark, Hand,
  SearchX, PackageX, Camera, Repeat, ThumbsUp, CircleCheck, Banknote, Tag, SlidersHorizontal, TriangleAlert,
  CreditCard, Landmark, Hash, Wallet, Link, Check, Circle, ArrowLeft, ChevronRight, LayoutDashboard, ScrollText,
  Ship, Menu, Paperclip, History, Coins, Star, X, Bell, Store, Plus, Minus, ArrowRight, TrendingDown, Hourglass, BellRing, Gamepad2, Headphones, Mail, ChevronDown, LayoutGrid, PanelLeft, CalendarDays, ArrowUpRight, ArrowDownRight, Copy, TrendingUp, Percent, LifeBuoy, WandSparkles, Users, EllipsisVertical,
  Gem, Backpack, Baby, SquareCheck, Square, Download, Table, Funnel, ArrowUpDown, ChevronUp, ChevronsUpDown, Pencil, ExternalLink, EyeOff, Eye, Ellipsis, ChevronLeft,
}

export function Icon({ name, size = 18, stroke = 1.9, className = '', fill, ...rest }) {
  const C = ICONS[name]
  if (!C) return null
  return <C size={size} strokeWidth={stroke} className={`icon ${className}`} fill={fill || 'none'} aria-hidden focusable="false" {...rest} />
}
