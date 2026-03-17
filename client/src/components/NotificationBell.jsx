import { useState } from "react";
import { Bell, Check, CheckCheck, Package, MessageSquare, Star, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/stores/NotificationStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const typeIcons = {
  order: Package,
  bargain: MessageSquare,
  rating: Star,
  system: Info,
};

const typeColors = {
  order: "text-primary",
  bargain: "text-secondary",
  rating: "text-warning",
  system: "text-muted-foreground",
};

const NotificationBell = () => {
  const { userId } = useAuth();
  const { getUserNotifications, getUnreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const notifications = getUserNotifications(userId);
  const unread = getUnreadCount(userId);
  const now= Date.now();

  const formatTime = (iso) => {
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-foreground">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => markAllRead(userId)}>
              <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            notifications.map(n => {
              const Icon = typeIcons[n.type];
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className={`mt-0.5 shrink-0 ${typeColors[n.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
