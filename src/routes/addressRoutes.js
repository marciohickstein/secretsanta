"use strict"

require('module-alias/register');

const router = require('express').Router();
const AddressController = require('@controllers/addressController');

// Preenchimento automatico do endereco da festa a partir do CEP
router.get('/cep/:cep', AddressController.getCep);

module.exports = router;
