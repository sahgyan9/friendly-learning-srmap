import { Notification } from "@/integrations/supabase/services/notifications";

/**
 * Gets the navigation URL for a notification based on its type and data
 * @param notification The notification object
 * @returns The URL to navigate to, or null if not navigable
 */
export const getNotificationNavigationUrl = (notification: Notification): string | null => {
    const baseUrl = window.location.origin;
    const data = (notification.data && typeof notification.data === 'object') ? (notification.data as Record<string, any>) : {};

    // Handle attendance alert notifications
    if (notification.type === 'attendance_alert' || notification.title?.includes('Attendance') || data.type === 'attendance_alert') {
        return `${baseUrl}/attendance`;
    }

    // Direct URL in data payload
    if (data.url && typeof data.url === 'string') {
        return data.url.startsWith('http') ? data.url : `${baseUrl}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
    }

    // Handle contact message notifications
    if (
        notification.type === 'system' &&
        'contact_message_id' in data
    ) {
        return `${baseUrl}/admin/contact-messages`;
    }

    // Community join request notifications (e.g. "Someone wants to join your group")
    if (
        notification.title?.includes("wants to join your group") ||
        notification.content?.includes("asked to join") ||
        data.type === "community_join_request"
    ) {
        if (data.community_slug) {
            return `${baseUrl}/workspace-groups/${data.community_slug}?tab=requests`;
        }
        return `${baseUrl}/workspace-groups`;
    }

    // Community invites or decision notifications (e.g. "You are in 🎉" or "Request not accepted" or "invited to join")
    if (
        notification.title?.includes("invited to a group") ||
        notification.title?.includes("You are in") ||
        notification.title?.includes("Request not accepted") ||
        notification.content?.includes("invited to join") ||
        notification.content?.includes("request to join")
    ) {
        if (data.community_slug) {
            return `${baseUrl}/workspace-groups/${data.community_slug}`;
        }
        return `${baseUrl}/workspace-groups`;
    }

    // Direct post reference
    if (data.post_id) {
        return `${baseUrl}/posts/${data.post_id}`;
    }

    // Direct community reference
    if (data.community_slug) {
        return `${baseUrl}/workspace-groups/${data.community_slug}`;
    }

    // The "you're a mentor" notification sent on a first successful signup.
    if (
        notification.type === 'system' &&
        'mentor_welcome' in data
    ) {
        return `${baseUrl}/certificate`;
    }

    // Handle mentor application notifications
    if (
        notification.type === 'system' &&
        'verification_id' in data
    ) {
        return `${baseUrl}/admin/mentor-verification`;
    }

    // Handle mentor approval/rejection notifications for users
    if (
        notification.type === 'system' &&
        (notification.title?.includes('Mentor Application') ||
            notification.content?.includes('mentor application'))
    ) {
        if (notification.content?.includes('approved')) {
            return `${baseUrl}/profile`;
        } else if (notification.content?.includes('rejected') || notification.content?.includes('attention')) {
            return `${baseUrl}/become-mentor?edit=true`;
        } else {
            return `${baseUrl}/become-mentor`;
        }
    }

    // Handle mentor-specific notifications with user_id in data
    if (
        notification.type === 'mentor_application' &&
        'user_id' in data
    ) {
        const userId = data.user_id;
        return `${baseUrl}/mentors/${userId}`;
    }

    // Handle message notifications 
    if (notification.type === 'message') {
        if ('conversation_id' in data) {
            return `${baseUrl}/messages/${data.conversation_id}`;
        }
        return `${baseUrl}/messages`;
    }

    // Handle badge/achievement notifications
    if (notification.type === 'badge') {
        return `${baseUrl}/profile`;
    }

    // Handle the graduation prompt
    if (notification.type === 'alumni_prompt') {
        return `${baseUrl}/profile`;
    }

    // Handle attendance alert notifications
    if (notification.type === 'attendance_alert' || notification.title?.includes('Attendance')) {
        return `${baseUrl}/attendance`;
    }

    return null;
};

/**
 * Checks if a notification is clickable (has a navigation URL)
 * @param notification The notification object
 * @returns true if the notification is clickable
 */
export const isNotificationClickable = (notification: Notification): boolean => {
    return getNotificationNavigationUrl(notification) !== null;
};