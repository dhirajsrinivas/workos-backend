const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, requireWorkspaceAccess } = require('../middleware/auth');
const { getItems, createItem, updateItem, deleteItem, getCommits, createCommit, restoreCommit } = require('../controllers/repoController');

router.use(protect, requireWorkspaceAccess);

router.get('/items',                        getItems);
router.post('/items',                       createItem);
router.put('/items/:itemId',                updateItem);
router.delete('/items/:itemId',             deleteItem);

router.get('/commits',                      getCommits);
router.post('/commits',                     createCommit);
router.post('/commits/:commitId/restore',   restoreCommit);

module.exports = router;
