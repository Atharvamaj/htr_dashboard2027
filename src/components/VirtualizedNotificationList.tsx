import React, { memo, useMemo } from 'react';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  created_at: string;
  is_active: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface VirtualizedNotificationListProps {
  notifications: Notification[];
  containerHeight?: number;
  onNotificationClick?: (notification: Notification) => void;
  showTimestamp?: boolean;
  maxItems?: number;
}

// Memoized notification item component
const NotificationItem = memo<{
  notification: Notification;
  onClick?: (notification: Notification) => void;
  showTimestamp?: boolean;
}>(({ notification, onClick, showTimestamp = true }) => {
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card
      className={`mb-3 cursor-pointer transition-all hover:shadow-md ${getTypeColor(notification.type)}`}
      onClick={() => onClick?.(notification)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 flex-1">
            {getTypeIcon(notification.type)}
            <CardTitle className="text-sm font-medium line-clamp-2">
              {notification.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {getPriorityBadge(notification.priority)}
            {showTimestamp && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {formatTimestamp(notification.created_at)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      {notification.message && (
        <CardContent className="pt-0">
          <CardDescription className="text-sm line-clamp-3">
            {notification.message}
          </CardDescription>
        </CardContent>
      )}
    </Card>
  );
});

NotificationItem.displayName = 'NotificationItem';

const VirtualizedNotificationList = memo<VirtualizedNotificationListProps>(({
  notifications,
  containerHeight = 400,
  onNotificationClick,
  showTimestamp = true,
  maxItems = 1000,
}) => {
  // Limit notifications for performance
  const limitedNotifications = useMemo(() => {
    return notifications.slice(0, maxItems);
  }, [notifications, maxItems]);

  // Sort notifications by priority and timestamp
  const sortedNotifications = useMemo(() => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return [...limitedNotifications].sort((a, b) => {
      // First sort by priority
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by timestamp (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [limitedNotifications]);

  const {
    virtualItems,
    totalHeight,
    scrollElementProps,
    innerElementProps,
  } = useVirtualizedList(sortedNotifications, {
    itemHeight: 100, // Estimated height for each notification
    containerHeight,
    overscan: 5,
  });

  if (sortedNotifications.length === 0) {
    return (
      <Card className="h-32 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Bell className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No notifications</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Notifications ({sortedNotifications.length})
        </h3>
        {notifications.length > maxItems && (
          <Badge variant="secondary" className="text-xs">
            Showing {maxItems} of {notifications.length}
          </Badge>
        )}
      </div>
      
      <div {...scrollElementProps} className="border rounded-lg">
        <div {...innerElementProps}>
          {virtualItems.map(({ index, item, offsetY }) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: offsetY,
                left: 0,
                right: 0,
                padding: '8px',
              }}
            >
              <NotificationItem
                notification={item}
                onClick={onNotificationClick}
                showTimestamp={showTimestamp}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedNotificationList.displayName = 'VirtualizedNotificationList';

export default VirtualizedNotificationList;