"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAffiliateContext } from "@/modules/affiliate-shell";
import {
  getNotifications,
  markAllNotificationsRead,
  type NotificationsResponse,
} from "../api/get-notifications";

/**
 * Reads the notification feed for the current recipient.
 *
 * The backend reads the user's role and affiliateId from the JWT to determine
 * which inbox to serve — affiliate's own inbox or tenant-wide ("*") for admins.
 */
export function useNotifications(recipient: "affiliate" | "tenant") {
  const { affiliateId: ctxAffiliateId } = useAffiliateContext();
  const enabled = recipient === "tenant" || !!ctxAffiliateId;

  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", recipient, ctxAffiliateId ?? "tenant"],
    queryFn: () => getNotifications(),
    enabled,
    refetchInterval: 5000,
  });
}

export function useMarkAllNotificationsRead(recipient: "affiliate" | "tenant") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", recipient] });
    },
  });
}
