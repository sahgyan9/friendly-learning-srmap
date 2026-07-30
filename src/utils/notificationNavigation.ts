import { Notification } from "@/integrations/supabase/services/notifications";

/**
 * Gets the navigation URL for a notification based on its type and data
 * @param notification The notification object
 * @returns The URL to navigate to, or null if not navigable
 */
export const getNotificationNavigationUrl = (notification: Notification): string | null => {
    const baseUrl = window.location.origin;
    // Handle contact message notifications
    if (
        notification.type === 'system' &&
        notification.data &&
        typeof notification.data === 'object' &&
        'contact_message_id' in notification.data
    ) {
        // Admin contact message notifications redirect to admin contact messages page
        return `${baseUrl}/admin/contact-messages`;
    }

    // Handle mentor application notifications
    if (
        notification.type === 'system' &&
        notification.data &&
        typeof notification.data === 'object' &&
        'verification_id' in notification.data
    ) {
        // Mentor application notifications redirect to mentor verification page
        // This is for admin notifications about new mentor applications
        return `${baseUrl}/admin/mentor-verification`;
    }

    // Handle mentor approval/rejection notifications for users
    if (
        notification.type === 'system' &&
        (notification.title?.includes('Mentor Application') ||
            notification.content?.includes('mentor application'))
    ) {
        // For users receiving notifications about their mentor application status
        if (notification.content?.includes('approved')) {
            // If approved, redirect to their profile
            return `${baseUrl}/profile`;
        } else if (notification.content?.includes('rejected') || notification.content?.includes('attention')) {
            // If rejected, redirect to edit application
            return `${baseUrl}/become-mentor?edit=true`;
        } else {
            // For pending or other status, redirect to application status page
            return `${baseUrl}/become-mentor`;
        }
    }

    // Handle mentor-specific notifications with user_id in data
    if (
        notification.type === 'mentor_application' &&
        notification.data &&
        typeof notification.data === 'object' &&
        'user_id' in notification.data
    ) {
        const userId = notification.data.user_id;
        // Redirect to the specific mentor's profile
        return `${baseUrl}/mentors/${userId}`;
    }

    // Handle message notifications 
    if (notification.type === 'message') {
        // If the notification has conversation data, navigate to specific conversation
        if (
            notification.data &&
            typeof notification.data === 'object' &&
            'conversation_id' in notification.data
        ) {
            return `${baseUrl}/messages?chat=${notification.data.conversation_id}`;
        }
        // Otherwise, navigate to general messages page
        return `${baseUrl}/messages`;
    }

    // Handle badge/achievement notifications
    if (notification.type === 'badge') {
        return `${baseUrl}/profile`; // Redirect to profile to see badges
    }

    // Handle the graduation prompt. Goes to the profile, where
    // AlumniPromptBanner renders the same question with the confirm form behind
    // it — so the bell and the page ask once, not twice.
    if (notification.type === 'alumni_prompt') {
        return `${baseUrl}/profile`;
    }

    // Default: no navigation for unrecognized notification types
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