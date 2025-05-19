// components/NotificationsPopover.tsx
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellRing, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const NotificationsPopover = () => {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();

  return (
    <div className="relative">
      <button className="p-2 rounded-full hover:bg-gray-100">
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1">
            {unreadCount}
          </Badge>
        )}
      </button>

      <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-10">
        <div className="p-2 border-b">
          <h3 className="font-medium">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications?.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border-b hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50' : ''}`}
              onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
            >
              <div className="flex justify-between">
                <p className="font-medium">{notification.type}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification.mutate(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <p className="text-sm">{JSON.stringify(notification.content)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(notification.created_at), 'PPpp')}
              </p>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPopover;
