import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellRing, Trash2 } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NotificationsPopover = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  // Format the notification content based on type
  const formatContent = (notification: any) => {
    if (!notification) return null;

    const content = notification.content;
    
    switch (notification.type) {
      case 'price_change':
        return (
          <div>
            <p className="font-medium">
              Price updated for {content.product_name}
            </p>
            <p className="text-muted-foreground text-sm">
              New price: ${content.new_price}
            </p>
            <p className="text-xs text-gray-400">
              Changed by {content.changed_by || 'a user'} • {formatDistance(new Date(content.changed_at || notification.created_at), new Date(), { addSuffix: true })}
            </p>
          </div>
        );
      case 'product_added':
        return (
          <div>
            <p className="font-medium">
              New product added: {content.product_name}
            </p>
            <p className="text-muted-foreground text-sm">
              Product code: {content.product_code}
            </p>
            <p className="text-xs text-gray-400">
              Added by {content.added_by || 'a user'} • {formatDistance(new Date(content.added_at || notification.created_at), new Date(), { addSuffix: true })}
            </p>
          </div>
        );
      case 'product_deleted':
        return (
          <div>
            <p className="font-medium">
              Product deleted: {content.product_name}
            </p>
            <p className="text-xs text-gray-400">
              Deleted by {content.deleted_by || 'a user'} • {formatDistance(new Date(content.deleted_at || notification.created_at), new Date(), { addSuffix: true })}
            </p>
          </div>
        );
      case 'product_updated':
        return (
          <div>
            <p className="font-medium">
              Product updated: {content.product_name}
            </p>
            <p className="text-muted-foreground text-sm">
              {content.fields_updated ? `Fields updated: ${content.fields_updated}` : 'Details were modified'}
            </p>
            <p className="text-xs text-gray-400">
              Updated by {content.updated_by || 'a user'} • {formatDistance(new Date(content.updated_at || notification.created_at), new Date(), { addSuffix: true })}
            </p>
          </div>
        );
      case 'admin_request':
        return (
          <div>
            <p className="font-medium">
              New admin request
            </p>
            <p className="text-sm">
              {content.requesting_user_name} has requested admin privileges
            </p>
          </div>
        );
      default:
        return (
          <div>
            <p className="font-medium">Notification</p>
            <p className="text-sm">{JSON.stringify(content)}</p>
          </div>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 h-5 min-w-[20px] flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between border-b p-3">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {unreadCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsRead.isPending}
                      className="text-xs"
                    >
                      Mark all as read
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mark all notifications as read</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <TabsContent value="all" className="p-0">
            <ScrollArea className="h-[300px]">
              {!notifications || notifications.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] p-4 text-center">
                  <div>
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b last:border-b-0 p-4 relative hover:bg-muted/30 transition-colors ${!notification.is_read ? "bg-primary/5" : ""}`}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    {formatContent(notification)}
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        {notification.created_at && format(new Date(notification.created_at), "MMM d, h:mm a")}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {!notification.is_read && (
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="p-0">
            <ScrollArea className="h-[300px]">
              {!notifications || notifications.filter((n) => !n.is_read).length === 0 ? (
                <div className="flex items-center justify-center h-[300px] p-4 text-center">
                  <div>
                    <p className="text-muted-foreground">No unread notifications</p>
                  </div>
                </div>
              ) : (
                notifications
                  .filter((n) => !n.is_read)
                  .map((notification) => (
                    <div
                      key={notification.id}
                      className="border-b last:border-b-0 p-4 bg-primary/5 relative hover:bg-muted/30 transition-colors"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      {formatContent(notification)}
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">
                          {notification.created_at && format(new Date(notification.created_at), "MMM d, h:mm a")}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                    </div>
                  ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
