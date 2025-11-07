// Test script for notification navigation utility
import { getNotificationNavigationUrl, isNotificationClickable } from "./notificationNavigation";

// Test data representing different types of notifications
const testNotifications = [
    // Contact message notification (for admin)
    {
        id: "1",
        type: "system",
        title: "New Contact Message",
        content: "A new contact message has been received from John Doe.",
        data: {
            contact_message_id: "msg-123",
            sender_name: "John Doe",
            sender_email: "john@example.com",
            subject: "Help with mentoring"
        },
        read: false,
        user_id: "admin-1",
        created_at: new Date().toISOString()
    },

    // Mentor application notification (for admin)
    {
        id: "2",
        type: "system",
        title: "New Mentor Application",
        content: "A new mentor application has been submitted and requires review.",
        data: {
            verification_id: "ver-456",
            user_id: "user-789",
            type: "mentor_application"
        },
        read: false,
        user_id: "admin-1",
        created_at: new Date().toISOString()
    },

    // Mentor approval notification (for user)
    {
        id: "3",
        type: "system",
        title: "Mentor Application Approved!",
        content: "Congratulations! Your mentor application has been approved.",
        data: null,
        read: false,
        user_id: "user-789",
        created_at: new Date().toISOString()
    },

    // Mentor rejection notification (for user)
    {
        id: "4",
        type: "system",
        title: "Mentor Application Update",
        content: "Your mentor application requires attention. Please update your profile.",
        data: null,
        read: false,
        user_id: "user-789",
        created_at: new Date().toISOString()
    },

    // Badge notification
    {
        id: "5",
        type: "badge",
        title: "New Badge Earned!",
        content: 'Congratulations! You have earned the "Top Mentor" badge.',
        data: {
            badge_type_id: "badge-123",
            badge_name: "Top Mentor"
        },
        read: false,
        user_id: "user-456",
        created_at: new Date().toISOString()
    },

    // Message notification (hypothetical future implementation)
    {
        id: "6",
        type: "message",
        title: "New Message",
        content: "You have a new message from Alice.",
        data: {
            conversation_id: "conv-789",
            sender_id: "user-alice"
        },
        read: false,
        user_id: "user-bob",
        created_at: new Date().toISOString()
    },

    // Non-clickable notification
    {
        id: "7",
        type: "system",
        title: "System Maintenance",
        content: "The system will be under maintenance tonight.",
        data: null,
        read: false,
        user_id: "user-123",
        created_at: new Date().toISOString()
    }
];

// Test the navigation logic
console.log("Testing notification navigation logic:\n");

testNotifications.forEach((notification, index) => {
    const url = getNotificationNavigationUrl(notification);
    const clickable = isNotificationClickable(notification);

    console.log(`${index + 1}. ${notification.title}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Clickable: ${clickable}`);
    console.log(`   Navigation URL: ${url || 'None'}`);
    console.log('');
});

export { testNotifications };