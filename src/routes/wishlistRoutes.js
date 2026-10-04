"use strict"

require('module-alias/register');

const router = require('express').Router();
const WishListController = require('@controllers/wishlistController');

router.get('/:id', WishListController.getOne);
router.put('/:id', WishListController.save);

module.exports = router;
