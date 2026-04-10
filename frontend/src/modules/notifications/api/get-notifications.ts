import { apiClient } from "@/services/api/client";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
};

export async function getNotifications(): Promise<NotificationsResponse> {
  return apiClient<NotificationsResponse>("/notifications");
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiClient<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}
