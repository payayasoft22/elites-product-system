
import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

const NotificationsPopover = () => {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
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
              Changed by {content.changed_by}
            </p>
          </div>
        );
      case 'product_added':
        return (
          <div>
            <p className="font-medium">
              New product added: {content.product_name}
            </p>
            <p className="text-xs text-gray-400">
              Added by {content.added_by}
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
            <p>{JSON.stringify(content)}</p>
          </div>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 h-5 min-w-5 flex items-center justify-center">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>

          <TabsContent value="all" className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications?.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-center">
                  <div>
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                </div>
              ) : (
                notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b last:border-b-0 p-4 ${
                      !notification.is_read ? "bg-primary-50" : ""
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    {formatContent(notification)}
                    <p className="text-xs text-muted-foreground mt-2">
                      {notification.created_at &&
                        format(new Date(notification.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications?.filter((n) => !n.is_read).length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-center">
                  <div>
                    <p className="text-muted-foreground">No unread notifications</p>
                  </div>
                </div>
              ) : (
                notifications
                  ?.filter((n) => !n.is_read)
                  .map((notification) => (
                    <div
                      key={notification.id}
                      className="border-b last:border-b-0 p-4 bg-primary-50"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      {formatContent(notification)}
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.created_at &&
                          format(new Date(notification.created_at), "MMM d, h:mm a")}
                      </p>
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
