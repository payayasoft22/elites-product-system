
import React, { useState } from "react";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationsPopover = () => {
  const [open, setOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    isLoading
  } = useNotifications();

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, h:mm a");
    } catch (e) {
      return "Unknown date";
    }
  };

  const renderNotificationContent = (notification: any) => {
    switch (notification.type) {
      case 'price_change':
        return (
          <div>
            <p className="font-medium">Price Update</p>
            <p>
              {notification.content.product_name || notification.content.product_code} price updated to{" "}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(notification.content.new_price)}
            </p>
            <p className="text-xs text-muted-foreground">
              by {notification.content.changed_by || "Unknown"} • {formatDate(notification.created_at)}
            </p>
          </div>
        );
        
      case 'product_added':
        return (
          <div>
            <p className="font-medium">New Product</p>
            <p>
              New product added: {notification.content.product_name || notification.content.product_code}
            </p>
            <p className="text-xs text-muted-foreground">
              by {notification.content.added_by || "Unknown"} • {formatDate(notification.created_at)}
            </p>
          </div>
        );
        
      case 'admin_request':
        return (
          <div>
            <p className="font-medium">Admin Request</p>
            <p>
              {notification.content.requesting_user_name} has requested admin privileges
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(notification.created_at)}
            </p>
          </div>
        );
        
      default:
        return (
          <div>
            <p>{JSON.stringify(notification.content)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(notification.created_at)}
            </p>
          </div>
        );
    }
  };

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <div className="font-semibold">Notifications</div>
          {notifications && notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading notifications...</div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-accent/50 cursor-pointer ${!notification.is_read ? 'bg-accent/20' : ''}`}
                onClick={() => markAsRead.mutate(notification.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    {renderNotificationContent(notification)}
                  </div>
                  {!notification.is_read && (
                    <div 
                      className="flex-shrink-0 h-2 w-2 mt-1 rounded-full bg-primary" 
                      title="Unread notification"
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
