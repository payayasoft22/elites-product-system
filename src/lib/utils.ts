// lib/utils.ts
import { supabase, TABLE_NAMES } from './supabase';

interface CreateNotificationParams {
  userId: string;
  type: string;
  content: any;
}

export async function createNotification({ userId, type, content }: CreateNotificationParams) {
  const { data, error } = await supabase
    .from(TABLE_NAMES.NOTIFICATIONS)
    .insert([
      {
        user_id: userId,
        type,
        content,
        is_read: false,
      },
    ]);

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}
