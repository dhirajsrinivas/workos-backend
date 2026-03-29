const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getInviteInfo, acceptInvite } = require('../controllers/inviteController');

router.get('/:token', getInviteInfo);
router.post('/:token/accept', protect, acceptInvite);

module.exports = router;
