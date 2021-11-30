const router = require('express').Router();
const WishListController = require('@controllers/wishlistController');

router.post('/', WishListController.create);
router.get('/', WishListController.getAll);
router.get('/:id', WishListController.getOne);
router.delete('/:id', WishListController.delete);

module.exports = router;