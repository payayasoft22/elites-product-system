
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, History, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActionLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  changes: any;
  performed_by: string;
  performed_at: string;
  user_email?: string;
  user_name?: string;
  can_revert: boolean;
}

const AdminActionLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<ActionLog | null>(null);
  const [confirmRevertOpen, setConfirmRevertOpen] = useState(false);

  // Fetch action logs
  const { data: actionLogs, isLoading } = useQuery({
    queryKey: ['admin', 'action_logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            content,
            created_at,
            user_id,
            profiles:user_id (
              email,
              first_name,
              name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Transform notifications into action logs
        return (data || []).map((item): ActionLog => {
          const content = item.content || {};
          const actionType = item.type || 'unknown';
          
          // Safely get values from content
          const contentObj = typeof content === 'object' && !Array.isArray(content) ? content : {};
          const entityId = (contentObj as Record<string, any>).product_code || 
                          (contentObj as Record<string, any>).id || '';
          
          // Determine if the action is revertible
          const canRevert = [
            'product_added',
            'product_updated',
            'price_change',
            'permission_change'
          ].includes(actionType);
          
          // Safely get user information
          const profile = item.profiles || {};
          const userEmail = typeof profile === 'object' && profile !== null && 'email' in profile ? profile.email as string || 'Unknown' : 'Unknown';
          const userFirstName = typeof profile === 'object' && profile !== null && 'first_name' in profile ? profile.first_name as string || '' : '';
          const userName = typeof profile === 'object' && profile !== null && 'name' in profile ? profile.name as string || '' : '';
          const displayName = userFirstName || userName || 'Unknown User';
          
          return {
            id: item.id,
            action_type: actionType,
            entity_type: getEntityTypeFromAction(actionType),
            entity_id: entityId,
            changes: content,
            performed_by: userEmail,
            performed_at: item.created_at,
            user_email: userEmail,
            user_name: displayName,
            can_revert: canRevert
          };
        });
      } catch (error) {
        console.error('Error fetching action logs:', error);
        throw error;
      }
    },
    enabled: !!user
  });

  // Mutation to revert an action
  const revertAction = useMutation({
    mutationFn: async (action: ActionLog) => {
      if (!action.can_revert) {
        throw new Error('This action cannot be reverted');
      }
      
      switch (action.action_type) {
        case 'product_added':
          // Delete the product
          if (action.changes && typeof action.changes === 'object' && 'product_code' in action.changes) {
            await supabase
              .from('product')
              .delete()
              .eq('prodcode', action.changes.product_code);
          }
          break;
          
        case 'product_updated':
          // Revert to previous values
          if (action.changes && 
              typeof action.changes === 'object' && 
              'previous_values' in action.changes && 
              'product_code' in action.changes) {
            await supabase
              .from('product')
              .update(action.changes.previous_values)
              .eq('prodcode', action.changes.product_code);
          }
          break;
          
        case 'price_change':
          // Remove the latest price and revert to previous
          if (action.changes && 
              typeof action.changes === 'object' && 
              'previous_price' in action.changes && 
              'product_code' in action.changes) {
            // Delete the latest price entry
            await supabase
              .from('pricehist')
              .delete()
              .eq('prodcode', action.changes.product_code)
              .order('effdate', { ascending: false })
              .limit(1);
              
            // Add back the previous price if it exists
            if (typeof action.changes.previous_price === 'number') {
              await supabase
                .from('pricehist')
                .insert({
                  prodcode: action.changes.product_code,
                  unitprice: action.changes.previous_price,
                  effdate: new Date().toISOString()
                });
            }
          }
          break;
          
        case 'permission_change':
          // Revert permission change
          if (action.changes && 
              typeof action.changes === 'object' && 
              'previous_allowed' in action.changes &&
              'action' in action.changes &&
              'role' in action.changes) {
            await supabase
              .from('role_permissions')
              .update({
                allowed: action.changes.previous_allowed
              })
              .eq('action', action.changes.action)
              .eq('role', action.changes.role);
          }
          break;
          
        default:
          throw new Error(`Cannot revert action of type: ${action.action_type}`);
      }
      
      // Log this reversion as another action
      await supabase.from('notifications').insert({
        type: 'action_reverted',
        content: {
          reverted_action: action.action_type,
          reverted_id: action.id,
          original_changes: action.changes,
          reverted_by: user?.email,
          reverted_at: new Date().toISOString()
        },
        user_id: user?.id
      });
      
      return action.id;
    },
    onSuccess: () => {
      setConfirmRevertOpen(false);
      setSelectedAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'action_logs'] });
      toast({
        title: 'Action reverted',
        description: 'The selected action has been successfully reverted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to revert action',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleRevertClick = (action: ActionLog) => {
    setSelectedAction(action);
    setConfirmRevertOpen(true);
  };

  const confirmRevert = () => {
    if (selectedAction) {
      revertAction.mutate(selectedAction);
    }
  };

  const getEntityTypeFromAction = (actionType: string): string => {
    if (actionType.includes('product')) return 'Product';
    if (actionType.includes('price')) return 'Price';
    if (actionType.includes('permission')) return 'Permission';
    if (actionType.includes('user')) return 'User';
    return 'System';
  };

  const getActionDescription = (action: ActionLog): string => {
    const changes = action.changes || {};
    
    if (typeof changes !== 'object') {
      return `${action.action_type.replace(/_/g, ' ')}`;
    }
    
    switch (action.action_type) {
      case 'product_added':
        return `Added product ${(changes as Record<string, any>).product_name || (changes as Record<string, any>).product_code || 'unknown'}`;
      case 'product_updated':
        return `Updated product ${(changes as Record<string, any>).product_name || (changes as Record<string, any>).product_code || 'unknown'}`;
      case 'price_change':
        return `Changed price of ${(changes as Record<string, any>).product_name || (changes as Record<string, any>).product_code || 'unknown'} to ${(changes as Record<string, any>).new_price || 'unknown price'}`;
      case 'permission_change':
        return `Changed permission "${(changes as Record<string, any>).action}" for role "${(changes as Record<string, any>).role}" to ${(changes as Record<string, any>).allowed ? 'allowed' : 'denied'}`;
      case 'permission_request':
        return `Requested permission: ${(changes as Record<string, any>).action}`;
      case 'permission_request_resolved':
        return `${(changes as Record<string, any>).status === 'approved' ? 'Approved' : 'Rejected'} permission request: ${(changes as Record<string, any>).action}`;
      case 'action_reverted':
        return `Reverted action: ${(changes as Record<string, any>).reverted_action}`;
      default:
        return `${action.action_type.replace(/_/g, ' ')}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
    } catch (e) {
      return dateString;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Action Log
          </CardTitle>
          <CardDescription>
            View and manage recent actions performed by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading action history...</p>
            </div>
          ) : actionLogs && actionLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{getActionDescription(log)}</TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>{log.user_name || log.user_email}</TableCell>
                      <TableCell>{formatDate(log.performed_at)}</TableCell>
                      <TableCell className="text-right">
                        {log.can_revert && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRevertClick(log)}
                            disabled={revertAction.isPending}
                          >
                            <Undo2 className="mr-1 h-4 w-4" />
                            Revert
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No action logs found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmRevertOpen} onOpenChange={setConfirmRevertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Confirm Reversion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revert this action? This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAction && (
            <div className="py-4">
              <p><strong>Action:</strong> {getActionDescription(selectedAction)}</p>
              <p><strong>Performed by:</strong> {selectedAction.user_name || selectedAction.user_email}</p>
              <p><strong>Date:</strong> {formatDate(selectedAction.performed_at)}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRevertOpen(false)}
              disabled={revertAction.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevert}
              disabled={revertAction.isPending}
            >
              {revertAction.isPending ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  <span>Reverting...</span>
                </div>
              ) : (
                'Revert Action'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminActionLog;
