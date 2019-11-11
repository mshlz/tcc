const User = require('../../../models/user.model')
const Enrollment = require('../../../models/enrollment.model')

const { body, validationResult } = require('express-validator')

/**
 * Validador ao salvar inscrição
 */
exports.onSave = [
[
    body('email').isEmail()
                 .withMessage('Email inválido')
                 .normalizeEmail(),

    body('name').isString()
                .isLength({ min: 5, max: 50 })
                .withMessage('Nome inválido, deve ter entre 5 e 50 caracteres'),

    body('cpf').isNumeric()
               .isLength({ min: 11, max: 11 })
               .withMessage('CPF inválido, deve ter 11 digitos numéricos')
               .custom((cpf, { req }) => {
                    // verifica se já está inscrito no evento
                    return User.findOne({ cpf }).then(user => {
                        if (user) {
                            return Enrollment.findOne({ user, event: req.params.id }).countDocuments().then(count => {
                                if (count != 0) {
                                    return Promise.reject('CPF já está inscrito no evento')
                                }
                            })
                        }
                    })
                }),

    body('birthdate').not().isEmpty()
                     .withMessage('Data de nascimento não pode estar em branco'),

    body('institution').not().isEmpty()
                       .withMessage('Instituição não pode estar em branco!')
],
async (req, res, next) => {
    // check if has errors in the validation
    let errors = validationResult(req).errors
    
    if (errors.length != 0) {
        let form = { name, email, cpf, birthdate, institution } = req.body

        return res.status(422)
                .render('events/event/enrolleds/add', {
                    title: 'Nova Inscrição',
                    form,
                    errors: errors.map(e=>e.msg),
                })
    }

    next()
}]