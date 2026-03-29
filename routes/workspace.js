const express = require('express');
const router = express.Router();
const { protect, requireWorkspaceAccess, requireOwner, requireAdmin, requireEditor } = require('../middleware/auth');
const { getWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, updateMemberRole, removeMember } = require('../controllers/workspaceController');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { uploadFile, listFiles, getFileContent, downloadFile, deleteFile } = require('../controllers/fileController');
const { sendInvite, listInvites, revokeInvite } = require('../controllers/inviteController');
const { upload } = require('../config/upload');

router.use(protect);

// Workspace CRUD
router.get('/', getWorkspaces);
router.post('/', createWorkspace);

// All routes below require workspace membership
router.get('/:id', requireWorkspaceAccess, getWorkspace);
router.put('/:id', requireWorkspaceAccess, requireOwner, updateWorkspace);
router.delete('/:id', requireWorkspaceAccess, requireOwner, deleteWorkspace);

// Member management (admin+)
router.put('/:id/members/:userId/role', requireWorkspaceAccess, requireAdmin, updateMemberRole);
router.delete('/:id/members/:userId', requireWorkspaceAccess, requireAdmin, removeMember);

// Invites (admin+)
router.post('/:id/invite', requireWorkspaceAccess, requireAdmin, sendInvite);
router.get('/:id/invites', requireWorkspaceAccess, requireAdmin, listInvites);
router.delete('/:id/invites/:inviteId', requireWorkspaceAccess, requireAdmin, revokeInvite);

// Tasks (editor+ can create/edit/delete, member can view)
router.get('/:id/tasks', requireWorkspaceAccess, getTasks);
router.post('/:id/tasks', requireWorkspaceAccess, requireEditor, createTask);
router.put('/:id/tasks/:taskId', requireWorkspaceAccess, requireEditor, updateTask);
router.delete('/:id/tasks/:taskId', requireWorkspaceAccess, requireEditor, deleteTask);

// Files (all members can upload & view; only uploader or admin can delete)
router.get('/:id/files', requireWorkspaceAccess, listFiles);
router.post('/:id/files', requireWorkspaceAccess, upload.single('file'), uploadFile);
router.get('/:id/files/:fileId/content', requireWorkspaceAccess, getFileContent);
router.get('/:id/files/:fileId/download', requireWorkspaceAccess, downloadFile);
router.delete('/:id/files/:fileId', requireWorkspaceAccess, deleteFile);

module.exports = router;
