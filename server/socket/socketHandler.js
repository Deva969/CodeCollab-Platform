import Message from "../model/Message.js";

// Keep track of active users in memory (projectId -> Map(socketId -> userObject))
const activeProjectUsers = new Map();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    // Variable to track which room this socket belongs to
    let currentRoom = null;
    let currentUser = null;

    socket.on("join-project", ({ projectId, user }) => {
      if (!projectId || !user) return;
      
      socket.join(projectId);
      currentRoom = projectId;
      currentUser = user;

      // Register user in the room tracking map
      if (!activeProjectUsers.has(projectId)) {
        activeProjectUsers.set(projectId, new Map());
      }
      activeProjectUsers.get(projectId).set(socket.id, user);

      // Broadcast updated online users list
      const usersList = Array.from(activeProjectUsers.get(projectId).values());
      io.to(projectId).emit("online-users", usersList);
      
      // Notify others that a user has joined
      socket.to(projectId).emit("user-joined", user);
    });

    // Real-time code editing synchronization
    socket.on("code-change", ({ projectId, fileName, content }) => {
      if (!projectId || !fileName) return;
      socket.to(projectId).emit("code-change", { fileName, content });
    });

    // Real-time file creation synchronization
    socket.on("file-create", ({ projectId, fileName, content }) => {
      if (!projectId || !fileName) return;
      socket.to(projectId).emit("file-create", { fileName, content });
    });

    // Real-time active file selection synchronization (shows who is on which file)
    socket.on("file-select", ({ projectId, userName, fileName }) => {
      if (!projectId || !fileName) return;
      socket.to(projectId).emit("file-select", { userName, fileName });
    });

    // Real-time code execution synchronization
    socket.on("run-code", ({ projectId, fileName }) => {
      if (!projectId || !fileName) return;
      socket.to(projectId).emit("run-code", { fileName });
    });

    socket.emit("message", "Hello from backend.");

    socket.on("send-message", async ({ projectId, userName, userId, text }) => {
      const newMessage = await Message.create({
        projectId,
        userName,
        userId,
        text,
      });

      io.to(projectId).emit("recive-message", newMessage);
    });

    // Handle clean disconnects
    socket.on("disconnect", () => {
      if (currentRoom && activeProjectUsers.has(currentRoom)) {
        activeProjectUsers.get(currentRoom).delete(socket.id);
        
        // If room is now empty, clean it up
        if (activeProjectUsers.get(currentRoom).size === 0) {
          activeProjectUsers.delete(currentRoom);
        } else {
          // Broadcast updated online users list to remaining members
          const usersList = Array.from(activeProjectUsers.get(currentRoom).values());
          io.to(currentRoom).emit("online-users", usersList);
          
          if (currentUser) {
            socket.to(currentRoom).emit("user-left", currentUser);
          }
        }
      }
    });
  });
};

export default socketHandler;
