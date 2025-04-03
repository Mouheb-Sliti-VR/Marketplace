const express = require('express');
const router = express.Router();
const {createOffer,getOffers,deleteOffer} = require('../Controllers/offerController');

router.post('/createOffer', createOffer);
router.get('/getOffers', getOffers);
router.post('/deleteOffer/:id', deleteOffer);

module.exports = router;