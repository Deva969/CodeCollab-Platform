import { Router } from "express";
import Project from "../model/Project.js";
import Message from "../model/Message.js";
import User from "../model/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.get("/analytics", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.userId;

    // 1. PROJECT STATISTICS (AGGREGATES)
    const totalProjects = await Project.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    // Aggregated count of files across all projects
    const filesAgg = await Project.aggregate([
      { $project: { numberOfFiles: { $size: { $ifNull: ["$files", []] } } } },
      { $group: { _id: null, total: { $sum: "$numberOfFiles" } } }
    ]);
    const totalFiles = filesAgg[0]?.total || 0;

    // Count unique collaborators
    const projects = await Project.find({});
    const collabSet = new Set();
    projects.forEach(p => {
      if (p.userId) collabSet.add(p.userId);
      if (p.members) {
        p.members.forEach(m => collabSet.add(m));
      }
    });
    const totalCollaborators = collabSet.size;
    const activeUsers = await User.countDocuments();

    // 2. USER STATISTICS (CURRENT USER SPECIFIC)
    const userProjectsCreated = await Project.countDocuments({ userId: currentUserId });
    const userProjectsJoined = await Project.countDocuments({ members: currentUserId });
    const userMessagesSent = await Message.countDocuments({ userId: currentUserId });

    const userProjects = await Project.find({ userId: currentUserId });
    let userFilesCreated = 0;
    userProjects.forEach(p => {
      userFilesCreated += p.files ? p.files.length : 0;
    });

    // 3. CHARTS DATA (LAST 7 DAYS TRENDS)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Messages per Day
    const recentMessages = await Message.find({
      // Match messages sent in the last 7 days
      _id: { $gte: mongooseToObjectId(sevenDaysAgo) }
    });

    const messageCounts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      messageCounts[dateStr] = 0;
    }

    recentMessages.forEach(msg => {
      const msgDate = msg._id.getTimestamp();
      const dateStr = msgDate.toISOString().split("T")[0];
      if (messageCounts[dateStr] !== undefined) {
        messageCounts[dateStr]++;
      }
    });

    const messagesPerDay = Object.keys(messageCounts).map(date => ({
      date,
      count: messageCounts[date]
    }));

    // Project Creations per Day
    const projectCounts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      projectCounts[dateStr] = 0;
    }

    projects.forEach(p => {
      const projDate = p._id.getTimestamp();
      if (projDate >= sevenDaysAgo) {
        const dateStr = projDate.toISOString().split("T")[0];
        if (projectCounts[dateStr] !== undefined) {
          projectCounts[dateStr]++;
        }
      }
    });

    const projectsPerDay = Object.keys(projectCounts).map(date => ({
      date,
      count: projectCounts[date]
    }));

    // Most Active Users (Top 5 by message volume)
    const activeUsersData = await Message.aggregate([
      { $group: { _id: "$userName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const mostActiveUsers = activeUsersData.map(u => ({
      name: u._id || "Unknown User",
      count: u.count
    }));

    res.status(200).json({
      projectStats: {
        totalProjects,
        totalFiles,
        totalMessages,
        totalCollaborators,
        activeUsers
      },
      userStats: {
        projectsCreated: userProjectsCreated,
        projectsJoined: userProjectsJoined,
        messagesSent: userMessagesSent,
        filesCreated: userFilesCreated
      },
      charts: {
        messagesPerDay,
        projectsPerDay,
        mostActiveUsers
      }
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    res.status(500).json({ message: "Failed to compile analytics details." });
  }
});

// Helper function to convert a date to MongoDB ObjectId
function mongooseToObjectId(date) {
  const timestamp = Math.floor(date.getTime() / 1000).toString(16);
  return timestamp + "0000000000000000";
}

export default router;
