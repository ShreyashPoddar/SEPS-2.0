// controllers/notification.controller.js
import prisma from "../lib/db.js";

// Create a notification
export const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || "info",
      },
    });

    notification._id = notification.id;
    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ success: false, message: "Failed to create notification" });
  }
};

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user._id },
      orderBy: { createdAt: "desc" },
    });
    notifications.forEach((n) => (n._id = n.id));
    res.json({ success: true, notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    try {
      await prisma.notification.delete({ where: { id: notificationId } });
    } catch (e) {
      if (e.code === "P2025") {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      throw e;
    }
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};
