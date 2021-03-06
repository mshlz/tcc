const express = require('express')
const router = express.Router()

const hasPermission = require('../middlewares/has-authorization')

// controller
const controller = require('../controllers/institution.controller')

// validador
const validator = require('../middlewares/validators/institutions')

// css menu
router.all('/*', (req, res, next) => {
    res.locals.mainMenu = 'institutions'
    next()
})

// ROTAS DO RESOURCE

// rota exibe lista de instituições
router.get('/', controller.index)

// rota que exibe form para adicionar nova instituição
router.get('/create', hasPermission('admin'), controller.create)

// rota que salva nova instituição
router.post('/', hasPermission('admin'), validator.onSave, controller.store)

// rota que exibe uma instituição
// router.get('/:id', controller.view)

// rota que exibe form para editar uma instituição
router.get('/edit/:id', hasPermission('admin'), controller.edit)

// rota que atualiza uma instituição
router.post('/edit/:id', hasPermission('admin'), validator.onUpdate, controller.update)

// rota que remove uma instituição
// router.post('/delete', controller.destroy)

// exporta o router
module.exports = router